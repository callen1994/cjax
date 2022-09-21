import cloneDeep from "lodash.clonedeep";
import deepEqual from "deep-equal";
// From a typing perspective the Service is an emitter with more features, but from an implementation perspective
// the emitter is literally a Service with it's update function chopped off.
//
// I want each node in my state management tree to basically work the same way (holds a state and emits to it's listeners)
// I have a child lock where I need it, to prevent drunken chaos, but other than that, it's just a bunch of these stateful emitters listening to each other and emitting when necessary
function asEmitter(serv) {
    return {
        listen: serv.listen,
        pipe: serv.pipe,
        current: serv.current,
        complete: serv.complete,
    };
}
// Written as a closure, because I think that's sexier than a lame class (the "this" keyword is stupid and I hate it);
// The cleanup function is called whenever the list of subscribers goes to 0.
// The main use case for this is so that the pipe function can clean itself up. Without this the internal subscription on the pipe has no end condition
export function CJAXService(init, opts) {
    // It turns out, when you have multiple pipes being built based on shared state stuff you end up with some messy in-between states where you'll subscribe to a cleaned up service only to immediately re-subscribed
    // Basically this doesn't work quite as smoothly as I wanted it to.
    let state = init;
    const listeners = new Set();
    const current = () => state;
    // Skip Current is for when I want the RxJs observer functionality of only responding to future events and ignoring the current state
    function listen(onEmit, skipCurrent = false) {
        listeners.add(onEmit);
        if (state !== undefined && !skipCurrent)
            onEmit(state); // I think I really like this behavior, I kinda always want it to do the replay subject initial emit thing, but I don't want that when the value is undefined. This is great!
        // returning the unsubscribe function plays nice with useEffect
        return () => {
            const beforeDelete = listeners.size; // Had weird, inconsistent issues with stuff getting double-cleaned up. Only cleaning up if there were listeners before this deletion solved the problem
            listeners.delete(onEmit);
            if (beforeDelete && listeners.size === 0) {
                complete(zeroListenersReason); // clean up when I run out of listeners - in particular, if a piped service looses its listeners, that pipe should stop listening to its parents. This is how I ensure that if a set of pipes are chained together, the last pipe in that chain completing will cause all the parents in that chain to complete
            }
        };
    }
    function pipe(modifier, keepAlive = false, pipeTest) {
        const internalTestVal = pipeTest || opts?.test;
        // Pipes should, by default, clean themselves up, this is particularly important if I chained pipes together. Having every emitter clean itself up when all it's listeners are gone is a good way to avoid memory leak issues.
        // One place where this leads to unexpected behavior is if the pipe was defined globally. In this case, I should set "keep alive" to true
        const init = state === undefined ? undefined : modifier(state); // was using && default before and lead ot a bug. Explicitly, if the state of the source is undefined, the state of the pipe is undefined, otherwise the state of the pipe should be determined using the modifier
        let pipeCleanup;
        // A piped service like this will always clean itself up. If I want to create a pipe that doesn't do this I can just
        // create that service manually and then manage the unsubscription on my own.
        const piped = CJAXService(init, {
            test: internalTestVal,
            extraCleanupFun: () => pipeCleanup?.(),
            keepAlive,
        }); // There really shouldn't be a case where this cleanup function is called before the first listen function is finished. because the cleanup is only called after the subscribers to this piped service drop off
        // This service calls its own listen function to connect the pipe
        const unsubscribe = listen((e) => {
            const modified = modifier(e);
            if (modified === undefined)
                return; // the pipe can also function as a filter if the modifier has a return undefined case
            piped.update(modified);
        }, true); // skipping current because I already handle the current state setting up the init above
        pipeCleanup = () => {
            if (internalTestVal)
                console.log(`${internalTestVal} is calling its cleanup function`);
            unsubscribe();
        };
        return asEmitter(piped);
    }
    // the function will basically have the ability to mutate my state, but that's the whole point
    // the only way to mutate the state is in here and this will then emit, and that emission will tell everyone else what's up
    function update(newVal) {
        if (typeof newVal === "function" && state === undefined) {
            console.warn(`Warning, you're trying to update the state of this service with a function, but the current state is undefined!!`);
            console.warn(state);
        }
        const updated = typeof newVal === "function" ? newVal(state) : newVal;
        state = updated;
        listeners.forEach((l) => l(updated));
    }
    function complete(reason) {
        if (opts?.keepAlive) {
            if (opts?.test)
                console.log('This service is designated as "keepAlive" so the behavior on the complete function will not be executed');
            return;
        }
        listeners.clear();
        if (opts?.test)
            console.log("%cTest Serv is calling cleanup because complete was called", "color: pink");
        opts?.extraCleanupFun?.(); // services generated by the .pipe() function need to clean themselves up, this is the more important behavior of the complete() function... I think
    }
    return { listen, update, pipe, current, complete };
}
export function cjaxProm(serv) {
    return new Promise((res) => {
        const val = serv.current();
        if (val !== undefined)
            return res(val);
        const unsub = serv.listen((e) => {
            res(e);
            unsub(); // This system doesn't work if the listen event is triggered immediately, but the if statement above should avoid that case
        });
    });
}
export function cjaxJoin(...emitters) {
    let innerSubs = [];
    // I like the idea that the join doesn't emit until all source emitters are present a lot more than emitting for when some aren't present
    if (!emitters.every((e) => !!e))
        return undefined;
    const joined = CJAXService(emitters.map((e) => undefined), {
        extraCleanupFun: () => innerSubs.forEach((unsub) => unsub?.()),
    });
    innerSubs = emitters.map((source, i) => source?.listen((e) => {
        joined.update((prev) => {
            prev[i] = e;
            return prev;
        });
    }));
    return asEmitter(joined);
}
export function deepDistinctPipe() {
    let cachedState;
    return (newState) => {
        if (!deepEqual(newState, cachedState)) {
            cachedState = cloneDeep(newState);
            return cachedState;
        }
        else
            return undefined; // The idea with this pipe is that when the new state is deepEqual to the old state, I return undefined, which (with how I've written pipes) will prevent an event from getting processed through
    };
}
// Takes an initial value and returns a function for processing the new state
export function deepDistinctCallback(init) {
    let cachedState = init;
    return (newState) => {
        // The returned function checks whether the new state is meaningfully different from the old state (!deepEqual)
        // If they are different it re-assigns cachedState to a copy of newState. This will be !== from the old state (ensuring a react re-render)
        if (!deepEqual(newState, cachedState))
            cachedState = cloneDeep(newState);
        // If the re-assignment above did't happen, then the cachedState will be returned. If this is being used to parse the output of a service, then the cachedState will be === equal to the last event (ensuring react doesn't do a re-render)
        return cachedState;
    };
}
const zeroListenersReason = "the number of listeners to this service dropped to 0";

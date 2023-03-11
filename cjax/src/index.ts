import { CjaxDistincterFig, CJAX_DEFAULT_DISTINCT_FIG } from "@cjax/cjax-distinction";
export { SET_CJAX_DISTINCTION_FIG, CjaxDistincterFig } from "@cjax/cjax-distinction";

// * If this is null, nothing should happen here
var SLOW_POKE_HUNTER: {
  timeThreshold: number;
  alertInterval: number;
  issues: { closureStack: Error; stack: Error; elapsedTime: number; repeatedArg: boolean }[];
} | null = null;

function catchSlowPoke<T>(elapsedTime: number, e: T, prevArg: T, closureStack: Error) {
  if (!SLOW_POKE_HUNTER) return;
  const isSlow = elapsedTime > SLOW_POKE_HUNTER.timeThreshold;
  if (isSlow) {
    SLOW_POKE_HUNTER.issues.push({
      closureStack,
      stack: new Error(),
      elapsedTime,
      repeatedArg: CJAX_DEFAULT_DISTINCT_FIG?.comparator(e, prevArg) || false,
    });
    const intervalCheck = SLOW_POKE_HUNTER.alertInterval;
    if (SLOW_POKE_HUNTER.issues.length === intervalCheck) console.warn(`Found ${intervalCheck} slow pipe events`);
    else if (SLOW_POKE_HUNTER.issues.length % intervalCheck === 0)
      console.warn(`Found ${intervalCheck} more slow pipe events`);
  }
}

export function initiateSlowPokeHunter(timeThreshold: number, alertInterval: number = 5) {
  SLOW_POKE_HUNTER = { timeThreshold, alertInterval, issues: [] };
}

export function slowPokeReport() {
  return SLOW_POKE_HUNTER;
}

// Rather than importing all of Rxjs, I'm going to implement the essential pieces of it as a state management system
// at least, that's what's going on conceptually. I think concretely there will be some differences between what my stuff does
// and how rxjs is built, but I know what I want and I don't want to work around the mysteries/and finnicky bits of rxjs unless I'm really using
// the whole library of operators

// Piped Services, and Combined services are Emitters. I don't want to expose the update function because that would be really confusing and a dumb thing to have access to on an intermediary state processor
// This is essentially a child lock, to get me using the emitter correctly.
export interface Emitter<T> {
  listen: (listener: (x: T) => any, skipCurrent?: boolean | "SKIP CURRENT") => () => void; // take a listener, returns the unsubscribe function
  pipe: <O>(modifier: (x: T) => O, keepAlive?: boolean, test?: string) => Emitter<O | undefined>; // takes a modifier that operates on my T type and returns a new emitter with a different output type
  current: () => T;
  complete: (reason: string) => void; // for react reasons it's important to clean up a subscription like this. // The reason will make it much easier to debug (and even give preemptive warnings) to keep state well controlled
}

export interface Service<T> extends Emitter<T> {
  update: (newVal: T | ((x: T) => T | undefined)) => void;
}

// From a typing perspective the Service is an emitter with more features, but from an implementation perspective
// the emitter is literally a Service with it's update function chopped off.
//
// I want each node in my state management tree to basically work the same way (holds a state and emits to it's listeners)
// I have a child lock where I need it, to prevent drunken chaos, but other than that, it's just a bunch of these stateful emitters listening to each other and emitting when necessary
export function asEmitter<T>(serv: Service<T>): Emitter<T> {
  return {
    listen: serv.listen,
    pipe: serv.pipe,
    current: serv.current,
    complete: serv.complete,
  };
}

interface ServiceOpts {
  keepAlive?: boolean;
  extraCleanupFun?: () => void;
  test?: string;
}

// Written as a closure, because I think that's sexier than a lame class (the "this" keyword is stupid and I hate it);
// The cleanup function is called whenever the list of subscribers goes to 0.
// The main use case for this is so that the pipe function can clean itself up. Without this the internal subscription on the pipe has no end condition
export function CJAXService<T>(init: T, opts?: ServiceOpts): Service<T> {
  // It turns out, when you have multiple pipes being built based on shared state stuff you end up with some messy in-between states where you'll subscribe to a cleaned up service only to immediately re-subscribed
  // Basically this doesn't work quite as smoothly as I wanted it to.

  let state = init;
  const listeners = new Set<(val: T) => any>();

  const current = () => state;

  // Skip Current is for when I want the RxJs observer functionality of only responding to future events and ignoring the current state
  function listen(onEmit: (x: T) => any, skipCurrent: boolean | "SKIP CURRENT" = false) {
    listeners.add(onEmit);
    if (state !== undefined && !skipCurrent) onEmit(state); // I think I really like this behavior, I kinda always want it to do the replay subject initial emit thing, but I don't want that when the value is undefined. This is great!
    // returning the unsubscribe function plays nice with useEffect
    return () => {
      const beforeDelete = listeners.size; // Had weird, inconsistent issues with stuff getting double-cleaned up. Only cleaning up if there were listeners before this deletion solved the problem
      listeners.delete(onEmit);
      if (beforeDelete && listeners.size === 0) {
        complete(zeroListenersReason); // clean up when I run out of listeners - in particular, if a piped service looses its listeners, that pipe should stop listening to its parents. This is how I ensure that if a set of pipes are chained together, the last pipe in that chain completing will cause all the parents in that chain to complete
      }
    };
  }

  function pipe<O>(modifier: (t: T) => O, keepAlive = false, pipeTest?: string) {
    const closureStack = new Error();
    let prevArg: T;

    const internalTestVal = pipeTest || opts?.test;
    // Pipes should, by default, clean themselves up, this is particularly important if I chained pipes together. Having every emitter clean itself up when all it's listeners are gone is a good way to avoid memory leak issues.
    // One place where this leads to unexpected behavior is if the pipe was defined globally. In this case, I should set "keep alive" to true
    const init = state === undefined ? undefined : modifier(state); // was using && default before and lead ot a bug. Explicitly, if the state of the source is undefined, the state of the pipe is undefined, otherwise the state of the pipe should be determined using the modifier
    let pipeCleanup: (() => void) | undefined;
    // A piped service like this will always clean itself up. If I want to create a pipe that doesn't do this I can just
    // create that service manually and then manage the unsubscription on my own.
    const piped = CJAXService(init, {
      test: internalTestVal,
      extraCleanupFun: () => pipeCleanup?.(),
      keepAlive,
    }); // There really shouldn't be a case where this cleanup function is called before the first listen function is finished. because the cleanup is only called after the subscribers to this piped service drop off

    // This service calls its own listen function to connect the pipe
    const unsubscribe = listen((e: T) => {
      const start = SLOW_POKE_HUNTER ? Date.now() : null;

      const modified = modifier(e);

      if (SLOW_POKE_HUNTER && start !== null) {
        catchSlowPoke(Date.now() - start, e, prevArg, closureStack);
        if (CJAX_DEFAULT_DISTINCT_FIG) prevArg = CJAX_DEFAULT_DISTINCT_FIG?.copy(e);
      }

      if (modified === undefined) return; // the pipe can also function as a filter if the modifier has a return undefined case
      piped.update(modified);
    }, true); // skipping current because I already handle the current state setting up the init above

    pipeCleanup = () => {
      if (internalTestVal) console.log(`${internalTestVal} is calling its cleanup function`);
      unsubscribe();
    };

    return asEmitter(piped);
  }

  // the function will basically have the ability to mutate my state, but that's the whole point
  // the only way to mutate the state is in here and this will then emit, and that emission will tell everyone else what's up
  function update(newVal: T | ((x: T) => T | undefined)) {
    if (newVal === undefined) {
      console.warn(
        `You are updating the state of this service with undefined. Undefined in CJAX is generally treated as a "nevermind, don't operate" value, so this is probably not what you want to do.`
      );
    }
    if (typeof newVal === "function" && state === undefined) {
      console.warn(
        `Warning, you're trying to update the state of this service with a function, but the current state is undefined!!`
      );
      console.warn(state);
    }
    let updated: T;
    if (typeof newVal === "function") {
      updated = (newVal as any)(state);
      if (updated === undefined) return; // ? I'm leaning in a little more into the idea the undefined represents "actually nevermind" in the update function. This is already applied in the pipe world, and I'm giving that option here now
    } else updated = newVal;
    state = updated;
    listeners.forEach((l) => l(updated));
  }

  function complete(reason: string) {
    if (opts?.keepAlive) {
      if (opts?.test)
        console.log(
          'This service is designated as "keepAlive" so the behavior on the complete function will not be executed'
        );
      return;
    }
    listeners.clear();
    if (opts?.test) console.log("%cTest Serv is calling cleanup because complete was called", "color: pink");
    opts?.extraCleanupFun?.(); // services generated by the .pipe() function need to clean themselves up, this is the more important behavior of the complete() function... I think
  }

  return { listen, update, pipe, current, complete };
}

type EitherType<T> = Service<T> | Emitter<T>;
export function cjaxProm<T>(serv: EitherType<T>): Promise<T> {
  return new Promise<T>((res) => {
    const val = serv.current();
    if (val !== undefined) return res(val);
    const unsub = serv.listen((e) => {
      res(e);
      unsub(); // This system doesn't work if the listen event is triggered immediately, but the if statement above should avoid that case
    });
  });
}

export type EmitterTuple<T> = {
  [K in keyof T]: Emitter<T[K]> | undefined;
};

export function cjaxJoin<A extends unknown[]>(...emitters: [...EmitterTuple<A>]): Emitter<A> | undefined {
  let innerSubs = [] as any[];

  // I like the idea that the join doesn't emit until all source emitters are present a lot more than emitting for when some aren't present
  if (!emitters.every((e) => !!e)) return undefined;

  const joined = CJAXService<A>(emitters.map((e) => undefined) as A, {
    extraCleanupFun: () => innerSubs.forEach((unsub) => unsub?.()),
  });

  innerSubs = emitters.map((source, i) =>
    source?.listen((e) => {
      joined.update((prev) => {
        prev[i] = e;
        return prev;
      });
    })
  );
  return asEmitter(joined);
}

// * VIDEO COMMENT - https://www.loom.com/share/f719d005d25044619248adf3088de539
export function ignoreRepeats<T>(distinctionFig?: CjaxDistincterFig) {
  const { copy, comparator } = distinctionFig ||
    CJAX_DEFAULT_DISTINCT_FIG || {
      copy: (x: T) => {
        if (typeof x === "object")
          console.warn(
            `You threw a distinctPipe onto a service which is emitting an object and you did not provide a distict checker configuration. This will lead to unexpected issues in your render cycle`
          );
        return x;
      },
      comparator: (a: T | undefined, b: T | undefined) => a === b,
    };

  let cached: T;
  return (event: T): T | undefined => {
    if (comparator(cached, event)) return; // * CJAX short hand for don't process
    cached = copy(event);
    return event;
  };
}

const zeroListenersReason = "the number of listeners to this service dropped to 0";

export type IffyMitter<T> = Emitter<T> | Emitter<T | undefined> | undefined;
export type IffyServ<T> = Service<T> | Service<T | undefined> | undefined;
export type EmitterValue<T extends Emitter<any> | undefined> = T extends Emitter<infer U> ? U : never;

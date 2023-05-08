import { slowPokeWrap } from "./DebugTools";

// Rather than importing all of Rxjs, I'm going to implement the essential pieces of it as a state management system
// at least, that's what's going on conceptually. I think concretely there will be some differences between what my stuff does
// and how rxjs is built, but I know what I want and I don't want to work around the mysteries/and finnicky bits of rxjs unless I'm really using
// the whole library of operators

// Piped Services, and Combined services are Emitters. I don't want to expose the update function because that would be really confusing and a dumb thing to have access to on an intermediary state processor
// This is essentially a child lock, to get me using the emitter correctly.
export type Emitter<T> = Omit<CJAXService<T>, "update">;

// From a typing perspective the Service is an emitter with more features, but from an implementation perspective
// the emitter is literally a Service with it's update function chopped off.
//
// I want each node in my state management tree to basically work the same way (holds a state and emits to it's listeners)
// I have a child lock where I need it, to prevent drunken chaos, but other than that, it's just a bunch of these stateful emitters listening to each other and emitting when necessary
export function asEmitter<T>(serv: CJAXService<T>): Emitter<T> {
  return serv as Emitter<T>; // ? This has no runtime effect, but it enforces that the consumer of this package doesn't try to call "update" on a service where that would be dangerous
}

// Written as a closure, because I think that's sexier than a lame class (the "this" keyword is stupid and I hate it);
// The cleanup function is called whenever the list of subscribers goes to 0.
// The main use case for this is so that the pipe function can clean itself up. Without this the internal subscription on the pipe has no end condition
export class CJAXService<T> {
  private state: T;
  private additionalCleanup?: () => void;
  private testVal?: string;
  private listeners = new Set<(val: T) => any>();

  constructor(init: T, additionalCleanup?: () => void, test?: string) {
    this.state = init;
    this.additionalCleanup = additionalCleanup;
    this.testVal = test;
    if (test) console.log("%cTest service Constructed! " + test, "color: cyan;");
  }
  // It turns out, when you have multiple pipes being built based on shared state stuff you end up with some messy in-between states where you'll subscribe to a cleaned up service only to immediately re-subscribed
  // Basically this doesn't work quite as smoothly as I wanted it to.

  current() {
    return this.state;
  }

  // Skip Current is for when I want the RxJs observer functionality of only responding to future events and ignoring the current state
  listen(onEmit: (x: T) => any, skipCurrent: boolean | "SKIP CURRENT" = false) {
    this.listeners.add(onEmit);
    if (this.state !== undefined && !skipCurrent) onEmit(this.state); // I think I really like this behavior, I kinda always want it to do the replay subject initial emit thing, but I don't want that when the value is undefined. This is great!
    // returning the unsubscribe function plays nice with useEffect
    return () => {
      if (this.testVal) console.log("Test service was unsubscribed from! ", this.testVal);
      const beforeDelete = this.listeners.size; // ? Had weird, inconsistent issues with stuff getting double-cleaned up. Only cleaning up if there were listeners before this deletion solved the problem
      this.listeners.delete(onEmit);
      if (this.testVal) {
        console.log("Remaining listeners! ", this.listeners.size);
        console.log(this.listeners);
      }
      if (beforeDelete && this.listeners.size === 0) this.complete(); // ? Clean up when I run out of listeners - in particular, if a piped service looses its listeners, that pipe should stop listening to its parents. This is how I ensure that if a set of pipes are chained together, the last pipe in that chain completing will cause all the parents in that chain to complete
    };
  }

  pipe<O>(modifier: (t: T) => O, pipeTest?: string): Emitter<O | undefined> {
    const pipeStackContext = new Error();
    const internalTestVal = pipeTest || this.testVal;
    // Pipes should, by default, clean themselves up, this is particularly important if I chained pipes together. Having every emitter clean itself up when all it's listeners are gone is a good way to avoid memory leak issues.
    // One place where this leads to unexpected behavior is if the pipe was defined globally. In this case, I should set "keep alive" to true
    const init = this.state === undefined ? undefined : modifier(this.state); // was using && default before and lead ot a bug. Explicitly, if the state of the source is undefined, the state of the pipe is undefined, otherwise the state of the pipe should be determined using the modifier
    let pipeCleanup: (() => void) | undefined;
    // A piped service like this will always clean itself up. If I want to create a pipe that doesn't do this I can just
    // create that service manually and then manage the unsubscription on my own.
    const piped = new CJAXService(init, pipeCleanup, pipeTest); // There really shouldn't be a case where this cleanup function is called before the first listen function is finished. because the cleanup is only called after the subscribers to this piped service drop off

    // This service calls its own listen function to connect the pipe
    const unsubscribe = this.listen((e: T) => {
      const modified = slowPokeWrap("Pipe Listener is kinda slow", pipeStackContext, () => modifier(e));
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
  update(newVal: T | ((x: T) => T | undefined)) {
    if (newVal === undefined)
      console.warn(
        `You are updating the state of this service with undefined. Undefined in CJAX is generally treated as a "nevermind, don't operate" value, so this is probably not what you want to do.`
      );

    if (typeof newVal === "function" && this.state === undefined) {
      console.warn(
        `Warning, you're trying to update the state of this service with a function, but the current state is undefined!!`
      );
      console.warn(this.state);
    }
    let updated: T;
    if (typeof newVal === "function") {
      updated = (newVal as any)(this.state);
      if (updated === undefined) return; // ? I'm leaning in a little more into the idea the undefined represents "actually nevermind" in the update function. This is already applied in the pipe world, and I'm giving that option here now
    } else updated = newVal;
    this.state = updated;
    this.listeners.forEach((l) => l(updated));
  }

  complete() {
    this.listeners.clear();
    if (this.testVal) console.log("%cTest Serv is calling complete! " + this.testVal, "color: pink; font-size: 24px");
    this.additionalCleanup?.(); // ? services generated by the .pipe() function need to clean themselves up, this is the more important behavior of the complete() function
  }
}

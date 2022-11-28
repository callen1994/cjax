import { useEffect, useMemo, useState, useSyncExternalStore } from "react"; // Because of react, this file is not safe to import on the server
import { Emitter, Service } from "@cjax/cjax";

// This can be overridden by the user if they want a global default here...

// Either an empty object or it's neither
export type CjaxDistincterFig = {
  comparator: <T>(a: T, b: T) => boolean;
  copy: <T>(val: T) => T;
};

let CJAX_DEFAULT_DISTINCT_FIG: CjaxDistincterFig | {} = {};

export function SET_CJAX_HOOK_FIG(fig: CjaxDistincterFig) {
  CJAX_DEFAULT_DISTINCT_FIG = fig;
}

export function useCJAX<T>(serv: Emitter<T> | undefined, distincterFig?: CjaxDistincterFig): T | undefined {
  const getData = useMemo(() => {
    if (!serv) return () => undefined;

    if (!distincterFig && !("comparator" in CJAX_DEFAULT_DISTINCT_FIG)) {
      return () => serv?.current();
    }

    const { copy, comparator } = distincterFig ? distincterFig : (CJAX_DEFAULT_DISTINCT_FIG as CjaxDistincterFig);

    let cachedState = copy(serv.current());

    return () => {
      const newState = serv.current();
      if (!comparator(cachedState, newState)) {
        cachedState = copy(newState);
      }
      return cachedState;
    };
  }, [serv]);

  return useSyncExternalStore(
    serv?.listen ||
      (() => {
        return () => {};
      }),
    getData
  );
}

// Previously I was using "useMemo" to generate a pipe within a component, but these weren't always getting cleaned up properly. The use effect code below should fix that
// CJAXType is an inferred type because the pipe builder could either return an Emitter or a Service
//
// TODO
// I'm using the react-y crappy way of signaling state change which is "change state" -> "re-render" -> "useEffect is called if dependencies changed"
// This is a pretty crappy and un-predictable flow. useRef might be a better option here... I'll do some noodling when it's not a giant waste of time
export function usePipe<T, CJAXType extends Service<T> | Emitter<T>>(
  // This is better than passing in a service and the reducer separately, because I'm able to do more complex logic than just reduce a single
  // service.
  pipeBuilder: () => CJAXType | undefined, // * usePipe and the Constructor
  dependencies: any[] = [],
  opts?: { test?: string; dontListenInternal?: true }
) {
  const { test } = opts || {};
  const [piped$, setPiped] = useState<CJAXType>();
  useEffect(() => {
    const built = pipeBuilder();
    if (!built) return; // if I'm building a pipe that relies on other pipes that might not be ready yet, then the pipeBuilder will be returning undefined while the dependencies are still undefined (and I have to make sure I'm adding the dependencies! so it gets built once they are ready)
    // So here's the theory... if I build a pipe on a component (and in this hook it's not (necessarily) getting immediately used) that pipe will clean itself up when it's last listener leaves
    // In general with this usePipe hook, that last listener is a child element, and it's entirely possible that all listening children go away and then come back. This pipe will then be a dud because it
    // though all it's listeners were gone. To ensure this pipe remains available to it's children even when the children re-render I want one more listener hanging around on the component that called this pipe
    // that listener shouldn't call any set state because the point is that it isn't reacting to all the events on this pipe.
    // This parent listener should then get cleaned up when this use effect is cleaned up, and if that ends up being the final listener then the whole pipe will be done
    //
    // This did seem to help with my categorization transaction pipe issues...
    if (!opts?.dontListenInternal)
      built.listen((e) => {
        if (test) {
          console.log(`${test} parent listener fired`);
          console.log(e);
        }
      });
    setPiped(built);
    return () => built.complete("");
  }, dependencies); // if I add the pipeBuilder to this dependency array then I end up in an infinite loop... it's been working great without that dependency, so I don't want to fuck around with it...
  return piped$;
}

export function usePipeHere<T>(
  pipeBuilder: () => Emitter<T> | undefined, // * usePipe and the Constructor
  reducerDeps: any[] = [],
  opts?: {
    test?: string;
    distincter?: CjaxDistincterFig;
  }
) {
  // Skipping the internal listener because it shouldn't be necessary. I'm listening just below in the useCJAX hook
  const piped$ = usePipe(pipeBuilder, reducerDeps, { ...opts, dontListenInternal: true });
  const data = useCJAX(piped$, opts?.distincter);
  return [data, piped$] as const;
}

////////////////////////////////////////////////////////////////////////////////////////////
// Old Use Pipe Here Implementation - Multiple use effects was bad and didn't work well
////////////////////////////////////////////////////////////////////////////////////////////
// export function usePipeHere<T>(
//   pipeBuilder: () => Emitter<T> | undefined, // Typescript was being dumb and confusing when I tried to use the Generic CJAXType and infer whether I'm creating an emitter or a service here. When I did, it would loose track of the output type... in like 99% of cases I want my pipe builder to return an emitter, so I'll just say that that's the behavior and not fuck around with it too much more
//   dependencies: any[] = [],
//   forceRenderProp: "FORCE RERENDER" | boolean = false, // * Force Rerender Notes
//   test?: string
// ): [T | undefined, Emitter<T> | undefined] {
//   const piped$ = usePipe(pipeBuilder, dependencies, test);
//   const piped = useCJAX<T>(piped$, forceRenderProp, test, dependencies);
//   return [piped, piped$]; // sorta like set state, except the piped$ here isn't a setter. I can't call update on this because it's derived
// }
////////////////////////////////////////////////////////////////////////////////

// * usePipe and the Constructor
// using useMemo(CJAXService<FooType>(), []) currently works fine. usePipe adds some annoying-ness with the service being a stateful value that has to change at least once.
// But usePipe ensures that the complete() function is called, which feels like a responsible feature to use...

// * Force Rerender Notes
// React set state optimizes unnecessary re-renders by checking if the new state is "===" to the old state. This is great for strings and numbers, and I rely on that behavior a lot
// but it's busted when I use complex objects. If I emit an object, then I mutate that object and emit it again, that will still be === to the past value, so react won't render,
// but force re-render fixes it

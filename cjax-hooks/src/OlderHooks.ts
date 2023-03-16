import { useCJAX } from "./NewerHooks";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Emitter, CjaxDistincterFig, CJAX_DEFAULT_DISTINCT_FIG, slowPokeWrap } from "@cjax/cjax";
import { testLogInternalListener, usePipeHereTestUseEffect } from "./testLogging";

// * VIDEO COMMENT - https://www.loom.com/share/e5c8605bf753436e8eb71fcc0d8bffbd
export function useCJAX_SYNC_STOR_METHOD<T>(
  serv: Emitter<T> | undefined,
  distincterFig?: CjaxDistincterFig,
  test?: string
): T | undefined {
  const getData = useMemo(() => {
    const cjaxCallContext = new Error();
    if (!serv) return () => undefined;
    const figToUse = distincterFig === undefined ? CJAX_DEFAULT_DISTINCT_FIG.fig : distincterFig;

    // * Distinct checking won't happen by default. Distinct checking should be set up by the user of this package in the entrypoint of their app.
    // * Distinct checking can be turned off for certain emitters by passing a distinctFig: null
    if (!figToUse) return () => serv?.current();

    const { copy, comparator } = figToUse;
    let cachedState = copy(serv.current());

    return () => {
      const newState = serv.current();
      slowPokeWrap("Use CJAX compare / copy", cjaxCallContext, () => {
        if (!comparator(cachedState, newState)) cachedState = copy(newState);
      });
      return cachedState;
    };
  }, [serv, distincterFig]);

  // ? The subscribe function is either the service's listen function (which returns a cleanup) or it's a dud function that returns a dud cleanup
  const subscribe = useMemo(() => serv?.listen || (() => () => {}), [serv]);

  return useSyncExternalStore(subscribe, getData);
}

// * VIDEO COMMENT - https://www.loom.com/share/fd748af41fe94c389d0023b06947e431
/**
 *
 * @deprecated usePipe is depreciated in favor of usePiped
 */
export function usePipe<T>(
  // ! usePipe is ONLY for pipes that's why this pipe builder can only return an Emitter. Constructing a service should happen in a useMemo
  pipeBuilder: () => Emitter<T> | undefined, // ? Passing in the "pipeBuilder" function is better than passing in a service and the reducer separately, because I'm able to do more complex logic than just reduce a single service.
  dependencies: any[] = [],
  opts?: { test?: string; dontListenInternal?: true }
) {
  const { test } = opts || {};
  const [piped$, setPiped] = useState<Emitter<T>>();
  useEffect(() => {
    if (test) console.log(`%c${test} Building pipe`, "color: yellow");
    const built = pipeBuilder();
    if (test) console.log(built);
    if (!built) return; // ? If I'm building a pipe that relies on other pipes that might not be ready yet, then the pipeBuilder will be returning undefined while the dependencies are still undefined (and I have to make sure I'm adding the dependencies! so it gets built once they are ready)

    // * Internal Listener notes
    // So here's the thing... if I build a pipe on a component (and in this hook it's not (necessarily) getting immediately used) that pipe will clean itself up when it's last listener leaves
    // In general with this usePipe hook, that last listener is a child element, and it's entirely possible that all listening children go away and then come back. This pipe will then be a dud because it
    // though all it's listeners were gone. To ensure this pipe remains available to it's children even when the children re-render I want one more listener hanging around on the component that called this pipe
    // that listener shouldn't call any set state because the point is that it isn't reacting to all the events on this pipe.
    // This parent listener should then get cleaned up when this use effect is cleaned up, and if that ends up being the final listener then the whole pipe will be done
    //
    // This did seem to help with my categorization transaction pipe issues...
    // ***
    if (!opts?.dontListenInternal) {
      if (test) console.log(`${test} setting up parent listener`);
      built.listen((e) => testLogInternalListener(e, test));
    }
    setPiped(built);
    return () => {
      if (test) console.log(`${test} pipe getting cleaned up`);
      return built.complete("");
    };
  }, dependencies); // if I add the pipeBuilder to this dependency array then I end up in an infinite loop... it's been working great without that dependency, so I don't want to fuck around with it...
  return piped$;
}

/**
 *
 * @deprecated usePipe is depreciated in favor of usePiped
 */
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
  usePipeHereTestUseEffect(piped$, opts?.test);
  const data = useCJAX(piped$, opts?.distincter, opts?.test);
  return [data, piped$] as const;
}

import { useEffect, useMemo, useState, useSyncExternalStore } from "react"; // Because of react, this file is not safe to import on the server
import { Emitter } from "@cjax/cjax";
import { CjaxDistincterFig, CJAX_DEFAULT_DISTINCT_FIG } from "@cjax/cjax-distinction";

export function useCJAX<T>(
  serv: Emitter<T> | undefined,
  distincterFig?: CjaxDistincterFig,
  test?: string
): T | undefined {
  const getData = useMemo(() => {
    if (!serv) return () => undefined;
    const figToUse = distincterFig === undefined ? CJAX_DEFAULT_DISTINCT_FIG : distincterFig;

    // * Distinct checking won't happen by default. Distinct checking should be set up by the user of this package in the entrypoint of their app.
    // * Distinct checking can be turned off for certain emitters by passing a distinctFig: null
    if (!figToUse) return () => serv?.current();

    const { copy, comparator, slowWarnThreshold = 500 } = figToUse;
    let cachedState = copy(serv.current());
    return () => {
      if (test) {
        console.log(`%c${test} useCJAX getting data`, "color: orange");
        console.log(copy(serv?.current()));
      }
      const newState = serv.current();
      const start = Date.now();
      if (!comparator(cachedState, newState)) cachedState = copy(newState);
      const elapsed = Date.now() - start;
      if (elapsed > slowWarnThreshold) {
        console.trace("Slow CJAX Listener");
        console.warn(
          `This CJAX listener had a slow compare - copy time ${elapsed}, consider picking more optimized copy and compare functions. Or, if either the source data doesn't emit frequently or the component render is inexpensive, consider passing a null distictorFig. This will result in the component re-render even if the emitted data is equivalent to it's prior state, but it will eliminate the costly compare / copy`
        );
      }
      if (test) console.log(`${test} Time elapsed on compare - copy ${elapsed}`);
      return cachedState;
    };
  }, [serv, distincterFig]);

  // ? The subscribe function is either the service's listen function (which returns a cleanup) or it's a dud function that returns a dud cleanup
  const subscribe = useMemo(() => serv?.listen || (() => () => {}), [serv]);

  return useSyncExternalStore(subscribe, getData);
}

// * VIDEO COMMENT - https://www.loom.com/share/fd748af41fe94c389d0023b06947e431
// ? Previously I was using "useMemo" to generate a pipe within a component, but these weren't always getting cleaned up properly. The usePipe custom hook fixes that
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

    // * Internal Listener Notes
    if (!opts?.dontListenInternal) {
      if (test) console.log(`${test} setting up parent listener`);
      built.listen((e) => {
        if (test) {
          console.log(`${test} parent listener fired`);
          console.log(e);
        }
      });
    }

    setPiped(built);

    return () => {
      if (test) console.log(`${test} pipe getting cleaned up`);
      return built.complete("");
    };
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

  if (opts?.test) {
    useEffect(
      () =>
        piped$?.listen((e) => {
          console.log(`%c${opts.test} Test Use Effect Listener Piped Emitter Emitting!`, `color: blue`);
          console.log(e);
        }),
      [piped$]
    );
  }

  const data = useCJAX(piped$, opts?.distincter, opts?.test);
  return [data, piped$] as const;
}

// * Internal Listener notes
// So here's the thing... if I build a pipe on a component (and in this hook it's not (necessarily) getting immediately used) that pipe will clean itself up when it's last listener leaves
// In general with this usePipe hook, that last listener is a child element, and it's entirely possible that all listening children go away and then come back. This pipe will then be a dud because it
// though all it's listeners were gone. To ensure this pipe remains available to it's children even when the children re-render I want one more listener hanging around on the component that called this pipe
// that listener shouldn't call any set state because the point is that it isn't reacting to all the events on this pipe.
// This parent listener should then get cleaned up when this use effect is cleaned up, and if that ends up being the final listener then the whole pipe will be done
//
// This did seem to help with my categorization transaction pipe issues...

// ***

type SourceOrBuilder<T> = Emitter<T> | undefined | (() => Emitter<T> | undefined);

// * Video on what I was thinking, this seems like a worthwhile upgrade - https://www.loom.com/share/f4d3d87ebca4466cbf4aaec3e5f509a9
export function usePipeNEW<T, O>(
  // ! usePipe is ONLY for pipes that's why this pipe builder can only return an Emitter. Constructing a service should happen in a useMemo
  // pipeBuilder: () => Emitter<T> | undefined, // ? Passing in the "pipeBuilder" function is better than passing in a service and the reducer separately, because I'm able to do more complex logic than just reduce a single service.
  sourceOrBuilder: SourceOrBuilder<T>,
  transformer: (sourceData: T) => O,
  dependencies: any[] = [],
  opts?: { test?: string; dontListenInternal?: true }
) {
  const { test } = opts || {};
  const [piped$, setPiped] = useState<Emitter<O | undefined>>();

  // * The idea is this is a quality of life thing. When you're using a pipe the source emitter will be default included in the dependencies array
  const deps = useMemo(() => {
    if (typeof sourceOrBuilder === "function") return dependencies; // ? If the source is a function to build an emitter, this should NOT be included because these are generally decaled in-line and would casue a re-render loop
    if (dependencies.includes(sourceOrBuilder)) return dependencies; // ? If the source is already included in the dependencies I don't want to add it again...
    return dependencies.concat(sourceOrBuilder);
  }, [dependencies, sourceOrBuilder]);

  useEffect(() => {
    if (test) console.log(`%c${test} Building pipe`, "color: yellow");
    const source = typeof sourceOrBuilder !== "function" ? sourceOrBuilder : sourceOrBuilder();
    const outputPipe = source?.pipe(transformer);
    if (test) console.log(outputPipe);

    if (!outputPipe) return; // ? If I'm building a pipe that relies on other pipes that might not be ready yet, then the pipeBuilder will be returning undefined while the dependencies are still undefined (and I have to make sure I'm adding the dependencies! so it gets built once they are ready)

    // * Internal Listener Notes
    if (!opts?.dontListenInternal) {
      if (test) console.log(`${test} setting up parent listener`);
      outputPipe.listen((e) => {
        if (test) {
          console.log(`${test} parent listener fired`);
          console.log(e);
        }
      });
    }

    setPiped(outputPipe);

    return () => {
      if (test) console.log(`${test} pipe getting cleaned up`);
      return outputPipe.complete("");
    };
  }, deps);
  return piped$;
}

export function usePipeHereNEW<T, O>(
  sourceOrBuilder: SourceOrBuilder<T>,
  transformer: (source: T) => O,
  reducerDeps: any[] = [],
  opts?: {
    test?: string;
    distincter?: CjaxDistincterFig;
  }
) {
  // Skipping the internal listener because it shouldn't be necessary. I'm listening just below in the useCJAX hook
  const piped$ = usePipeNEW(sourceOrBuilder, transformer, reducerDeps, { ...opts, dontListenInternal: true });

  if (opts?.test) {
    useEffect(
      () =>
        piped$?.listen((e) => {
          console.log(`%c${opts.test} Test Use Effect Listener Piped Emitter Emitting!`, `color: blue`);
          console.log(e);
        }),
      [piped$]
    );
  }

  const data = useCJAX(piped$, opts?.distincter, opts?.test);
  return [data, piped$] as const;
}

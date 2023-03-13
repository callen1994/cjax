import { useEffect, useMemo, useState } from "react"; // Because of react, this file is not safe to import on the server
import { Emitter, CjaxDistincterFig, CJAX_DEFAULT_DISTINCT_FIG, slowPokeWrap } from "@cjax/cjax";
import { testLogUseCjaxListener, usePipeHereTestUseEffect } from "./testLogging";
import { CJAXHookOpts, internalListener } from "./Utils";
import { useJoinPiped, usePiped } from "./UsePiped";
export * from "./UsePiped";

export function useCJAX<T>(
  serv: Emitter<T> | undefined,
  distincterFig?: CjaxDistincterFig,
  test?: string
): T | undefined {
  // * VIDEO COMMENT - WHY NOT useSyncExternalStore?? https://www.loom.com/share/e5c8605bf753436e8eb71fcc0d8bffbd
  const [outputState, setOutPutState] = useState<T>();
  const cjaxCallContext = new Error();

  useEffect(() => {
    const figToUse = distincterFig === undefined ? CJAX_DEFAULT_DISTINCT_FIG.fig : distincterFig;
    if (!figToUse) return serv?.listen(setOutPutState);
    const { copy, comparator } = figToUse;
    let cachedState: T;

    // * VIDEO COMMENT: Reference Fun - https://www.loom.com/share/c3e44e406b6b4b1cb14f041dfcc68d7c
    const updateState = (newState: T) =>
      slowPokeWrap("Use CJAX copy", cjaxCallContext, () => {
        // ? MUST BE DIFFERENT REFERENCE FROM PREV STATE
        cachedState = copy(newState);
        // ? MUST BE DIFFERENT REFERENCE FROM PREV STATE AND NOT A REFERENCE TO CACHED STATE (in case user mutates the output state)
        setOutPutState(copy(newState));
      });

    serv && updateState(serv.current());

    return serv?.listen((newState) => {
      testLogUseCjaxListener(test, copy, comparator, newState, cachedState);
      const same = slowPokeWrap("Use CJAX compare", cjaxCallContext, () => comparator(cachedState, newState));
      if (!same) updateState(newState);
    });
  }, [serv, distincterFig]);
  return outputState;
}

export function useCustomBuiltCJAX<T>(
  builder: () => Emitter<T> | undefined,
  dependencies: any[] = [],
  opts?: CJAXHookOpts
) {
  const { test } = opts || {};
  const [piped$, setPiped] = useState<Emitter<T | undefined>>();

  // * The idea is this is a quality of life thing. When you're using a pipe the source emitter will be default included in the dependencies array

  useEffect(() => {
    if (test) console.log(`%c${test} Building pipe`, "color: yellow");
    const builtPipe = builder();
    const outputPipe = builtPipe?.pipe((x) => x); // * Video on why this is necessary - https://www.loom.com/share/f4d3d87ebca4466cbf4aaec3e5f509a9
    if (!outputPipe) return; // ? If I'm building a pipe that relies on other pipes that might not be ready yet, then the pipeBuilder will be returning undefined while the dependencies are still undefined (and I have to make sure I'm adding the dependencies! so it gets built once they are ready)
    internalListener(outputPipe, opts);
    setPiped(outputPipe);
    return () => {
      if (test) console.log(`${test} pipe getting cleaned up`);
      return outputPipe.complete("");
    };
  }, dependencies);

  return piped$;
}

export function usePipedHere<T, O>(...args: Parameters<typeof usePiped<T, O>>) {
  // ? Skipping the internal listener because it shouldn't be necessary. I'm listening just below in the useCJAX hook
  const piped$ = usePiped(args[0], args[1], args[2], { ...args[3], dontListenInternal: true });
  usePipeHereTestUseEffect(piped$, args[3]?.test);
  const data = useCJAX(piped$, args[3]?.distincter, args[3]?.test);
  return [data, piped$] as const;
}

export function useJoinPipedHere<A extends unknown[], O>(...args: Parameters<typeof useJoinPiped<A, O>>) {
  // ? Skipping the internal listener because it shouldn't be necessary. I'm listening just below in the useCJAX hook
  const piped$ = useJoinPiped(args[0], args[1], args[2], { ...args[3], dontListenInternal: true });
  usePipeHereTestUseEffect(piped$, args[3]?.test);
  const data = useCJAX(piped$, args[3]?.distincter, args[3]?.test);
  return [data, piped$] as const;
}

export function useBuiltHere<T>(...args: Parameters<typeof useCustomBuiltCJAX<T>>) {
  // ? Skipping the internal listener because it shouldn't be necessary. I'm listening just below in the useCJAX hook
  const piped$ = useCustomBuiltCJAX(args[0], args[1], { ...args[2], dontListenInternal: true });
  usePipeHereTestUseEffect(piped$, args[2]?.test);
  const data = useCJAX(piped$, args[2]?.distincter, args[2]?.test);
  return [data, piped$] as const;
}
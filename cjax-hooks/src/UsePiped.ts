import { useEffect, useMemo, useState } from "react"; // Because of react, this file is not safe to import on the server
import { cjaxJoin, Emitter, EmitterTuple } from "@cjax/cjax";
import { CJAXHookOpts, internalListener } from "./Utils";

export function usePiped<T, O>(
  source: Emitter<T> | undefined,
  transformer: (sourceData: T) => O,
  dependencies: any[] = [],
  opts?: CJAXHookOpts
) {
  const [piped$, setPiped] = useState<Emitter<O | undefined>>();

  // * The idea is this is a quality of life thing. When you're using a pipe the source emitter will be default included in the dependencies array
  const deps = useMemo(() => {
    if (dependencies.includes(source)) return dependencies; // ? If the source is already included in the dependencies I don't want to add it again...
    return dependencies.concat(source);
  }, [dependencies, source]);

  useConstructAndSet(() => source?.pipe(transformer), setPiped, deps, opts);
  return piped$;
}

export function useJoinPiped<A extends unknown[], O>(
  sources: [...EmitterTuple<A>],
  transformer: (sourceData: A) => O,
  dependencies: any[] = [],
  opts?: CJAXHookOpts
) {
  const [piped$, setPiped] = useState<Emitter<O | undefined>>();

  // * The idea is this is a quality of life thing. When you're using a pipe the source emitter will be default included in the dependencies array
  const deps = useMemo(() => {
    const ret = [...dependencies];
    sources.forEach((source) => {
      if (dependencies.includes(source)) return dependencies; // ? If the source is already included in the dependencies I don't want to add it again...
      return ret.push(source);
    });
    return ret;
  }, [dependencies, sources]);

  useConstructAndSet(() => cjaxJoin(...sources)?.pipe(transformer), setPiped, deps, opts);
  return piped$;
}

function useConstructAndSet<T>(
  builder: () => Emitter<T | undefined> | undefined,
  setPiped: React.Dispatch<React.SetStateAction<Emitter<T | undefined> | undefined>>,
  deps: any[] = [],
  opts?: CJAXHookOpts
) {
  useEffect(() => {
    if (opts?.test) console.log(`%c${opts?.test} Building pipe`, "color: yellow");
    const outputPipe = builder();
    if (!outputPipe) return;
    internalListener(outputPipe, opts);
    setPiped(outputPipe);
    return () => {
      if (opts?.test) console.log(`${opts?.test} pipe getting cleaned up`);
      return outputPipe.complete("");
    };
  }, deps);
}

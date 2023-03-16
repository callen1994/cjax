import { asEmitter, CJAXService, Emitter, Service } from "./Cjax";
import { slowPokeWrap } from "./DebugTools";

// Either an empty object or it's neither
export type CjaxDistincterFig = {
  comparator: <T>(a: T, b: T) => boolean;
  copy: <T>(val: T) => T;
  slowWarnThreshold?: number;
} | null;

export const CJAX_DEFAULT_DISTINCT_FIG: { fig: CjaxDistincterFig } = { fig: null };

export function SET_CJAX_DISTINCTION_FIG(fig: CjaxDistincterFig) {
  CJAX_DEFAULT_DISTINCT_FIG.fig = fig;
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
export function ignoreRepeats<T>(
  distinctionFig?: NonNullable<CjaxDistincterFig>,
  deets?: { callContext: Error; details: string }
) {
  const ignoreRepeatContext = new Error();
  const { copy, comparator } = distinctionFig ||
    CJAX_DEFAULT_DISTINCT_FIG.fig || {
      copy: (x: T) => {
        if (typeof x === "object")
          console.warn(
            `You threw an ingoreRepeats pipe onto a service which is emitting an object and you did not provide a distinct checker configuration. This will lead to unexpected issues in your render cycle`
          );
        return x;
      },
      comparator: (a: T | undefined, b: T | undefined) => a === b,
    };

  let cached: T;
  return (event: T): T | undefined => {
    return slowPokeWrap(deets?.details || "Ignore repeats call", deets?.callContext || ignoreRepeatContext, () => {
      if (comparator(cached, event)) return; // * CJAX short hand for don't process
      cached = copy(event); // ? The cached state must be (deeply) distinct from both the state managed in the service and the state returned to the hook caller. So that mutations on those external pieces don't result in a failure to detect a change properly
      return event;
    });
  };
}

export type IffyMitter<T> = Emitter<T> | Emitter<T | undefined> | undefined;
export type IffyServ<T> = Service<T> | Service<T | undefined> | undefined;
export type EmitterValue<T extends Emitter<any> | undefined> = T extends Emitter<infer U> ? U : never;

export * from "./string-utilities";
// For alphebetizing in Array.sort(alph) call with no arguments ot just sort strings / numbers
export function alph<T = string | number>(
  sortBy?: (value: T) => string | number | boolean | Date | undefined,
  reverse?: "reverse"
) {
  const getVal = sortBy || ((x: any) => x);
  return (v1: T, v2: T) => (getVal(v1) > getVal(v2) ? 1 : -1) * (reverse ? -1 : 1);
}

// Preserves the type through the values call, something typescript doesn't seem to think is worthwhile...
export function typedValues<O extends object>(o: O) {
  return Object.values(o) as O[keyof O][];
}

export function typedKeys<O extends object>(o: O) {
  return Object.keys(o) as (keyof O)[];
}

export function typedEntries<O extends object>(o: O) {
  return Object.entries(o) as [keyof O, O[keyof O]][];
}

export function hasOwnProperty<X extends {}, Y extends PropertyKey>(obj: X, prop: Y): obj is X & Record<Y, unknown> {
  return obj.hasOwnProperty(prop);
}

// The typing on lodash mapValues is all funky and typescript gets mad a lot...
export function myMapValues<O extends object, NewVal>(
  o: O,
  fun: (val: O[keyof O], key: keyof O) => NewVal
): { [key in keyof O]: NewVal } {
  const ret: any = {};
  typedKeys(o).map((key) => (ret[key] = fun(o[key], key)));
  return ret;
}

export const onlyUnique = <T>(value: T, index: number, self: T[]) => {
  return self.indexOf(value) === index;
};

export const percentRank = (array: number[], n: number) => {
  let larger = 0;
  let same = 0;
  const N = array.length;
  array.forEach((val) => (n > val ? (larger += 1) : n === val ? (same += 1) : ""));

  const pct = (larger + 0.5 * same) / array.length;

  return pct;
};

export const range = (start: number, end: number): number[] => {
  if (start === end) return [start];
  return [start, ...range(start + 1, end)];
};

// If I want to do a one-line thing and return to end the function
// but I don't want to return the value, this is the utility for the job
export function voyd(x: any) {
  return;
}

export function asNumber(x: string | number): number {
  if (typeof x === "number") return x;
  else return parseInt(x);
}

export function truthyArray<T>(arr: (T | undefined | null | false | void)[]): T[] {
  return arr.filter((t) => t !== undefined && t !== null && t !== false) as T[]; // typescript doesn't understand filtering...
}

export async function asyncMap<I, O>(loopOver: I[], fun: (arg: I) => Promise<O>) {
  let index = 0;
  const ret: O[] = [];
  while (index < loopOver.length) {
    const res = await fun(loopOver[index]);
    ret.push(res);
    index = index + 1;
  }
  return ret;
}

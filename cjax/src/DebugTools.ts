// * If this is null, nothing should happen here
interface SlowPokeHunter {
  timeThreshold: number;
  issues: { closureStackTrace: Error; stack: Error; elapsedTime: number; calculatedValue: any; details: string }[];
}
const SLOW_POKE_HUNTER_STOR: { store: SlowPokeHunter | null } = { store: null };

function catchSlowPoke<T>(elapsedTime: number, calculatedValue: T, closureStackTrace: Error, details: string) {
  const hunter = SLOW_POKE_HUNTER_STOR.store;
  if (!hunter) return;
  const isSlow = elapsedTime > hunter.timeThreshold;
  if (isSlow) {
    const issue = {
      details,
      closureStackTrace,
      stack: new Error(),
      elapsedTime,
      calculatedValue,
    };
    hunter.issues.push(issue);
    console.warn(`Slow operation detected ${details}`);
    console.log(issue);
  }
}

export function initiateSlowPokeHunter(timeThreshold: number) {
  SLOW_POKE_HUNTER_STOR.store = { timeThreshold, issues: [] };
}

export function slowPokeReport() {
  return SLOW_POKE_HUNTER_STOR.store?.issues;
}

export function slowPokeWrap<T>(details: string, closureStackTrace: Error, call: () => T) {
  const start = Date.now();
  const ret = call();
  catchSlowPoke(Date.now() - start, ret, closureStackTrace, details);
  return ret;
}

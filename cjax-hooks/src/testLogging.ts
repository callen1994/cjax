import { CjaxDistincterFig, Emitter } from "@cjax/cjax";
import { useEffect } from "react";

export function testLogUseCjaxListener(
  test: string | undefined,
  copy: (x: any) => any,
  comparator: (x: any, z: any) => any,
  newState: any,
  cachedState: any
) {
  if (test) {
    console.log(`%c${test} useCJAX received this data`, "color: orange");
    console.log(copy(newState));
    const result = comparator(cachedState, newState);
    console.log(`%c${test} useCJAX comparator result ${result}`, "color: orange");
  }
}

export function testLogInternalListener(e: any, test?: string) {
  if (test) {
    console.log(`${test} parent listener fired`);
    console.log(e);
  }
}

export function usePipeHereTestUseEffect(piped$: Emitter<any> | undefined, test?: string) {
  if (test) {
    useEffect(
      () =>
        piped$?.listen((e) => {
          console.log(`%c${test} Test Use Effect Listener Piped Emitter Emitting!`, `color: blue`);
          console.log(e);
        }),
      [piped$]
    );
  }
}

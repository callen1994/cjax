import { Emitter } from "@cjax/cjax";
import { useEffect } from "react";

export function testLogInternalListener(e: any, test?: string) {
  if (test) {
    console.log(`${test} internal listener fired`);
    console.log(e);
  }
}

export function usePipeHereTestUseEffect(piped$: Emitter<any> | undefined, test?: string) {
  if (test) {
    useEffect(
      () =>
        piped$?.listen((e) => {
          console.log(`%c${test} Test internal listener Emitting!`, `color: blue;`);
          console.log(e);
        }),
      [piped$]
    );
  }
}

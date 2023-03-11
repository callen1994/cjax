import { Emitter } from "@cjax/cjax";
export declare function testLogUseCjaxListener(test: string | undefined, copy: (x: any) => any, comparator: (x: any, z: any) => any, newState: any, cachedState: any): void;
export declare function testLogInternalListener(e: any, test?: string): void;
export declare function usePipeHereTestUseEffect(piped$: Emitter<any> | undefined, test?: string): void;

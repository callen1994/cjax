import { Emitter, CjaxDistincterFig } from "@cjax/cjax";
export declare function useCJAX_SYNC_STOR_METHOD<T>(
  serv: Emitter<T> | undefined,
  distincterFig?: CjaxDistincterFig,
  test?: string
): T | undefined;
/**
 *
 * @deprecated usePipe is depreciated in favor of usePiped
 * @param transformer
 * @param dependencies
 * @param opts
 * @returns
 */
export declare function usePipe<T>(
  pipeBuilder: () => Emitter<T> | undefined, // ? Passing in the "pipeBuilder" function is better than passing in a service and the reducer separately, because I'm able to do more complex logic than just reduce a single service.
  dependencies?: any[],
  opts?: {
    test?: string;
    dontListenInternal?: true;
  }
): Emitter<T> | undefined;
export declare function usePipeHere<T>(
  pipeBuilder: () => Emitter<T> | undefined, // * usePipe and the Constructor
  reducerDeps?: any[],
  opts?: {
    test?: string;
    distincter?: CjaxDistincterFig;
  }
): readonly [T | undefined, Emitter<T> | undefined];

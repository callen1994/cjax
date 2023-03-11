import { Emitter, CjaxDistincterFig } from "@cjax/cjax";
export declare function useCJAX<T>(serv: Emitter<T> | undefined, distincterFig?: CjaxDistincterFig, test?: string): T | undefined;
declare type SourceOrBuilder<T> = Emitter<T> | undefined | (() => Emitter<T> | undefined);
export declare function usePipeNEW<T, O>(sourceOrBuilder: SourceOrBuilder<T>, transformer: (sourceData: T) => O, dependencies?: any[], opts?: {
    test?: string;
    dontListenInternal?: true;
}): Emitter<O | undefined> | undefined;
export declare function usePipeHereNEW<T, O>(sourceOrBuilder: SourceOrBuilder<T>, transformer: (source: T) => O, reducerDeps?: any[], opts?: {
    test?: string;
    distincter?: CjaxDistincterFig;
}): readonly [O | undefined, Emitter<O | undefined> | undefined];
export {};

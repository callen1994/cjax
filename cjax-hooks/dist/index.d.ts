import { Emitter, Service } from "@cjax/cjax";
export declare function useCJAX<T>(serv: Emitter<T> | undefined): T | undefined;
export declare function usePipe<T, CJAXType extends Service<T> | Emitter<T>>(pipeBuilder: () => CJAXType | undefined, // * usePipe and the Constructor
dependencies?: any[], opts?: {
    test?: string;
    dontListenInternal?: true;
}): CJAXType | undefined;
export declare function usePipeHere<T>(pipeBuilder: () => Emitter<T> | undefined, // * usePipe and the Constructor
reducerDeps?: any[], opts?: {
    test?: string;
}): readonly [T | undefined, Emitter<T> | undefined];

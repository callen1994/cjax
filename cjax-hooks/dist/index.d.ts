import { Emitter, Service } from "@cjax/cjax";
export declare const CJAX_FIG: {
    DEFAULT_COMPARATOR: undefined | ((a: any, b: any) => boolean);
    DEFAULT_COPY: undefined | ((val: any) => any);
};
export declare function useCJAX<T>(serv: Emitter<T> | undefined, equalTestOverride?: (prev: T | undefined, next: T | undefined) => boolean, copyerOverride?: (val: T | undefined) => T | undefined): T | undefined;
export declare function usePipe<T, CJAXType extends Service<T> | Emitter<T>>(pipeBuilder: () => CJAXType | undefined, // * usePipe and the Constructor
dependencies?: any[], opts?: {
    test?: string;
    dontListenInternal?: true;
}): CJAXType | undefined;
export declare function usePipeHere<T>(pipeBuilder: () => Emitter<T> | undefined, // * usePipe and the Constructor
reducerDeps?: any[], opts?: {
    test?: string;
    equalTest?: (prev: T | undefined, next: T | undefined) => boolean;
    copyer?: (val: T | undefined) => T | undefined;
}): readonly [T | undefined, Emitter<T> | undefined];

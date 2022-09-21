export interface Emitter<T> {
    listen: (listener: (x: T) => any, skipCurrent?: boolean | "SKIP CURRENT") => () => void;
    pipe: <O>(modifier: (x: T) => O, keepAlive?: boolean, test?: string) => Emitter<O | undefined>;
    current: () => T | undefined;
    complete: (reason: string) => void;
}
export interface Service<T> extends Emitter<T> {
    update: (newVal: T | ((x: T) => T)) => void;
}
interface ServiceOpts {
    keepAlive?: boolean;
    extraCleanupFun?: () => void;
    test?: string;
}
export declare function CJAXService<T>(init: T, opts?: ServiceOpts): Service<T>;
declare type EitherType<T> = Service<T> | Emitter<T>;
export declare function cjaxProm<T>(serv: EitherType<T>): Promise<T>;
export declare type EmitterTuple<T> = {
    [K in keyof T]: Emitter<T[K]> | undefined;
};
export declare function cjaxJoin<A extends unknown[]>(...emitters: [...EmitterTuple<A>]): Emitter<A> | undefined;
export declare function deepDistinctPipe<T>(): (newState: T) => T | undefined;
export declare function deepDistinctCallback<T>(init: T): (newState: T) => T;
export declare type IffyMitter<T> = Emitter<T> | Emitter<T | undefined> | undefined;
export declare type IffyServ<T> = Service<T> | Service<T | undefined> | undefined;
export {};

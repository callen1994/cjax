import { RouteFig } from "./Router";
interface UseSearchParamOptions {
    fallback?: string;
    test?: string;
    preserved?: boolean;
}
export declare function useSearchParam(field: string, { fallback, test, preserved }?: UseSearchParamOptions): readonly [string | undefined, (d: string | undefined) => void];
export declare function useParsedSearchParam<T>(field: string, parser: (val: string | undefined) => T, serializer: (val: T) => string | undefined, { fallback, test, preserved }?: UseSearchParamOptions): readonly [T, (val: T) => void];
export declare function useCurrentRoute<T extends RouteFig>(parentRoute: string[], routes: T[]): import("@cjax/cjax").Emitter<T | undefined>;
export declare function buildRoutePipe<T extends RouteFig>(parentRoute: string[], routes: T[]): import("@cjax/cjax").Emitter<T | undefined>;
export declare function comparePaths(currentPath: string, testPath: string): boolean;
export {};

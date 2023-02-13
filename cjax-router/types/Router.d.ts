import React from "react";
export interface RouteFig {
    path: string;
    component: React.FunctionComponent;
    default?: boolean;
}
export declare const ROUTER$: import("@cjax/cjax").Service<URL>;
export declare function INIT_ROUTER(): void;
export declare function updateSearchParams(newParams: {
    [key: string]: string | null;
}): void;
export declare function navAtDepth(nestedPath: string, depth: number): void;

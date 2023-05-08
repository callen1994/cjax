import React from "react";
import { CJAXService } from "@cjax/cjax";
export interface RouteFig {
    path: string;
    component: React.FunctionComponent;
    default?: boolean;
}
export declare const ROUTER$: CJAXService<URL>;
export declare function INIT_ROUTER(): void;
export declare function alterUrlPrams(url: URL, newParams: {
    [key: string]: string | null;
}): URL;
export declare function updateSearchParams(newParams: {
    [key: string]: string | null;
}): void;
export declare function navAtDepth(nestedPath: string, depth: number): void;

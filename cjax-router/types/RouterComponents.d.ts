import React from "react";
import { IffyMitter } from "@cjax/cjax";
import { CSSProperties, PropsWithChildren } from "react";
import { ROUTER$, RouteFig } from "./Router";
interface TopLinkSections<T extends RouteFig> {
    parentPath: string[];
    sections: T[];
    currentSection$: IffyMitter<RouteFig>;
    children: (props: {
        section: T;
        selected: boolean;
    }) => JSX.Element;
}
export declare function LinkCollection<T extends RouteFig>({ parentPath, sections, currentSection$, children, }: TopLinkSections<T>): JSX.Element;
interface LinkProps {
    to: string;
    onClick?: (e: any) => any;
    className?: string;
    routeUpdates?: Parameters<typeof ROUTER$.update>[0];
    style?: CSSProperties;
}
export declare function Link({ to, routeUpdates, onClick, className, children, style, ...props }: PropsWithChildren<LinkProps & React.AnchorHTMLAttributes<HTMLAnchorElement>>): JSX.Element;
interface RouterPipeOutletProps {
    currentSection$: IffyMitter<RouteFig>;
    fallback?: React.FC<{}>;
}
export declare function RouterPipeOutlet({ currentSection$, fallback: Fallback }: RouterPipeOutletProps): JSX.Element;
export {};

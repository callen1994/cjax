import React from "react";
import { IffyMitter } from "@cjax/cjax";
import { PropsWithChildren } from "react";
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
interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
    to?: string;
    routeUpdates?: Parameters<typeof ROUTER$.update>[0];
}
export declare function Link({ to, routeUpdates, onClick, children, ...props }: PropsWithChildren<LinkProps>): JSX.Element;
interface RouterPipeOutletProps {
    currentSection$: IffyMitter<RouteFig>;
    fallback?: React.FC<{}>;
}
export declare function RouterPipeOutlet({ currentSection$, fallback: Fallback }: RouterPipeOutletProps): JSX.Element;
export {};

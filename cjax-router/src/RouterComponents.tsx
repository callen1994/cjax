import React from "react";
import { IffyMitter } from "@cjax/cjax";
import { useCJAX } from "@cjax/cjax-hooks";
import { CSSProperties, PropsWithChildren } from "react";
import { ROUTER$, RouteFig } from "./Router";

interface TopLinkSections<T extends RouteFig> {
  parentPath: string[];
  sections: T[];
  currentSection$: IffyMitter<RouteFig>;
  children: (props: { section: T; selected: boolean }) => JSX.Element;
}

export function LinkCollection<T extends RouteFig>({
  parentPath,
  sections,
  currentSection$,
  children,
}: TopLinkSections<T>) {
  const currentSection = useCJAX(currentSection$);
  return (
    <>
      {sections.map((section) => (
        <Link to={`${parentPath?.join("/")}/${section.path}`} key={section.path}>
          {children({ section, selected: currentSection?.path === section.path })}
        </Link>
      ))}
    </>
  );
}

interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  to?: string;
  routeUpdates?: Parameters<typeof ROUTER$.update>[0]; // * when they click the link these updates will fire it's as simple as that
}

export function Link({ to, routeUpdates, onClick, children, ...props }: PropsWithChildren<LinkProps>) {
  return (
    <a
      {...props}
      onClick={(e) => {
        onClick?.(e);
        if (!to && !routeUpdates) return; // ? If neither of these are specified, then the caller doesn't want to update the router, and presumably href was passed
        e.preventDefault();
        return ROUTER$.update((oldURL) => {
          if (!oldURL) return undefined;
          // the user wants to just overwrite the whole object with a new thing (this will ignore anything in the to parameter)
          if (typeof routeUpdates === "object") return routeUpdates;
          // the user wants to update specifically the path
          if (to) oldURL.pathname = to;
          // the user wants to apply some other function updates based on the url (the updates in the function should respect the update in the to parameter)
          if (routeUpdates) {
            const appliedUpdates = routeUpdates(oldURL);
            if (appliedUpdates) oldURL = appliedUpdates;
          }
          return oldURL;
        });
      }}>
      {children}
    </a>
  );
}

interface RouterPipeOutletProps {
  currentSection$: IffyMitter<RouteFig>;
  fallback?: React.FC<{}>;
}

export function RouterPipeOutlet({ currentSection$, fallback: Fallback }: RouterPipeOutletProps) {
  const currentSection = useCJAX(currentSection$);
  if (!currentSection) return Fallback ? <Fallback /> : <div>Loading...</div>;
  return <currentSection.component />;
}

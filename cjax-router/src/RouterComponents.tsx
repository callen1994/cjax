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

interface LinkProps {
  to: string;
  onClick?: (e: any) => any;
  className?: string;
  routeUpdates?: Parameters<typeof ROUTER$.update>[0]; // * when they click the link these updates will fire it's as simple as that
  style?: CSSProperties;
}

export function Link({
  to,
  routeUpdates,
  onClick,
  className,
  children,
  style,
  ...props
}: PropsWithChildren<LinkProps & React.AnchorHTMLAttributes<HTMLAnchorElement>>) {
  return (
    <a
      {...props}
      className={className + " cursor-pointer"}
      style={style}
      onClick={(e) => {
        e.preventDefault();
        onClick?.(e);
        ROUTER$.update((oldURL) => {
          if (!oldURL) return oldURL;
          // the user wants to just overwrite the whole object with a new thing (this will ignore anything in the to parameter)
          if (typeof routeUpdates === "object") return routeUpdates;
          // the user wants to update specifically the path
          if (to) oldURL.pathname = to;
          // the user wants to apply some other function updates based on the url (the updates in the function should respect the update in the to parameter)
          if (routeUpdates) oldURL = routeUpdates(oldURL);
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

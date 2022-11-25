import { CJAXService } from "@cjax/cjax";
import { PropsWithChildren } from "react";

export const ROUTER$ = CJAXService<URL>(new URL(window.location.href));

export function INIT_ROUTER() {
  ROUTER$.listen((updateURL) => window.history.pushState(null, "", updateURL));
}

export function navAtDepth(nestedPath: string, depth: number) {
  ROUTER$.update((url) => {
    const updated = url.pathname.split("/");
    // If the preceding indexes aren't defined it will populate those with undefined
    updated[depth] = nestedPath;
    // I *probably* want to slice the path down so it doesn't hold on to un-used sub-paths if this is a higher level navigation...
    url.pathname = updated.slice(0, depth + 1).join("/");
    return url;
  });
}

export interface RouteFig {
  path: string;
  component: React.FunctionComponent;
  default?: boolean;
}

interface LinkProps {
  // extends React.DetailedHTMLProps<React.AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement>
  to: string;
  onClick?: (e: any) => any;
  className?: string;
  // searchParams?: { [key: string]: string };
}

export function Link({ to, onClick, className, children, ...props }: PropsWithChildren<LinkProps>) {
  return (
    <div
      {...props}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        onClick?.(e);
        ROUTER$.update((oldURL) => {
          if (!oldURL) return oldURL;
          oldURL.pathname = to;
          return oldURL;
        });
      }}>
      {children}
    </div>
  );
}

export function pipeDownRoutes(parentRoute: string[], routes: RouteFig[]) {
  return ROUTER$.pipe((url) => {
    const split = url.pathname.split("/");
    // Tests that all the parent paths are active.
    // if they aren't all the other logic should be ignored
    if (!parentRoute.every((r, i) => split[i + 1] === r)) return;
    const indexICareAbout = parentRoute.length + 1;
    const found = routes.find((r) => r.path === split[indexICareAbout]);
    if (!found) {
      const defaultRoute = routes.find((r) => r.default);
      if (defaultRoute) {
        navAtDepth(defaultRoute.path, indexICareAbout);
        return defaultRoute; // I think I like this... there will be an additional emit from this pipe, but it should get ignored because the result will be the same
      } else return; // this can just return undefined if there is no default route
    }
    return found;
  });
}

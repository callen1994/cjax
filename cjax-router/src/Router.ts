import React from "react";
import { CJAXService } from "@cjax/cjax";

export interface RouteFig {
  path: string;
  component: React.FunctionComponent;
  default?: boolean;
}

export const ROUTER$ = CJAXService<URL>(new URL(window.location.href));

export function INIT_ROUTER() {
  // When the active history entry changes while the user navigates the session history
  // https://developer.mozilla.org/en-US/docs/Web/API/Window/popstate_event
  ROUTER$.listen((updateURL) => {
    updateURL.toString() !== window.location.toString() && window.history.pushState(null, "", updateURL);
  });
  window.onpopstate = (e) => {
    ROUTER$.update((prev) => {
      prev.href = window.location.href;
      return prev;
    });
  };
}

export function alterUrlPrams(url: URL, newParams: { [key: string]: string | null }) {
  Object.entries(newParams).forEach(([key, val]) => {
    if (val) url.searchParams.set(key, val);
    else url.searchParams.delete(key);
  });
  return url;
}

export function updateSearchParams(newParams: { [key: string]: string | null }) {
  ROUTER$.update((url) => alterUrlPrams(url, newParams));
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

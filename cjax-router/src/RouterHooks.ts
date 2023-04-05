import { useCustomPipe, usePipedHere } from "@cjax/cjax-hooks";
import { useEffect, useMemo } from "react";
import { navAtDepth, RouteFig, ROUTER$, updateSearchParams } from "./Router";

interface UseSearchParamOptions {
  fallback?: string;
  test?: string;
  preserved?: boolean; // ? Indicates whether the route parameters should be preserved when the component is un-rendered, default is false
}

export function useSearchParam(field: string, { fallback, test, preserved }: UseSearchParamOptions = {}) {
  const [fromRouter] = usePipedHere(
    ROUTER$,
    (url) => {
      const val = url.searchParams.get(field);
      if (val) return val;
      if (fallback) {
        updateSearchParams({ [field]: fallback });
        return fallback; // If I know that the value is supposed to be this there's no point waiting for the router event to re-trigger the pipe here, I can just return it immediately
      }
    },
    [fallback]
  );

  const setRouter = useMemo(
    () => (d: string | undefined) => {
      updateSearchParams({ [field]: d || null });
    },
    [field]
  );

  // There is no effect to this useEffect in the render stage
  // ? When cleanup happens, I want to remove the field I was listening to (something like start/end date are common fiends and it can be weird/annoying to have old values sticking around)
  useEffect(
    () => () => {
      if (!preserved) updateSearchParams({ [field]: null });
    },
    []
  );
  return [fromRouter, setRouter] as const;
}

export function useParsedSearchParam<T>(
  field: string,
  parser: (val: string | undefined) => T,
  serializer: (val: T) => string | undefined,
  { fallback, test, preserved }: UseSearchParamOptions = {}
) {
  const [fromRouter, setRouter] = useSearchParam(field, { preserved, test, fallback }); // running the fallback through this will enforce uniform interpretation

  const fromRouterParsed = useMemo(() => parser(fromRouter), [fromRouter]);
  const serializedToRouter = useMemo(() => (val: T) => setRouter(serializer(val)), [setRouter]);

  return [fromRouterParsed, serializedToRouter] as const;
}

export function useCurrentRoute<T extends RouteFig>(parentRoute: string[], routes: T[]) {
  // ? If this hook is called with the parent route constructed ile ['/reports'] then that results in an infinite loop, but when it's spread, that shouldn't break it
  return useCustomPipe(() => buildRoutePipe(parentRoute, routes), [...parentRoute, routes]);
}

export function buildRoutePipe<T extends RouteFig>(parentRoute: string[], routes: T[]) {
  return ROUTER$.pipe((url) => findRouteOrNavToDefault(url, parentRoute, routes));
}

export function findRouteOrNavToDefault<R extends RouteFig>(url: URL, parentRoute: string[], routes: R[]) {
  const indexICareAbout = parentRoute.length + 1;
  const split = url.pathname.split("/");
  // Tests that all the parent paths are active.
  // if they aren't all the other logic should be ignored
  // I remove the slash characters from the route here because it's common that they might show up and I just want to ignore them
  if (!parentRoute.every((r, i) => split[i + 1] === r.split("/").join(""))) {
    console.log("Ignoring because you're not on my route");
    return;
  }

  // Remove slashes from the path value because that fucks with stuff
  const found = routes.find((r) => r.path.split("/").join("") === split[indexICareAbout]);

  // ! Side effect redirect to default route
  if (!found) {
    const defaultRoute = routes.find((r) => r.default);
    if (defaultRoute) {
      navAtDepth(defaultRoute.path.split("/").join(""), indexICareAbout); // Remove slashes from the path value because that fucks with stuff
      return defaultRoute; // I think I like this... there will be an additional emit from this pipe, but it should get ignored because the result will be the same
    } else return; // this can just return undefined if there is no default route
  }
  return found;
}

// The idea is that the current path might be a sub-path (or it might have query params) and this function tests that head of the current path matches the test path
export function comparePaths(currentPath: string, testPath: string) {
  return testPath.split("/").every((seg, i) => currentPath.split("/")[i] === seg);
}

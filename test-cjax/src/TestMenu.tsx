import { usePipeHere } from "@cjax/cjax-hooks";
import { startCase } from "lodash";
import { Link, navAtDepth, pipeDownRoutes, RouteFig, ROUTER$ } from "./Router";
import Profile from "./Profile";
import Tables from "./Tables";

const ROUTES: RouteFig[] = [
  { path: "profile", component: Profile, default: true },
  { path: "tables", component: Tables },
];

export default function TestMenu() {
  const [displayedRoute] = usePipeHere(() => pipeDownRoutes([], ROUTES));

  return (
    <div className="text-white bg-slate-800 h-screen w-screen overflow-auto flex p-4 gap-4">
      <nav className="flex flex-col gap-2 w-44 p-2 bg-slate-700">
        {ROUTES.map((r) => (
          <Link to={r.path} key={r.path}>
            <button className="bg-slate-600 p-3 rounded w-full">{startCase(r.path)}</button>
          </Link>
        ))}
      </nav>
      <main className="flex-1 p-2 bg-slate-700">{displayedRoute && <displayedRoute.component />}</main>
    </div>
  );
}

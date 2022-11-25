import { usePipeHere } from "@cjax/cjax-hooks";
import { startCase } from "lodash";
import { Link, navAtDepth, pipeDownRoutes, RouteFig, ROUTER$ } from "./Router";

const TABLE_ROUTES: RouteFig[] = [
  { path: "table-1", component: Table1, default: true },
  { path: "table-2", component: Table2 },
];

export default function Tables() {
  const [displayedRoute] = usePipeHere(() => pipeDownRoutes(["tables"], TABLE_ROUTES));
  return (
    <div>
      <div className="flex gap-2">
        {TABLE_ROUTES.map((r) => (
          <Link to={"tables/" + r.path} key={r.path}>
            <button className="bg-slate-600 p-3 rounded w-full">{startCase(r.path)}</button>
          </Link>
        ))}
      </div>
      {!displayedRoute ? "loading...." : <displayedRoute.component />}
    </div>
  );
}

function Table1() {
  return <div>This would be a table with something but I'm lazy</div>;
}
function Table2() {
  return <div>Here is a different compnenet...</div>;
}

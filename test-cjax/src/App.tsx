import { INIT_ROUTER } from "./Router";
import { useEffect } from "react";
import TestMenu from "./TestMenu";

export default function App() {
  useEffect(() => INIT_ROUTER(), []);

  return <TestMenu />;
}

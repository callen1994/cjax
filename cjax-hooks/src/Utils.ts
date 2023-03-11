import { CjaxDistincterFig, Emitter } from "@cjax/cjax";
import { testLogInternalListener } from "./testLogging";

export type CJAXHookOpts = { test?: string; dontListenInternal?: true; distincter?: CjaxDistincterFig };

export function internalListener<O>(
  outputPipe: Emitter<O | undefined>,
  opts?: { test?: string | undefined; dontListenInternal?: true | undefined }
) {
  // * Internal Listener notes
  // So here's the thing... if I build a pipe on a component (and in this hook it's not (necessarily) getting immediately used) that pipe will clean itself up when it's last listener leaves
  // In general with this usePipe hook, that last listener is a child element, and it's entirely possible that all listening children go away and then come back. This pipe will then be a dud because it
  // though all it's listeners were gone. To ensure this pipe remains available to it's children even when the children re-render I want one more listener hanging around on the component that called this pipe
  // that listener shouldn't call any set state because the point is that it isn't reacting to all the events on this pipe.
  // This parent listener should then get cleaned up when this use effect is cleaned up, and if that ends up being the final listener then the whole pipe will be done
  //
  // This did seem to help with my categorization transaction pipe issues...
  // ***
  if (!opts?.dontListenInternal) {
    if (opts?.test) console.log(`${opts?.test} setting up parent listener`);
    outputPipe.listen((e) => testLogInternalListener(e, opts?.test));
  }
}

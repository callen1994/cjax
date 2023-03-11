import { exec } from "child_process";
import { truncate } from "lodash";

export function getValidEnv(env: string) {
  const ret = process.env[env];
  if (ret === undefined) throw new Error(`Invalid Environment specified ${env} value is missing`);
  return ret;
}

// Like execSync, but with better error handling
export function executeHere(cmd: string) {
  return new Promise<void>((res) => {
    exec(cmd, (err, out, stdErr) => {
      if (err) {
        console.error(
          `There was an error... but like... it was probably erronious - certainly not worth causing a crash over :/`
        );
        console.log(err);
      }
      if (stdErr) console.warn(stdErr);
      if (out) console.log(out);
      console.log(`COMMAND: ${truncate(cmd)} == FINISHED ==`);
      res();
    });
  });
}

export async function asyncMap<I, O>(loopOver: I[], fun: (arg: I) => Promise<O>) {
  let index = 0;
  const ret: O[] = [];
  while (index < loopOver.length) {
    const res = await fun(loopOver[index]);
    ret.push(res);
    index = index + 1;
  }
  return ret;
}

export function startImAliver(msg: string) {
  let count = 0;
  const timer = setInterval(() => {
    count = count + 1;
    console.log(msg + " " + count);
  }, 1000);
  return { stopit: () => clearTimeout(timer) };
}

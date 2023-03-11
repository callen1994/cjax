import { config } from "dotenv";
// Than's Stack overflow https://stackoverflow.com/questions/50587502/nodejs-execute-command-on-remote-linux-server
import { Client } from "ssh2";
import path from "path";
import { connectClient, doOnServer } from "./ssh2-helpers";
import { readFileSync } from "fs";
import { getValidEnv, executeHere, asyncMap, startImAliver } from "./utils";
import { endsWith } from "lodash";

interface Config {
  vps_connection_env_path: string;
  // This is the absolute path on the VPS where the files belong
  deployed_files_path: string;
  // This will usually include * to upload the package.json and other random config files that might be necessary in production
  // file names starting with "." (e.g. .env) will need to be listed explicitly because they're ignored by default
  // This will generally be a list of strings, but it could be a tuple, indentifying a file and the new name it should have on the server (e.g. .env.prod locally because .env on the server)
  files_to_upload: Array<string | [string, string]>;
  // I don't feel like offering the rename option here
  folders_to_upload: Array<string>;
  // ? These are only applicable when deploying a pm2-managed service
  pre_launch_scripts?: string[]; // usually npm install --only=prod, but could be other commands (e.g. npx prisma migrate)
  pm2_prod_config_path?: string; // Should be relative to the project root, it will be referenced on the server
  prod_port?: string;
  sleep_before_start?: number; // milliseconds
}

// This should have the host, user and pem file path
export async function deploy({
  vps_connection_env_path,
  deployed_files_path,
  files_to_upload,
  folders_to_upload,
  pre_launch_scripts,
  pm2_prod_config_path,
  prod_port,
  sleep_before_start,
}: Config) {
  const globalEnvPath = path.resolve(process.cwd(), vps_connection_env_path);
  config({ path: globalEnvPath });

  if (pm2_prod_config_path) validatePm2FigName(pm2_prod_config_path);
  const pm2_config = pm2_prod_config_path && require(path.resolve(process.cwd(), pm2_prod_config_path));
  const pemPath = path.resolve(globalEnvPath, "../" + getValidEnv("PEM_FILE"));

  // ###########################################################
  // Create Connection
  const client = await connectClient(new Client(), {
    host: getValidEnv("VPS_HOST"),
    username: getValidEnv("VPS_USER"),
    privateKey: readFileSync(pemPath),
  });

  // ###########################################################
  // Cleanup clear the server files
  await doOnServer(client, `echo "I'm in"`);
  await doOnServer(client, `rm -rf ${deployed_files_path}`);
  await doOnServer(client, `mkdir -p ${deployed_files_path}`); // -p creates subdirectories if they need to be created

  // Remove the old process (if applicable)
  if (pm2_prod_config_path) {
    await Promise.all(pm2_config.apps.map((app: any) => doOnServer(client, `pm2 delete ${app.name}`)));
  }
  // Just to be sure, kill any process on the port too
  if (prod_port) await doOnServer(client, `kill -9 $(lsof -ti:${prod_port})`);

  // ###########################################################
  // SCP Upload files
  const SCP_TARGET = `${getValidEnv("VPS_USER")}@${getValidEnv("VPS_HOST")}:${deployed_files_path}`;

  await asyncMap(files_to_upload, (f) => {
    console.log("Uploading file " + f);
    if (typeof f === "string")
      return executeHere(`scp -i ${pemPath} -BC ${process.cwd()}/${f} ${SCP_TARGET}/${f === "*" ? "" : ""}`);
    else {
      const [localName, deployedName] = f;
      return executeHere(`scp -i ${pemPath} -BC ${process.cwd()}/${localName} ${SCP_TARGET}/${deployedName}`);
    }
  });

  await asyncMap(folders_to_upload, async (f) => {
    console.log("Uploading folder " + f);
    const isAdjacent = f.indexOf("..") === 0;
    if (isAdjacent) {
      // This ensures that when I upload a folder to a path adjacent to the regular deploy path that folder will be properly cleaned out
      // I built support for this behavior because it's used in the deployment process of the docs-server.
      // The docs-server references the prisma stuff, and locally it just references the server directory as a sibling
      // When deployed it's easiest to have the relative path set up the same way, so I just upload the necessary parts of the server adjacent to the deployed docs-server
      await doOnServer(client, `rm -rf ${deployed_files_path}/${f}`);
      await doOnServer(client, `mkdir -p ${deployed_files_path}/${f}`);
    }
    // Adjacent folders I want to upload the contents of the folder, but stuff directly under the parent can be uploaded safely
    // This is because of an inconsistency in scp. If you upload a folder to a path where that folder is absent, then the folder is created
    // When dist does not exist on production server
    //     (e.g. scp -r ...local_path/dist ...prod_path/dist) => ...prod_path/dist
    // When dist does exist on production server
    //     (e.g. scp -r ...local_path/dist ...prod_path/dist) => ...prod_path/dist/dist
    return executeHere(`scp -i ${pemPath} -BC -r ${process.cwd()}/${f}${isAdjacent ? "/*" : ""} ${SCP_TARGET}/${f}`);
  });

  console.log("Finished with uploads!");
  if (!pm2_prod_config_path) return client.end();

  if (sleep_before_start) {
    console.log("Sleeping before the final deploy step");
    await new Promise((res) => setTimeout(res, sleep_before_start));
  }

  const aliveNotifyer = startImAliver("I haven't crashed yet!");
  // ###########################################################
  // Spin up the process on the server
  // sourcing the nvm install on the server just to be safe (there might eb other installs, but I don't want to support that right now)
  await asyncMap((pre_launch_scripts || []).concat(`pm2 start ${pm2_prod_config_path}`), (cmd) =>
    doOnServer(client, `. ~/.nvm/nvm.sh; cd ${deployed_files_path}; ${cmd}`)
  );

  aliveNotifyer.stopit();

  return client.end();
}

// Not really part of deploying, but a thing I like to do along side the rest of this
export async function cleanupDev(dev_pm2_path: string, port: string) {
  validatePm2FigName(dev_pm2_path);
  const pm2Config = require(path.resolve(process.cwd(), dev_pm2_path));
  await Promise.all(
    pm2Config.apps.map((app: any) => {
      // This ignores errors, because it's fine if the process is already dead
      return executeHere(`pm2 delete ${pm2Config.apps[0].name}`);
    })
  );
  await executeHere(`kill -9 $(lsof -ti:${port})`);
}

export function validatePm2FigName(fileName: string) {
  if (!endsWith(fileName, ".config.cjs")) {
    console.warn(
      `The provided pm2 config file name ${fileName} will not be parsed correctly. The ending should be ".config.cjs"`
    );
  }
}

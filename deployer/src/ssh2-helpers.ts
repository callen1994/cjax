import { Client, ConnectConfig } from "ssh2";

export function connectClient(client: Client, connectionParameters: ConnectConfig) {
  return new Promise<Client>((res, rej) => {
    client
      .on("ready", () => res(client))
      .on("error", rej)
      .connect(connectionParameters);
  });
}

export function doOnServer(client: Client, cmd: string) {
  return new Promise<void>((res, rej) => {
    client.exec(cmd, function (err, stream) {
      if (err) throw new Error(err.toString());
      stream
        .on("close", () => res())
        .on("data", (data: Buffer) => console.log("" + data)) // The string addition operation parses the buffer into a string that I can read
        .stderr.on("data", (data) => console.log("" + data));
    });
  });
}

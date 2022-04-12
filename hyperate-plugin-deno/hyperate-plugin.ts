import { brightRed, green } from "https://deno.land/std@0.129.0/fmt/colors.ts";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.21-alpha/deno-dom-wasm.ts";
import { format } from "https://deno.land/std@0.129.0/datetime/mod.ts";
import { Manager } from "../module/deno/vrchat-osc-manager.ts";

interface Options {
  id: string;
}

const manager = new Manager();
await manager.connect();
const options: Options = await manager.getOptions();

if (!options.id) {
  console.log(brightRed("No widget id found"));
  Deno.exit(5);
}

const resp = await fetch("https://app.hyperate.io/" + options.id, {
  method: "GET",
  headers: {
    "User-Agent":
      `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.51 Safari/537.36`,
    Host: "app.hyperate.io",
  },
});
const body = await resp.text();

let cookies = "";
resp.headers
  .get("set-cookie")
  ?.split(",")
  .filter((c) => c.indexOf("GMT") == -1)
  .map((c) => c.split(";")[0].split("="))
  .forEach(([k, v]) => (cookies += `${k}=${v};`));

const dom = new DOMParser().parseFromString(body, "text/html");
const csrf_token = dom?.querySelector(`meta[name=csrf-token]`)?.attributes[
  "content"
]!;
const view = dom?.querySelector(`[data-phx-view]`);
const phx_join = JSON.stringify([
  "4",
  "4",
  "lv:" + view?.attributes["id"],
  "phx_join",
  {
    url: "https://app.hyperate.io/" + options.id,
    params: {
      _csrf_token: csrf_token,
      _mounts: 0,
    },
    session: view?.attributes["data-phx-session"],
    static: view?.attributes["data-phx-static"],
  },
]);

let ws: WebSocketStream;
let hr: number;
async function start() {
  ws = new WebSocketStream(
    `wss://app.hyperate.io/live/websocket?_csrf_token=${csrf_token}&_mounts=0&vsn=2.0.0`,
    { headers: { Cookie: cookies } },
  );

  const { readable, writable } = await ws.connection;
  const writer = writable.getWriter();

  const heartbeat = () =>
    writer.write(JSON.stringify([null, "5", "phoenix", "heartbeat", {}]));

  setTimeout((_) => writer.write(phx_join), 100);

  let isFirst = true;
  for await (const message of readable) {
    const info = JSON.parse(message as string);
    if (info.length === 5) {
      const nt = brightRed(format(new Date(), "MM-dd HH:mm:ss"));
      switch (info[3]) {
        case "diff":
          hr = info[4].e[0][1].heartbeat;
          console.log(nt, "Heart Rate:", hr);
          manager.send("/avatar/parameters/OSC_HeartRate", hr / (220 / 2) - 1);
          break;

        case "phx_reply":
          if (!isFirst) break;
          console.log(green("HypeRate Connected"));
          isFirst = false;
          heartbeat();
          setInterval(heartbeat, 30000);
          break;

        default:
          console.log(message);
          break;
      }
    }
  }

  const { code, reason } = await ws.closed;
  console.log(code, reason);
}
start();

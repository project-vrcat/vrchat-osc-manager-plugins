import { brightRed, green } from "https://deno.land/std@0.129.0/fmt/colors.ts";
import { format } from "https://deno.land/std@0.129.0/datetime/mod.ts";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.21-alpha/deno-dom-wasm.ts";
import WS from "https://deno.land/x/custom_socket@1.1.0/mod.ts";
import { Manager, plugin } from "../module/deno/vrchat-osc-manager-deno.ts";

interface Options {
  id: string;
}

const manager = new Manager();
await manager.connect();
const options: Options = await manager.getOptions();

if (!options.id) {
  console.log(plugin, brightRed("No widget id found"));
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
const csrf_token = dom?.querySelector(`meta[name=csrf-token]`)
  ?.attributes["content"]!;
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

let ws: WS;
let hr: number;
function start() {
  ws = new WS(
    `wss://app.hyperate.io/live/websocket?_csrf_token=${csrf_token}&_mounts=0&vsn=2.0.0`,
    { Cookie: cookies },
  );
  ws.onopen = () => {
    console.log(plugin, green("Hyperate Connected"));
    setTimeout((_) => ws.send(phx_join), 100);
  };
  ws.onmessage = (event) => {
    const info = JSON.parse(event.data);
    if (info.length !== 5) return;
    switch (info[3]) {
      case "diff":
        hr = info[4].e[0][1].heartbeat;
        console.log(
          plugin,
          brightRed(format(new Date(), "MM-dd HH:mm")),
          "Heart Rate:",
          hr,
        );
        manager.send("/avatar/parameters/OSC_HeartRate", hr / (220 / 2) - 1);
        break;

      default:
        break;
    }
  };
  ws.onclose = () => setTimeout(start, 1000);
  ws.onerror = () => setTimeout(start, 1000);
}
start();

setTimeout((_) => {
  if (!(ws != null && ws.readyState === 1)) return;
  try {
    ws.send(JSON.stringify([null, "5", "phoenix", "heartbeat", {}]));
  } catch (error) {
    console.log(error);
  }
}, 30000);

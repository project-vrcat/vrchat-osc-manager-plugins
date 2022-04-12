import WebSocket from "ws";
import chalk from "chalk";
import fetch from "node-fetch";
import { format } from "date-fns";
import { load as loadDOM } from "cheerio";
import { Manager } from "../module/node/vrchat-osc-manager";

interface Options {
  id: string;
}

async function main() {
  const manager = new Manager();
  await manager.connect();
  const options: Options = await manager.getOptions();

  if (!options.id) {
    console.log(chalk.redBright("No widget id found"));
    process.exit(5);
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

  const $ = loadDOM(body);
  const csrf_token = $(`meta[name=csrf-token]`).attr("content");
  const view = $(`[data-phx-view]`);
  const phx_join = JSON.stringify([
    "4",
    "4",
    "lv:" + view.attr("id"),
    "phx_join",
    {
      url: "https://app.hyperate.io/" + options.id,
      params: {
        _csrf_token: csrf_token,
        _mounts: 0,
      },
      session: view.attr("data-phx-session"),
      static: view.attr("data-phx-static"),
    },
  ]);

  let ws: WebSocket;
  let hr: number;
  const start = () => {
    ws = new WebSocket(
      `wss://app.hyperate.io/live/websocket?_csrf_token=${csrf_token}&_mounts=0&vsn=2.0.0`,
      { headers: { Cookie: cookies } },
    );
    ws.onopen = () => {
      console.log(chalk.green("Hyperate Connected"));
      setTimeout((_) => ws.send(phx_join), 100);
    };
    ws.onmessage = (event) => {
      const info = JSON.parse(event.data as string);
      if (info.length !== 5) return;
      switch (info[3]) {
        case "diff":
          hr = info[4].e[0][1].heartbeat;
          console.log(
            chalk.redBright(format(new Date(), "MM-dd HH:mm:ss")),
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
  };
  start();

  setTimeout(() => {
    if (!(ws != null && ws.readyState === 1)) return;
    try {
      ws.send(JSON.stringify([null, "5", "phoenix", "heartbeat", {}]));
    } catch (error) {
      console.log(error);
    }
  }, 30000);
}

main();

import { parse } from "https://deno.land/std@0.118.0/flags/mod.ts";
import { green, yellow } from "https://deno.land/std@0.129.0/fmt/colors.ts";
import {
  pluginName,
  register,
  send,
} from "../module/deno/vrchat-osc-manager-deno.ts";

const args = parse(Deno.args);

register();

let ws: WebSocket;
const ramielUrl: string = await getRamielUrl(args.id);

async function getRamielUrl(widgetId: string): Promise<string> {
  const info = await fetch("https://pulsoid.net/v1/api/public/rpc", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      method: "getWidget",
      jsonrpc: "2.0",
      params: { widgetId: widgetId },
      id: crypto.randomUUID(),
    }),
  }).then((resp) => resp.json());
  return info.result.ramielUrl;
}

function start() {
  ws = new WebSocket(ramielUrl);
  ws.onopen = () => {
    console.log(yellow(`[${pluginName}]`), green("Pulsoid Connected"));
  };
  ws.onmessage = (event) => {
    const info = JSON.parse(event.data);
    console.log(
      yellow(`[${pluginName}]`),
      new Date(),
      "Heart Rate:",
      info.data.heartRate,
    );
    send(
      "/avatar/parameters/OSC_HeartRate",
      info.data.heartRate / (220 / 2) - 1,
    );
  };
  ws.onclose = () => setTimeout(start, 1000);
  ws.onerror = () => setTimeout(start, 1000);
}

start();

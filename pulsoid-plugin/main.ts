import { parse } from "https://deno.land/std@0.118.0/flags/mod.ts";
import { green } from "https://deno.land/std@0.129.0/fmt/colors.ts";
import {
  plugin,
  register,
  send,
} from "../module/deno/vrchat-osc-manager-deno.ts";

const args = parse(Deno.args);

register();

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

let ws = new WebSocket(ramielUrl);

function reconnect(old: WebSocket) {
  console.log(plugin, green("Pulsoid Reconnect"));
  ws = new WebSocket(ramielUrl);
  ws.onopen = old.onopen;
  ws.onmessage = old.onmessage;
  ws.onclose = old.onclose;
}

ws = new WebSocket(ramielUrl);
ws.onopen = () => console.log(plugin, green("Pulsoid Connected"));
ws.onmessage = (event: MessageEvent) => {
  const info = JSON.parse(event.data);
  const hr = info.data.heartRate;
  console.log(plugin, new Date(), "Heart Rate:", hr);
  send("/avatar/parameters/OSC_HeartRate", hr / (220 / 2) - 1);
};
ws.onclose = () => setTimeout((_) => reconnect(ws), 1000);

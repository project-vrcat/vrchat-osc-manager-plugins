import { brightRed, green } from "https://deno.land/std@0.129.0/fmt/colors.ts";
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

const ramielUrl: string = await getRamielUrl(options.id);
if (!ramielUrl) {
  console.log(brightRed("No pulsoid url found"));
  Deno.exit(5);
}

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
  console.log(green("Pulsoid Reconnect"));
  ws = new WebSocket(ramielUrl);
  ws.onopen = old.onopen;
  ws.onmessage = old.onmessage;
  ws.onclose = old.onclose;
}

ws = new WebSocket(ramielUrl);
ws.onopen = () => console.log(green("Pulsoid Connected"));
ws.onmessage = (event: MessageEvent) => {
  const info = JSON.parse(event.data);
  const hr = info.data.heartRate;
  const nt = brightRed(format(new Date(), "MM-dd HH:mm:ss"));
  console.log(nt, "Heart Rate:", hr);
  manager.send("/avatar/parameters/OSC_HeartRate", hr / (220 / 2) - 1);
};
ws.onclose = () => setTimeout((_) => reconnect(ws), 1000);

import { green, yellow } from "https://deno.land/std@0.129.0/fmt/colors.ts";

let ws: WebSocket;
let address: string;
export const pluginName = Deno.env.get("VRCOSCM_PLUGIN");
export const plugin = yellow(`[${pluginName}]`);

function reconnect(old: WebSocket) {
  console.log(plugin, green("Manager Reconnect"));
  ws = new WebSocket(address);
  ws.onopen = old.onopen;
  ws.onmessage = old.onmessage;
  ws.onclose = old.onclose;
}

export function register(
  hostname = Deno.env.get("VRCOSCM_HOSTNAME") ?? "localhost",
  port = parseInt(Deno.env.get("VRCOSCM_PORT") ?? "8787"),
) {
  address = `ws://${hostname}:${port}`;
  ws = new WebSocket(address);
  ws.onopen = () => console.log(plugin, green("Manager Connected"));
  ws.onclose = () => setTimeout((_) => reconnect(ws), 1000);
}

export function send(addr: string, value: string | number | boolean) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ method: "send", addr, value }));
  }
}

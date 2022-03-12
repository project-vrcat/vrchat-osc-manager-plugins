import { green, yellow } from "https://deno.land/std@0.129.0/fmt/colors.ts";

let ws: WebSocket;
let address: string;
export const pluginName = Deno.env.get("VRCOSCM_PLUGIN");

function connect() {
  ws = new WebSocket(address);
  ws.onopen = () => {
    console.log(yellow(`[${pluginName}]`), green("Manager Connected"));
  };
  ws.onclose = () => setTimeout(connect, 1000);
}

export function register(
  hostname = Deno.env.get("VRCOSCM_HOSTNAME") ?? "localhost",
  port = parseInt(Deno.env.get("VRCOSCM_PORT") ?? "8787"),
) {
  address = `ws://${hostname}:${port}`;
  connect();
}

export function send(addr: string, value: string | number | boolean) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ method: "send", addr, value }));
  }
}
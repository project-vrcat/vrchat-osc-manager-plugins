// deno-lint-ignore-file no-explicit-any
import { green } from "https://deno.land/std@0.129.0/fmt/colors.ts";
import { EventEmitter } from "https://deno.land/x/event@2.0.0/mod.ts";

export const pluginName = Deno.env.get("VRCOSCM_PLUGIN");

type value = string | number | boolean;

type Events = {
  parameters: [name: string, value: value[]];
  options: [Record<string, any>];
};

interface ManagerEvent {
  method: string;
  plugin: string;
  options: Record<string, any>;
  parameterName: string;
  parameterValue: value[];
}

export class Manager extends EventEmitter<Events> {
  public address: string;
  private ws: WebSocket | undefined;

  constructor(
    private addr: string = Deno.env.get("VRCOSCM_WS_ADDR") ?? "localhost:8787",
  ) {
    super();
    const params = new URLSearchParams();
    params.append("plugin", pluginName!);
    this.address = `ws://${this.addr}/?${params.toString()}`;
  }

  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.address);
      this.ws.onopen = () => {
        console.log(green("Manager Connected"));
        resolve();
      };
      this.ws.onmessage = (event: MessageEvent) => {
        if (!event.data) return;
        const m = JSON.parse(event.data) as ManagerEvent;
        switch (m.method) {
          case "get_options":
            this.emit("options", m.options);
            break;
          case "parameters":
            this.emit("parameters", m.parameterName, m.parameterValue);
            break;
          default:
            break;
        }
      };
      this.ws.onerror = (err) => reject(err);
      this.ws.onclose = () => setTimeout((_) => this.reconnect(), 1000);
    });
  }

  private reconnect() {
    const old = this.ws!;
    console.log(green("Manager Reconnect"));
    this.ws = new WebSocket(this.address);
    this.ws.onopen = old.onopen;
    this.ws.onmessage = old.onmessage;
    this.ws.onclose = old.onclose;
  }

  private wsSend(data: any) {
    (this.ws?.readyState === WebSocket.OPEN) &&
      this.ws.send(JSON.stringify(data));
  }

  getOptions(): Promise<Record<string, any>> {
    return new Promise((resolve) => {
      this.once("options", (options) => resolve(options));
      this.wsSend({ method: "get_options", plugin: pluginName });
    });
  }

  send(addr: string, value: string | number | boolean) {
    this.wsSend({ method: "send", plugin: pluginName, addr, value });
  }

  listenParameters(p: string[]) {
    this.wsSend({
      method: "listen_parameters",
      plugin: pluginName,
      parameters: p,
    });
  }
}

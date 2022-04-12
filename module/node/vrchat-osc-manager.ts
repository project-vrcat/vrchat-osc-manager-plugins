import WebSocket from "ws";
import chalk from "chalk";

export const pluginName = process.env.VRCOSCM_PLUGIN;

interface Pool {
  resolve: (value: void | PromiseLike<void>) => void;
  reject: (reason?: any) => void;
  pp: (data: any) => any;
}

export class Manager {
  public address: string;
  private ws: WebSocket | undefined;
  private pool: Record<string, Pool>; // 不可靠, 但能用 ¯\_(ツ)_/¯

  constructor(
    private addr: string = process.env.VRCOSCM_WS_ADDR ?? "localhost:8787",
  ) {
    this.address = `ws://${this.addr}`;
    this.pool = {};
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.address);
      this.ws.onopen = () => {
        console.log(chalk.green("Manager Connected"));
        resolve();
      };
      this.ws.onmessage = (event: MessageEvent) => {
        if (!event.data) return;
        const m = JSON.parse(event.data);
        if (m.method in this.pool) {
          this.pool[m.method].resolve(this.pool[m.method].pp(m));
          delete this.pool[m.method];
        }
      };
      this.ws.onerror = (err) => reject(err);
      this.ws.onclose = () => setTimeout((_) => this.reconnect(), 1000);
    });
  }

  reconnect() {
    const old = this.ws!;
    console.log(chalk.green("Manager Reconnect"));
    this.ws = new WebSocket(this.address);
    this.ws.onopen = old.onopen;
    this.ws.onmessage = old.onmessage;
    this.ws.onclose = old.onclose;
  }

  private wsSend(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  getOptions(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.pool["get_options"] = {
        resolve,
        reject,
        pp: (data: any) => data.options,
      };
      this.wsSend({ method: "get_options", plugin: pluginName });
    });
  }

  send(addr: string, value: string | number | boolean) {
    this.wsSend({ method: "send", plugin: pluginName, addr, value });
  }
}

// deno-lint-ignore-file
import { ShioriData } from "./shiori.ts";
import { Manager } from "../module/deno/vrchat-osc-manager.ts";
import qrcode from "https://deno.land/x/qrcode_terminal@v1.1.1/mod.js";

const manager = new Manager();
await manager.connect();
const options = await manager.getOptions();
const port = options?.server_port ?? 12345;
let lastData: ShioriData;

const ip = await getLocalIP();
console.log(`Addr: ${ip} Port: ${port}`);
qrcode.generate(JSON.stringify({ port: `${port}`, IP_Dict: { "1": ip } }));

const listener = Deno.listen({ hostname: "0.0.0.0", port: Number(port) });
for await (const conn of listener) {
  handleConn(conn);
}

async function handleConn(conn: Deno.Conn) {
  const httpConn = Deno.serveHttp(conn);

  for await (const e of httpConn) {
    e.respondWith(handle(e.request));
  }
}

function handle(req: Request) {
  if (req.headers.get("upgrade") != "websocket") {
    return new Response("not trying to upgrade as websocket.");
  }
  const { socket, response } = Deno.upgradeWebSocket(req);
  socket.onopen = () => console.log("socket opened");
  socket.onmessage = (e: MessageEvent) => {
    const info = new ShioriData(e.data);
    if (lastData) {
      info.eyeLOpen !== lastData.eyeLOpen &&
        sendParam("EyeOpenR", info.eyeLOpen);
      info.eyeROpen !== lastData.eyeROpen &&
        sendParam("EyeOpenL", info.eyeROpen);
      info.mouthOpen !== lastData.mouthOpen &&
        sendParam("MouthOpen", info.mouthOpen);
      if (info.mouthForm !== lastData.mouthForm) {
        sendParam("MouthForm", info.mouthForm > 0 ? 1 : 0);
        sendParam(
          "MouthFormW",
          info.mouthForm > 0 ? info.mouthForm : -info.mouthForm
        );
      }
    }
    lastData = info;
  };
  //@ts-ignore
  socket.onerror = (e) => console.log("socket errored:", e.message);
  socket.onclose = () => console.log("socket closed");

  return response;
}

function sendParam(name: string, value: any) {
  manager.send(`/avatar/parameters/${name}`, value);
}

async function getLocalIP() {
  const p = Deno.run({
    cmd: ["ipconfig"],
    stdout: "piped",
  });
  const r = await p.output();
  Deno.close(p.rid);
  const addrs =
    /((2(5[0-5]|[0-4]\d))|[0-1]?\d{1,2})(\.((2(5[0-5]|[0-4]\d))|[0-1]?\d{1,2})){3}/g.exec(
      new TextDecoder().decode(r)
    );
  return addrs?.[0];
}

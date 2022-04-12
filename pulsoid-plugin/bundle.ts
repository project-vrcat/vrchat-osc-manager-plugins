import * as esbuild from "https://deno.land/x/esbuild@v0.14.36/mod.js";

const p = Deno.run({
  cmd: ["deno", "bundle", "pulsoid-plugin.ts"],
  stdout: "piped",
});

const code = new TextDecoder().decode(await p.output());
const result = await esbuild.transform(code, { loader: "js", minify: true });
Deno.writeFileSync(
  "./pulsoid-plugin.js",
  new TextEncoder().encode(result.code),
);
esbuild.stop();

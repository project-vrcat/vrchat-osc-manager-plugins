import * as esbuild from "https://deno.land/x/esbuild@v0.14.36/mod.js";

const p = Deno.run({
  cmd: ["deno", "bundle", "--unstable", "plugin.ts"],
  stdout: "piped",
});

// Deno.writeFileSync("./plugin.js", await p.output());

const code = new TextDecoder().decode(await p.output());
const result = await esbuild.transform(code, { loader: "js", minify: true });
Deno.writeFileSync("./plugin.js", new TextEncoder().encode(result.code));
esbuild.stop();

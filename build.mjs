import { fileURLToPath } from "node:url";
import { build } from "@neoworks/svelte-gtk4/build.mjs";

const here = (path) => fileURLToPath(new URL(path, import.meta.url));

await build({
  entry: here("./src/main.ts"),
  outfile: here("./dist/neoshell.js"),
});

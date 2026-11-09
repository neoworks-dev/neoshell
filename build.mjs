import { fileURLToPath } from "node:url";
import { build, buildClient } from "@neoworks/svelte-gtk4/build.mjs";
import { clientEntries } from "./clients.mjs";

const here = (path) => fileURLToPath(new URL(path, import.meta.url));

await build({
  entry: here("./src/main.ts"),
  outfile: here("./dist/neoshell.js"),
});

for (const client of clientEntries()) {
  await buildClient(client);
}

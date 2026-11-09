import { copyFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { build, buildClient } from "@neoworks/svelte-gtk4/build.mjs";
import { buildWidget } from "./sdk/build.mjs";
import { clientEntries } from "./clients.mjs";

const here = (path) => fileURLToPath(new URL(path, import.meta.url));

await build({
  entry: here("./src/smoke.ts"),
  outfile: here("./dist/smoke.js"),
});

// The smoke draws a card through its client too.
for (const client of clientEntries()) {
  await buildClient(client);
}

// An installed program's extension, laid out the way it would be under
// ~/.local/share/neoshell/extensions and built with the SDK.
const external = here("./dist/external/dev.neoworks.smoke");
mkdirSync(external, { recursive: true });
copyFileSync(here("./fixtures/external/dev.neoworks.smoke/manifest.json"), `${external}/manifest.json`);
await buildWidget({
  entry: here("./fixtures/external/dev.neoworks.smoke/client.ts"),
  outfile: `${external}/client.js`,
});

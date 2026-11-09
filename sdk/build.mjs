// Bundles a widget's client.ts into the one client.js the shell runs in its
// sandboxed runner: no imports left, no gi:// anywhere.

import { buildClient } from "@neoworks/svelte-gtk4/build.mjs";

export async function buildWidget({ entry, outfile }) {
  await buildClient({ entry, outfile });
}

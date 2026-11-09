// The client bundles: every extension with a client.ts gets one, at
// dist/clients/<extension>.js, which the shell runs in the QuickJS runner.

import { existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const here = (path) => fileURLToPath(new URL(path, import.meta.url));

export function clientEntries() {
  const extensions = here("./src/extensions");
  return readdirSync(extensions, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(`${extensions}/${entry.name}/client.ts`))
    .map((entry) => ({
      entry: `${extensions}/${entry.name}/client.ts`,
      outfile: here(`./dist/clients/${entry.name}.js`),
    }));
}

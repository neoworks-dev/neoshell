// The client bundles, which the shell runs in the QuickJS runner: an
// extension's client.ts becomes dist/clients/<extension>.js, and each of its
// clients/<name>.ts becomes dist/clients/<extension>-<name>.js.

import { existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const here = (path) => fileURLToPath(new URL(path, import.meta.url));

export function clientEntries() {
  const extensions = here("./src/extensions");
  return readdirSync(extensions, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => entriesOf(`${extensions}/${entry.name}`, entry.name));
}

function entriesOf(directory, extension) {
  const entries = [];
  if (existsSync(`${directory}/client.ts`)) {
    entries.push(entryFor(`${directory}/client.ts`, extension));
  }
  if (!existsSync(`${directory}/clients`)) {
    return entries;
  }
  for (const file of readdirSync(`${directory}/clients`)) {
    if (file.endsWith(".ts")) {
      entries.push(entryFor(`${directory}/clients/${file}`, `${extension}-${file.slice(0, -3)}`));
    }
  }
  return entries;
}

function entryFor(entry, name) {
  return { entry, outfile: here(`./dist/clients/${name}.js`) };
}

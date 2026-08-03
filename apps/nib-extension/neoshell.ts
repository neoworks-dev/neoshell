/**
 * neoshell's desktop-control tools, as a nib extension.
 *
 * Nothing here is special-cased inside nib. The shell publishes its capability
 * registry over HTTP, and this file turns each action into an ordinary
 * registerTool call — so a capability added in Go appears as a tool with no
 * change on either side, and the shell's own approval policy travels with it.
 *
 * The file lives in the neoshell repository and is symlinked into
 * ~/.nib/extensions, which nib trusts because it is inside its own data
 * directory. Everything the extension needs arrives on the `nib` object:
 * an extension is outside any node_modules tree, so a runtime import would
 * either fail to resolve or find an unrelated package of the same name.
 */

/**
 * The slice of nib's ExtensionAPI this file uses.
 *
 * Declared locally rather than imported: nib may be checked out anywhere, and a
 * relative `import type` across repositories would break the moment someone
 * moved it. Only these five members are touched, so the risk of drifting from
 * the real interface is small and would surface immediately at load.
 */
interface ExtensionAPI {
  registerTool(tool: unknown): void;
  log(...values: unknown[]): void;
  readonly z: any;
  readonly defineTool: <T>(tool: T) => T;
  readonly ToolError: new (message: string) => Error;
}

/** How the shell describes one action parameter. */
interface ParamSpec {
  type: "string" | "number" | "integer" | "boolean" | "array";
  description: string;
  required: boolean;
}

/** One capability action, as served by GET /capabilities. */
interface ActionSpec {
  name: string;
  tool: string;
  description: string;
  policy: "allow" | "ask";
  params: Record<string, ParamSpec>;
}

const BASE = process.env.NEOSHELL_URL ?? "http://127.0.0.1:9876";
const TOKEN = process.env.NEOSHELL_TOKEN ?? "";

/**
 * How long to keep looking for the shell before giving up.
 *
 * The shell binds its listener before spawning nib, so in the normal case the
 * first attempt succeeds. This covers the other order: a developer running nib
 * by hand, or a shell still coming up after a crash.
 */
const DISCOVERY_ATTEMPTS = 40;
const DISCOVERY_INTERVAL_MS = 250;

export default async function neoshell(nib: ExtensionAPI): Promise<void> {
  if (TOKEN === "") {
    nib.log("no NEOSHELL_TOKEN in the environment; not registering desktop tools");
    return;
  }

  const actions = await discover(nib);
  if (actions.length === 0) {
    nib.log(`no capabilities from ${BASE}; not registering desktop tools`);
    return;
  }

  for (const action of actions) {
    nib.registerTool(
      nib.defineTool({
        // Namespaced so a shell action can never shadow a builtin, and
        // colon-free because tool names forbid it.
        name: `neoshell_${action.tool}`,
        description: action.description,
        schema: schemaOf(nib, action.params),
        policy: action.policy,
        // Only read-only actions are safe to run concurrently. Two window
        // moves racing each other would fight over the same layout.
        parallelSafe: action.policy === "allow",
        display: { label: action.name, input: "json", result: "text" },
        async execute(input: unknown, context: { signal: AbortSignal }) {
          return { content: await invoke(nib, action.name, input, context.signal) };
        },
      }),
    );
  }

  nib.log(`registered ${actions.length} desktop tools from ${BASE}`);
}

/** Builds a zod schema from the shell's parameter descriptions. */
function schemaOf(nib: ExtensionAPI, params: Record<string, ParamSpec>) {
  const z = nib.z;
  const shape: Record<string, any> = {};

  for (const [name, spec] of Object.entries(params)) {
    let field;
    switch (spec.type) {
      case "number":
        field = z.number();
        break;
      case "integer":
        field = z.number().int();
        break;
      case "boolean":
        field = z.boolean();
        break;
      case "array":
        field = z.array(z.string());
        break;
      default:
        field = z.string();
    }
    field = field.describe(spec.description);
    shape[name] = spec.required ? field : field.optional();
  }

  return z.object(shape);
}

/** Runs one action against the shell. */
async function invoke(
  nib: ExtensionAPI,
  name: string,
  input: unknown,
  signal: AbortSignal,
): Promise<string> {
  let response: Response;
  try {
    response = await fetch(`${BASE}/capabilities/invoke`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${TOKEN}` },
      // The canonical object:verb name, not the sanitized tool alias — the
      // shell resolves either, but sending what it actually calls the action
      // keeps its logs readable.
      body: JSON.stringify({ name, arguments: input ?? {} }),
      signal,
    });
  } catch (error) {
    throw new nib.ToolError(
      `the desktop shell is unreachable (${error instanceof Error ? error.message : String(error)})`,
    );
  }

  if (!response.ok) {
    throw new nib.ToolError(`${name}: the shell answered ${response.status}`);
  }

  const result = (await response.json()) as { text?: string; error?: string };
  if (result.error) {
    // A refused action is something the model should read and work around, so
    // it comes back as a tool error rather than a transport failure.
    throw new nib.ToolError(result.error);
  }
  return result.text ?? "";
}

/** Fetches the action list, waiting for the shell if it is not up yet. */
async function discover(nib: ExtensionAPI): Promise<ActionSpec[]> {
  for (let attempt = 0; attempt < DISCOVERY_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(`${BASE}/capabilities`, {
        headers: { authorization: `Bearer ${TOKEN}` },
      });
      if (response.ok) {
        const body = (await response.json()) as { actions?: ActionSpec[] };
        return body.actions ?? [];
      }
      if (response.status === 401) {
        // Retrying will not fix a wrong token, and doing so quietly for ten
        // seconds would hide the real problem.
        nib.log("the desktop shell rejected our token");
        return [];
      }
    } catch {
      // Not listening yet. Keep waiting.
    }
    await Bun.sleep(DISCOVERY_INTERVAL_MS);
  }
  return [];
}

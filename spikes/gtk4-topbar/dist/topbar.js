// src/topbar.ts
import Gtk from "gi://Gtk?version=4.0";
import Gdk from "gi://Gdk?version=4.0";
import GLib2 from "gi://GLib";
import Gio2 from "gi://Gio";
import LayerShell from "gi://Gtk4LayerShell?version=1.0";

// src/bus.ts
import GLib from "gi://GLib";
import Gio from "gi://Gio";
var BusClient = class {
  #output = null;
  #input = null;
  #handlersByPattern = /* @__PURE__ */ new Map();
  #replyCounter = 0;
  get connected() {
    return this.#output !== null;
  }
  open(socketPath) {
    const connection = openConnection(socketPath);
    if (connection === null) {
      return false;
    }
    this.#output = connection.get_output_stream();
    this.#input = new Gio.DataInputStream({ base_stream: connection.get_input_stream() });
    this.#readNextLine();
    return true;
  }
  subscribe(pattern, handler) {
    const handlers = this.#handlersByPattern.get(pattern);
    if (handlers !== void 0) {
      handlers.push(handler);
      return;
    }
    this.#handlersByPattern.set(pattern, [handler]);
    this.#send({ subscribe: [pattern] });
  }
  publish(type, data) {
    this.#send({ type, data });
  }
  // Fire-and-forget request: the spike never reads a reply back, but the host
  // still routes it as a function call rather than a broadcast.
  call(type, data) {
    this.#replyCounter += 1;
    this.#send({ type, data, replyTo: `r-${this.#replyCounter}` });
  }
  #send(message) {
    if (this.#output === null) {
      return;
    }
    this.#output.write_all(`${JSON.stringify(message)}
`, null);
  }
  #readNextLine() {
    if (this.#input === null) {
      return;
    }
    this.#input.read_line_async(GLib.PRIORITY_DEFAULT, null, (stream, result) => {
      const line = finishLine(stream, result);
      if (line === null) {
        return;
      }
      this.#dispatch(line);
      this.#readNextLine();
    });
  }
  #dispatch(line) {
    const message = parseMessage(line);
    if (message === null) {
      return;
    }
    for (const [pattern, handlers] of this.#handlersByPattern) {
      deliverIfMatched(pattern, handlers, message);
    }
  }
};
function openConnection(socketPath) {
  if (!GLib.file_test(socketPath, GLib.FileTest.EXISTS)) {
    return null;
  }
  try {
    const client = new Gio.SocketClient();
    return client.connect(Gio.UnixSocketAddress.new(socketPath), null);
  } catch (error) {
    logError(error, `bus: connect to ${socketPath} failed`);
    return null;
  }
}
function finishLine(stream, result) {
  if (stream === null) {
    return null;
  }
  try {
    const [line] = stream.read_line_finish_utf8(result);
    return line;
  } catch (error) {
    logError(error, "bus: read failed");
    return null;
  }
}
function parseMessage(line) {
  try {
    const parsed = JSON.parse(line);
    if (typeof parsed.type !== "string") {
      return null;
    }
    return { type: parsed.type, data: parsed.data };
  } catch {
    return null;
  }
}
function deliverIfMatched(pattern, handlers, message) {
  if (!topicMatches(pattern, message.type)) {
    return;
  }
  for (const handler of handlers) {
    handler(message);
  }
}
function topicMatches(pattern, topic) {
  if (!pattern.endsWith("*")) {
    return pattern === topic;
  }
  return topic.startsWith(pattern.slice(0, -1));
}
function busSocketPath() {
  const runtimeDir = GLib.getenv("XDG_RUNTIME_DIR");
  if (runtimeDir !== null && runtimeDir !== "") {
    return `${runtimeDir}/neoshell-host.sock`;
  }
  return `/run/user/${GLib.get_user_name()}/neoshell-host.sock`;
}

// src/hypr.ts
function recordOf(value) {
  if (typeof value !== "object" || value === null) {
    return {};
  }
  return value;
}
function workspacesOf(data) {
  if (!Array.isArray(data)) {
    return [];
  }
  const entries = [];
  for (const raw of data) {
    pushWorkspace(entries, recordOf(raw));
  }
  return entries.sort((left, right) => left.id - right.id);
}
function pushWorkspace(entries, record) {
  if (typeof record.id !== "number" || record.id <= 0) {
    return;
  }
  entries.push({
    id: record.id,
    name: workspaceNameOf(record),
    occupied: windowCountOf(record) > 0
  });
}
function workspaceNameOf(record) {
  if (typeof record.name === "string" && record.name !== "") {
    return record.name;
  }
  return String(record.id);
}
function windowCountOf(record) {
  if (typeof record.windows === "number") {
    return record.windows;
  }
  return 0;
}
function activeIdOf(data) {
  const id = recordOf(data).id;
  if (typeof id === "number") {
    return id;
  }
  return -1;
}
function windowWorkspacesOf(data) {
  const byAddress = /* @__PURE__ */ new Map();
  if (!Array.isArray(data)) {
    return byAddress;
  }
  for (const raw of data) {
    addWindowWorkspace(byAddress, recordOf(raw));
  }
  return byAddress;
}
function addWindowWorkspace(byAddress, record) {
  const workspaceId = recordOf(record.workspace).id;
  if (typeof record.address !== "string" || typeof workspaceId !== "number") {
    return;
  }
  byAddress.set(bareAddress(record.address), workspaceId);
}
function bareAddress(value) {
  if (value.startsWith("0x")) {
    return value.slice(2);
  }
  return value;
}
function urgentAddressOf(data) {
  const record = recordOf(data);
  if (record.event !== "urgent" || typeof record.data !== "string") {
    return null;
  }
  return bareAddress(record.data);
}

// src/topbar.ts
var BAR_HEIGHT = 30;
var CENTER_GAP = 320;
var WorkspaceStrip = class {
  widget = new Gtk.Box({
    orientation: Gtk.Orientation.HORIZONTAL,
    spacing: 4,
    valign: Gtk.Align.CENTER
  });
  #bus;
  #workspaces = [];
  #activeId = -1;
  #urgentIds = /* @__PURE__ */ new Set();
  #workspaceByWindowAddress = /* @__PURE__ */ new Map();
  constructor(bus) {
    this.#bus = bus;
    bus.subscribe("hypr.workspaces", (message) => this.#setWorkspaces(message));
    bus.subscribe("hypr.activeworkspace", (message) => this.#setActive(message));
    bus.subscribe("hypr.windows", (message) => this.#setWindows(message));
    bus.subscribe("hypr.event", (message) => this.#markUrgent(message));
  }
  setWorkspaces(workspaces, activeId) {
    this.#workspaces = workspaces;
    this.#activeId = activeId;
    this.#rebuild();
  }
  #setWorkspaces(message) {
    this.#workspaces = workspacesOf(message.data);
    this.#rebuild();
  }
  #setActive(message) {
    this.#activeId = activeIdOf(message.data);
    this.#urgentIds.delete(this.#activeId);
    this.#rebuild();
  }
  #setWindows(message) {
    this.#workspaceByWindowAddress = windowWorkspacesOf(message.data);
  }
  #markUrgent(message) {
    const address = urgentAddressOf(message.data);
    if (address === null) {
      return;
    }
    const workspaceId = this.#workspaceByWindowAddress.get(address);
    if (workspaceId === void 0 || workspaceId === this.#activeId) {
      return;
    }
    this.#urgentIds.add(workspaceId);
    this.#rebuild();
  }
  #rebuild() {
    removeChildren(this.widget);
    for (const workspace of this.#workspaces) {
      this.widget.append(this.#buttonFor(workspace));
    }
  }
  #buttonFor(workspace) {
    const button = new Gtk.Button({ label: workspace.name, has_frame: false });
    button.add_css_class("workspace");
    button.add_css_class(this.#stateOf(workspace));
    button.connect("clicked", () => {
      this.#bus.call("hypr:dispatch", { dispatcher: "workspace", arg: String(workspace.id) });
    });
    return button;
  }
  #stateOf(workspace) {
    if (this.#urgentIds.has(workspace.id)) {
      return "urgent";
    }
    if (workspace.id === this.#activeId) {
      return "active";
    }
    if (workspace.occupied) {
      return "occupied";
    }
    return "empty";
  }
};
var ClockButton = class _ClockButton {
  widget;
  #dateLabel = new Gtk.Label({ label: "" });
  #timeLabel = new Gtk.Label({ label: "" });
  static #DATE_FORMAT = new Intl.DateTimeFormat(void 0, {
    weekday: "short",
    day: "numeric",
    month: "short"
  });
  static #TIME_FORMAT = new Intl.DateTimeFormat(void 0, {
    hour: "2-digit",
    minute: "2-digit"
  });
  constructor(bus) {
    const content = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 8 });
    this.#dateLabel.add_css_class("clock-date");
    content.append(this.#dateLabel);
    content.append(this.#timeLabel);
    this.widget = new Gtk.Button({ child: content, has_frame: false, valign: Gtk.Align.CENTER });
    this.widget.add_css_class("clock");
    this.widget.set_tooltip_text("Quick settings");
    this.widget.connect("clicked", () => bus.publish("quicksettings:toggle", {}));
    this.#tick();
    GLib2.timeout_add_seconds(GLib2.PRIORITY_DEFAULT, 1, () => {
      this.#tick();
      return GLib2.SOURCE_CONTINUE;
    });
  }
  #tick() {
    const now = /* @__PURE__ */ new Date();
    this.#dateLabel.set_label(_ClockButton.#DATE_FORMAT.format(now));
    this.#timeLabel.set_label(_ClockButton.#TIME_FORMAT.format(now));
  }
};
function buildBar(bus) {
  const strip = new WorkspaceStrip(bus);
  if (!bus.connected) {
    strip.setWorkspaces(demoWorkspaces(), 2);
  }
  const gap = new Gtk.Box();
  gap.set_size_request(CENTER_GAP, -1);
  const end = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, halign: Gtk.Align.END });
  end.append(new ClockButton(bus).widget);
  const bar = new Gtk.CenterBox();
  bar.add_css_class("topbar");
  bar.set_start_widget(strip.widget);
  bar.set_center_widget(gap);
  bar.set_end_widget(end);
  return bar;
}
function buildWindow(app, bus) {
  const window = new Gtk.ApplicationWindow({ application: app });
  window.set_default_size(-1, BAR_HEIGHT);
  LayerShell.init_for_window(window);
  LayerShell.set_namespace(window, "neoshell.spike-bar");
  LayerShell.set_layer(window, LayerShell.Layer.TOP);
  LayerShell.set_anchor(window, LayerShell.Edge.TOP, true);
  LayerShell.set_anchor(window, LayerShell.Edge.LEFT, true);
  LayerShell.set_anchor(window, LayerShell.Edge.RIGHT, true);
  LayerShell.set_exclusive_zone(window, BAR_HEIGHT);
  LayerShell.set_keyboard_mode(window, LayerShell.KeyboardMode.ON_DEMAND);
  window.set_child(buildBar(bus));
  return window;
}
function loadStyle() {
  const provider = new Gtk.CssProvider();
  provider.load_from_path(stylePath());
  Gtk.StyleContext.add_provider_for_display(
    Gdk.Display.get_default(),
    provider,
    Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
  );
}
function stylePath() {
  return GLib2.build_filenamev([GLib2.get_current_dir(), "style.css"]);
}
function removeChildren(box) {
  let child = box.get_first_child();
  while (child !== null) {
    const next = child.get_next_sibling();
    box.remove(child);
    child = next;
  }
}
function demoWorkspaces() {
  return [
    { id: 1, name: "1", occupied: true },
    { id: 2, name: "2", occupied: true },
    { id: 3, name: "3", occupied: false },
    { id: 4, name: "4", occupied: false }
  ];
}
function main() {
  const bus = new BusClient();
  const connected = bus.open(busSocketPath());
  if (!connected) {
    print("topbar: host socket not found, showing demo workspaces");
  }
  const app = new Gtk.Application({
    application_id: "dev.neoworks.neoshell.SpikeTopbar",
    flags: Gio2.ApplicationFlags.DEFAULT_FLAGS
  });
  app.connect("activate", () => {
    loadStyle();
    buildWindow(app, bus).present();
  });
  app.run([]);
}
main();

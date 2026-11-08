<script lang="ts">
  import { untrack } from 'svelte'
  import { subscribeTo } from '../../lib/bus'
  import type { ViewProps } from "../../host/plugins/views";
  import { arrayOf, recordOf } from "../../lib/record";
  import { Settings } from "../../lib/settings.svelte";
  import { resolve } from "../../tree";
  import type { NotchWidgetDeclaration } from "../index";
  import {
    NOOK_KEY,
    NOOK_ROW_HEIGHT,
    enabledEntries,
    nookEntries,
    nookWidth,
    widgetWidth,
  } from "./nook";
  import type { NookEntry } from "./nook";

  // The notch: a black cutout welded to the top edge, centred over the bar.
  // Collapsed, it renders one island entry at a time — the highest-priority
  // member of a stack fed by island:show / island:dismiss plus the built-in
  // producers below (focused window, volume, media). Open, it is the Nook: a
  // row of widgets configured in Settings → Notch, and the Tray.
  //
  //   island:show    {id, priority?, label, detail?, progress?, tone?, ttlMs?}
  //   island:dismiss {id}
  //   notch:open / notch:close / notch:toggle
  //
  // It opens on click or hover (notch.openOn) and closes when the pointer
  // leaves it. A right click opens its settings.

  interface IslandEntry {
    id: string;
    priority: number;
    label: string;
    detail: string;
    progress: number;
    tone: string;
    art: string;
  }

  interface Size {
    width: number;
    height: number;
  }

  const PRIORITY_IDLE = 0;
  const PRIORITY_ACTIVITY = 10;
  const PRIORITY_TRANSIENT = 20;
  const PRIORITY_ALERT = 30;

  const TRANSIENT_TTL_MS = 1600;
  const NO_PROGRESS = -1;
  const MEDIA_ID = "media";

  const BAR_HEIGHT = 30;

  const SIZES: Record<string, Size> = {
    empty: { width: 128, height: BAR_HEIGHT },
    rest: { width: 272, height: BAR_HEIGHT },
    active: { width: 320, height: BAR_HEIGHT },
  };

  const HOVER_GROWTH: Size = { width: 12, height: 3 };

  // Mirrors .nook-panel and .nook-header in the stylesheet.
  const NOOK_PADDING = 16;
  const NOOK_HEADER_HEIGHT = 44;
  const EMPTY_NOOK_WIDTH = 320;
  const PROGRESS_MARGIN = 16;

  // The window never resizes: it is the stage the island animates inside.
  // Room for the fillets either side, and for the island's shadow.
  const FILLET_WIDTH = 10;
  const SHADOW_ROOM: Size = { width: 16, height: 28 };

  const HOVER_OPEN_DELAY_MS = 150;
  const LEAVE_CLOSE_DELAY_MS = 350;
  const SECONDARY_BUTTON = 3;

  const TONE_CLASS: Record<string, string> = {
    neutral: "tone-neutral",
    accent: "tone-accent",
    success: "tone-success",
    warning: "tone-warning",
    error: "tone-error",
  };

  const TABS = [
    { id: "nook", label: "Nook", icon: "view-grid-symbolic" },
    { id: "tray", label: "Tray", icon: "folder-symbolic" },
  ];

  let { bus, registry }: ViewProps = $props();

  const settings = new Settings(untrack(() => bus));

  let entries = $state<IslandEntry[]>([]);
  let hovered = $state(false);
  let opened = $state(false);
  let tab = $state("nook");
  let mediaStatus = $state("");
  let catalog = $state<NotchWidgetDeclaration[]>([]);
  // The registry is outside Svelte's reactivity; a Nook widget whose view
  // registers after the notch is up is picked up by bumping this.
  let generation = $state(0);

  const dismissTimers = new Map<string, number>();
  let lastVolumeLevel = "";
  let pointerTimer: number | null = null;

  const current = $derived(topEntry(entries));
  const isMedia = $derived(current !== null && current.id === MEDIA_ID);
  const mode = $derived(modeOf(current, opened));
  const nook = $derived(nookEntries(catalog, settings.value(NOOK_KEY)));
  const shownWidgets = $derived(enabledEntries(nook));
  const openSize = $derived(openSizeOf(nook));
  const size = $derived(sizeOf(mode, hovered, openSize));
  const stage = $derived(stageOf(openSize));
  const openOn = $derived(settings.string("notch.openOn", "click"));

  $effect(() => settings.connect());

  $effect(() =>
    subscribeTo(bus, "notch.catalog", (message) => {
      catalog = arrayOf(recordOf(message.data).widgets).map(declarationOf);
    })
  );

  $effect(() =>
    registry.onChange(() => {
      generation += 1;
    })
  );

  $effect(() => subscribeTo(bus, "notch:open", () => (opened = true)));
  $effect(() => subscribeTo(bus, "notch:close", () => (opened = false)));
  $effect(() => subscribeTo(bus, "notch:toggle", () => (opened = !opened)));

  $effect(() =>
    subscribeTo(bus, "island:show", (message) => {
      const shown = entryFromMessage(message.data);
      if (shown === null) {
        return;
      }
      show(shown.entry, shown.ttlMs);
    })
  );

  $effect(() =>
    subscribeTo(bus, "island:dismiss", (message) => {
      dismiss(stringOf(recordOf(message.data).id));
    })
  );

  // The focused window is the island's resting content: persistent, and the
  // lowest priority, so anything else displaces it while it lasts.
  $effect(() =>
    subscribeTo(bus, "hypr.activewindow", (message) => {
      const record = recordOf(message.data);
      const title = stringOf(record.title);
      if (title === "") {
        dismiss("window");
        return;
      }
      show(
        entryOf({
          id: "window",
          priority: PRIORITY_IDLE,
          label: title,
          detail: appNameOf(record),
        }),
        0,
      );
    })
  );

  // The sink watcher republishes on every pipewire event, and starting a new
  // track is one — so only a level that actually moved surfaces the island.
  $effect(() =>
    subscribeTo(bus, "system.volume", (message) => {
      const record = recordOf(message.data);
      const percent = record.volume;
      if (typeof percent !== "number") {
        return;
      }
      const level = `${percent}:${record.muted === true}`;
      if (level === lastVolumeLevel) {
        return;
      }
      const isFirst = lastVolumeLevel === "";
      lastVolumeLevel = level;
      if (isFirst) {
        return;
      }
      show(volumeEntry(percent, record.muted === true), TRANSIENT_TTL_MS);
    })
  );

  // A loaded track is the island's standing content: above the focused window
  // it displaces, below anything transient that interrupts it.
  $effect(() =>
    subscribeTo(bus, "media.player", (message) => {
      const record = recordOf(message.data);
      const title = stringOf(record.title);
      const status = stringOf(record.status);
      if (title === "" || status === "" || status === "Stopped") {
        dismiss(MEDIA_ID);
        return;
      }
      mediaStatus = status;
      show(
        entryOf({
          id: MEDIA_ID,
          priority: PRIORITY_ACTIVITY,
          label: title,
          detail: stringOf(record.artist),
          art: artSourceOf(stringOf(record.artUrl)),
        }),
        0,
      );
    })
  );

  $effect(() => () => {
    for (const timer of dismissTimers.values()) {
      clearTimeout(timer);
    }
    dismissTimers.clear();
    cancelPointerTimer();
  });

  function dismiss(id: string): void {
    const timer = dismissTimers.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      dismissTimers.delete(id);
    }
    entries = entries.filter((entry) => entry.id !== id);
  }

  function show(entry: IslandEntry, ttlMs: number): void {
    dismiss(entry.id);
    entries = [...entries.filter((e) => e.id !== entry.id), entry];
    if (ttlMs <= 0) {
      return;
    }
    dismissTimers.set(entry.id, setTimeout(() => dismiss(entry.id), ttlMs));
  }

  function pointerEntered(): void {
    hovered = true;
    cancelPointerTimer();
    if (openOn !== "hover" || opened) {
      return;
    }
    pointerTimer = setTimeout(() => (opened = true), HOVER_OPEN_DELAY_MS);
  }

  function pointerLeft(): void {
    hovered = false;
    cancelPointerTimer();
    if (!opened) {
      return;
    }
    pointerTimer = setTimeout(() => (opened = false), LEAVE_CLOSE_DELAY_MS);
  }

  function cancelPointerTimer(): void {
    if (pointerTimer === null) {
      return;
    }
    clearTimeout(pointerTimer);
    pointerTimer = null;
  }

  function pressed(detail: { button: number }): void {
    if (detail.button !== SECONDARY_BUTTON) {
      return;
    }
    opened = false;
    bus.publish("settings:open", { section: "notch" });
  }

  // The stack's winner is the highest priority, ties going to whatever arrived
  // last — a second notification supersedes the one before it.
  function topEntry(stack: IslandEntry[]): IslandEntry | null {
    let best: IslandEntry | null = null;
    for (const entry of stack) {
      if (best === null || entry.priority >= best.priority) {
        best = entry;
      }
    }
    return best;
  }

  function modeOf(entry: IslandEntry | null, isOpened: boolean): string {
    if (isOpened) {
      return "open";
    }
    if (entry === null) {
      return "empty";
    }
    if (entry.priority > PRIORITY_IDLE) {
      return "active";
    }
    return "rest";
  }

  function openSizeOf(layout: NookEntry[]): Size {
    const content = Math.max(nookWidth(layout), EMPTY_NOOK_WIDTH);
    return {
      width: content + 2 * NOOK_PADDING,
      height: NOOK_HEADER_HEIGHT + NOOK_ROW_HEIGHT + NOOK_PADDING,
    };
  }

  // The open island is already at its full size; growing it further on hover
  // would read as a second, accidental expansion.
  function sizeOf(current: string, isHovered: boolean, open: Size): Size {
    if (current === "open") {
      return open;
    }
    const base = SIZES[current];
    if (!isHovered) {
      return base;
    }
    return {
      width: base.width + HOVER_GROWTH.width,
      height: base.height + HOVER_GROWTH.height,
    };
  }

  function stageOf(open: Size): Size {
    const widest = Math.max(open.width, SIZES.active.width + HOVER_GROWTH.width);
    return {
      width: widest + 2 * FILLET_WIDTH + 2 * SHADOW_ROOM.width,
      height: open.height + SHADOW_ROOM.height,
    };
  }

  function declarationOf(record: Record<string, unknown>): NotchWidgetDeclaration {
    return {
      type: stringOf(record.type),
      name: stringOf(record.name),
      icon: stringOf(record.icon),
      defaultCells: numberOf(record.defaultCells, 4),
      minCells: numberOf(record.minCells, 3),
      maxCells: numberOf(record.maxCells, 8),
    };
  }

  function entryOf(fields: Partial<IslandEntry> & { id: string }): IslandEntry {
    return {
      priority: PRIORITY_ACTIVITY,
      label: "",
      detail: "",
      progress: NO_PROGRESS,
      tone: "neutral",
      art: "",
      ...fields,
    };
  }

  function entryFromMessage(
    data: unknown,
  ): { entry: IslandEntry; ttlMs: number } | null {
    const record = recordOf(data);
    const id = stringOf(record.id);
    if (id === "") {
      console.error("notch: island:show without an id, ignored");
      return null;
    }
    return {
      entry: entryOf({
        id,
        priority: numberOf(record.priority, PRIORITY_ALERT),
        label: stringOf(record.label),
        detail: stringOf(record.detail),
        progress: numberOf(record.progress, NO_PROGRESS),
        tone: toneOf(record.tone),
      }),
      ttlMs: numberOf(record.ttlMs, 0),
    };
  }

  function volumeEntry(percent: number, muted: boolean): IslandEntry {
    if (muted) {
      return entryOf({
        id: "volume",
        priority: PRIORITY_TRANSIENT,
        label: "Muted",
        tone: "accent",
      });
    }
    return entryOf({
      id: "volume",
      priority: PRIORITY_TRANSIENT,
      label: "Volume",
      detail: `${percent}%`,
      progress: percent / 100,
      tone: "accent",
    });
  }

  // GTK loads CSS urls from disk directly, so local art needs no host route.
  // Remote art would have to be downloaded first and is skipped.
  function artSourceOf(artUrl: string): string {
    if (artUrl.startsWith("file://")) {
      return decodeURIComponent(artUrl.slice("file://".length));
    }
    return "";
  }

  function islandCss(entry: IslandEntry | null, showingMedia: boolean): string {
    if (entry === null || entry.art === "" || showingMedia) {
      return "";
    }
    // Cover art fills the cutout behind the text; the scrim keeps the label
    // legible over a bright or busy sleeve.
    return [
      `background-image: linear-gradient(to right, var(--base-100),`,
      `color-mix(in srgb, var(--base-100) 60%, transparent),`,
      `color-mix(in srgb, var(--base-100) 20%, transparent)),`,
      `url("${entry.art}");`,
      "background-size: cover; background-position: center;",
    ].join(" ");
  }

  function artCss(art: string): string {
    if (art === "") {
      return "";
    }
    return `background-image: url("${art}"); background-size: cover; background-position: center;`;
  }

  // Collapsed, the header fills the island. Open, the panel keeps its full
  // width centred, so the growing island reveals it evenly on both sides.
  function panelAlignment(isOpened: boolean): string {
    if (isOpened) {
      return "center";
    }
    return "fill";
  }

  function pausedClass(playing: boolean): string {
    if (playing) {
      return "";
    }
    return "paused";
  }

  function tabClass(id: string, currentTab: string): string {
    if (id === currentTab) {
      return "nook-tab nook-tab-selected";
    }
    return "nook-tab";
  }

  function appNameOf(record: Record<string, unknown>): string {
    const initialClass = stringOf(record.initialClass);
    if (initialClass !== "") {
      return initialClass;
    }
    return stringOf(record.class);
  }

  function stringOf(value: unknown): string {
    if (typeof value === "string") {
      return value;
    }
    return "";
  }

  function numberOf(value: unknown, fallback: number): number {
    if (typeof value === "number") {
      return value;
    }
    return fallback;
  }

  function toneOf(value: unknown): string {
    if (typeof value === "string" && TONE_CLASS[value] !== undefined) {
      return value;
    }
    return "neutral";
  }

  function toneClass(entry: IslandEntry | null): string {
    if (entry === null) {
      return TONE_CLASS.neutral;
    }
    return TONE_CLASS[entry.tone];
  }

  function progressWidth(entry: IslandEntry, islandWidth: number): number {
    const clamped = Math.min(Math.max(entry.progress, 0), 1);
    return Math.round(clamped * (islandWidth - 2 * PROGRESS_MARGIN));
  }
</script>

<!-- The stage: a fixed-size box the window takes its size from, so the layer
     surface never resizes while the island animates inside it. A surface
     resize goes through the compositor and lands a frame or more late, which
     clipped the island's sides while its middle had already grown. Only the
     island is in the input region; the rest of the stage is click-through. -->
<gtkbox
  class="notch-stage"
  css="min-width: {stage.width}px; min-height: {stage.height}px;"
  orientation="vertical"
>
  <!-- The fillets are 10x10 patches pinned to the top edge; letting them fill
       the island's height would spill the gradient's solid half down the
       sides. -->
  <gtkbox orientation="horizontal" valign="start" halign="center">
    <gtkbox class="notch-fillet-left" valign="start"></gtkbox>

    <!-- Everything inside is an overlay child, which GTK does not measure: the
         island's size is the transition's alone, so opening animates instead of
         snapping to the content and then crawling the last few pixels. The
         content keeps its natural size at the top edge throughout and the
         growing island wipes it into view. -->
    <gtkoverlay
      class="island"
      input
      clip
      css="min-width: {size.width}px; min-height: {size.height}px;"
    >
      <gtkpressable
        overlay
        valign="start"
        halign={panelAlignment(opened)}
        orientation="vertical"
        onhoverstart={pointerEntered}
        onhoverend={pointerLeft}
        onpress={(event) => pressed(event.detail)}
        css={islandCss(current, isMedia || opened)}
      >
        {#if opened}
          {@render nookPanel()}
        {:else if current !== null}
          <gtkbutton
            class="island-header"
            frame={false}
            tooltip={current.label}
            onclicked={() => (opened = true)}
          >
            {#if isMedia}
              {@render mediaHeader(current)}
            {:else}
              {@render plainHeader(current)}
            {/if}
          </gtkbutton>
        {:else}
          <gtkbutton
            class="island-header"
            frame={false}
            css="min-height: {BAR_HEIGHT}px;"
            onclicked={() => (opened = true)}
          ></gtkbutton>
        {/if}
      </gtkpressable>

      {#if !opened && current !== null && current.progress >= 0}
        <gtkbox overlay class="progress-track" valign="end">
          <gtkbox
            class="progress-fill {toneClass(current)}"
            css="min-width: {progressWidth(current, size.width)}px;"></gtkbox>
        </gtkbox>
      {/if}
    </gtkoverlay>

    <gtkbox class="notch-fillet-right" valign="start"></gtkbox>
  </gtkbox>
</gtkbox>

<!-- Laid out at the open size from the first frame and wiped into view by the
     growing island, like the collapsed header. -->
{#snippet nookPanel()}
  <gtkbox
    class="nook-panel"
    orientation="vertical"
    css="min-width: {openSize.width - 2 * NOOK_PADDING}px;"
  >
    <gtkbox class="nook-header" orientation="horizontal" spacing={6}>
      {#each TABS as item (item.id)}
        <gtkbutton class={tabClass(item.id, tab)} frame={false} onclicked={() => (tab = item.id)}>
          <gtkbox orientation="horizontal" spacing={6}>
            <gtkicon icon={item.icon} size={14}></gtkicon>
            <gtklabel>{item.label}</gtklabel>
          </gtkbox>
        </gtkbutton>
      {/each}
    </gtkbox>

    {#if tab === "nook"}
      {@render nookRow()}
    {:else}
      {@render trayShelf()}
    {/if}
  </gtkbox>
{/snippet}

{#snippet nookRow()}
  <gtkbox orientation="horizontal" spacing={0} css="min-height: {NOOK_ROW_HEIGHT}px;">
    {#each shownWidgets as entry, index (entry.type)}
      {@const Widget = resolve(registry, entry.type, generation)}
      {#if index > 0}
        <gtkseparator class="nook-divider" orientation="vertical"></gtkseparator>
      {/if}
      <gtkbox css="min-width: {widgetWidth(entry.cells)}px;">
        {#if Widget !== undefined}
          <Widget {bus} {registry} args={{ cells: entry.cells }} id={entry.type} />
        {/if}
      </gtkbox>
    {:else}
      <gtklabel class="nook-empty" hexpand>No widgets — right-click to add some</gtklabel>
    {/each}
  </gtkbox>
{/snippet}

<!-- Files dragged here wait for a drop elsewhere. Drag and drop is not wired
     yet; the shelf is only its empty state. -->
{#snippet trayShelf()}
  <gtkbox
    class="tray-shelf"
    orientation="vertical"
    spacing={6}
    css="min-height: {NOOK_ROW_HEIGHT}px;"
  >
    <gtkicon icon="folder-download-symbolic" size={24} vexpand valign="end"></gtkicon>
    <gtklabel class="tray-empty" vexpand valign="start">Drop files here to keep them handy</gtklabel>
  </gtkbox>
{/snippet}

{#snippet plainHeader(entry: IslandEntry)}
  <gtkbox orientation="horizontal" spacing={10} hexpand>
    <gtkbox class="tone-dot {toneClass(entry)}" valign="center"></gtkbox>
    <!-- The island no longer measures its content, so an over-long title has to
         end itself rather than run off under the clip. -->
    <gtklabel class="island-label" hexpand halign="start" ellipsize="end">
      {entry.label}
    </gtklabel>
    {#if entry.detail !== ""}
      <gtklabel class="island-detail" tabular>{entry.detail}</gtklabel>
    {/if}
  </gtkbox>
{/snippet}

<!-- Sleeve on the left, title in the middle, level meter on the right. -->
{#snippet mediaHeader(entry: IslandEntry)}
  <gtkbox orientation="horizontal" spacing={12} hexpand>
    <gtkbox class="island-art island-art-small" css={artCss(entry.art)} valign="center"></gtkbox>
    <gtklabel class="island-title" hexpand halign="start" valign="center" ellipsize="end">
      {entry.label}
    </gtklabel>
    {@render levelMeter(mediaStatus === "Playing")}
  </gtkbox>
{/snippet}

<!-- Four bars bouncing in sequence: the "audio is coming out of here" mark on
     the header's right edge. A paused player freezes them mid-stride. -->
{#snippet levelMeter(playing: boolean)}
  <gtkbox
    class="level-meter level-meter-small {pausedClass(playing)}"
    orientation="horizontal"
    spacing={2}
    valign="center"
  >
    {#each [0, 1, 2, 3] as bar (bar)}
      <gtkbox class="level-bar level-bar-{bar}"></gtkbox>
    {/each}
  </gtkbox>
{/snippet}

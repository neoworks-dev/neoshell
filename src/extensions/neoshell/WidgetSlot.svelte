<script lang="ts">
  import type { BusService } from '../../lib/bus'
  import type { ViewComponent, ViewRegistry } from '../../host/plugins/views'
  import { SIZE_NAMES } from './grid'
  import type { Cell, Point } from './grid'
  import { widgetKey } from './desktopLayout'
  import type { DesktopStore, MenuItem, WidgetPlacement } from './desktopStore.svelte'
  import { dragOf, pressOf, SECONDARY_BUTTON } from './gestures'

  // One widget on the desktop: the registered view for its type, placed by the
  // store and draggable unless it or the desktop is locked.
  //
  // A drag picks the widget up at its own size and it follows the pointer
  // exactly. The cell under it is pinned as the drag goes, so the desktop
  // shows where it will land and moves whatever is there aside; on release
  // it glides into that cell. The following and the gliding are the host's
  // (`carry`, `glide`): this view only says where the widget belongs.

  const DRAG_THRESHOLD_PX = 4
  const GLIDE_MS = 220
  // Matches .widget-slot.removing's animation in style.css.
  const REMOVE_ANIMATION_MS = 180

  let {
    placement,
    bus,
    registry,
    generation,
    store,
  }: {
    placement: WidgetPlacement
    bus: BusService
    registry: ViewRegistry
    generation: number
    store: DesktopStore
  } = $props()

  const instanceId = $props.id()
  const carryGroup = `widget-slot-${instanceId}`

  let moving = $state(false)
  let removing = $state(false)
  let dragging = false

  // Reading `generation` is what re-resolves the type when a widget provider's
  // views register after the desktop is already up.
  const View = $derived(viewFor(placement.type, generation))
  const slotClass = $derived(slotClassOf(moving, removing))
  const carry = $derived(carryOf(store.widgetDraggable(placement.id)))

  function viewFor(type: string, _generation: number): ViewComponent | undefined {
    return registry.resolve(type)
  }

  function carryOf(draggable: boolean): string {
    if (draggable) {
      return carryGroup
    }
    return ''
  }

  function slotClassOf(isMoving: boolean, isRemoving: boolean): string {
    if (isRemoving) {
      return 'widget-slot removing'
    }
    if (isMoving) {
      return 'widget-slot dragging'
    }
    return 'widget-slot'
  }

  // The widget shrinks away (.widget-slot.removing) before it leaves.
  function remove(): void {
    removing = true
    setTimeout(() => store.removeWidget(placement.id), REMOVE_ANIMATION_MS)
  }

  function handlePress(event: { detail: unknown }): void {
    const press = pressOf(event)
    if (press.button !== SECONDARY_BUTTON) {
      return
    }
    store.openMenu(placement.point.x + press.x, placement.point.y + press.y, menuItems())
  }

  function startDrag(): void {
    dragging = store.widgetDraggable(placement.id)
  }

  function moveDrag(event: { detail: unknown }): void {
    const drag = dragOf(event)
    if (!dragging || !drag.carried) {
      return
    }
    moving = true
    store.previewDrop(pinsFor(drag))
  }

  function endDrag(event: { detail: unknown }): void {
    const drag = dragOf(event)
    const wasMoving = dragging && drag.carried
    dragging = false
    moving = false
    if (!wasMoving) {
      store.cancelDrop()
      return
    }
    store.commitDrop(pinsFor(drag))
  }

  function pinsFor(drag: { dx: number; dy: number }): Map<string, Cell> {
    const loose: Point = { x: placement.point.x + drag.dx, y: placement.point.y + drag.dy }
    const cell = store.widgetCellAt(placement.id, loose)
    if (cell === undefined) {
      return new Map()
    }
    return new Map([[widgetKey(placement.id), cell]])
  }

  function menuItems(): MenuItem[] {
    return [
      { label: 'Edit Widgets', action: () => store.openGallery() },
      { separator: true },
      {
        label: 'Locked',
        checked: placement.locked,
        disabled: store.desktopLocked,
        action: () => store.setWidgetLocked(placement.id, !placement.locked),
      },
      { label: 'Size', children: sizeItems() },
      { separator: true },
      { label: 'Remove Widget', danger: true, action: remove },
    ]
  }

  function sizeItems(): MenuItem[] {
    return SIZE_NAMES.map((size) => ({
      label: capitalized(size),
      checked: size === placement.size,
      action: () => store.setWidgetSize(placement.id, size),
    }))
  }

  function capitalized(value: string): string {
    return value.slice(0, 1).toUpperCase() + value.slice(1)
  }
</script>

{#if View !== undefined}
  <gtkpressable
    overlay
    class={slotClass}
    halign="start"
    valign="start"
    margin-start={placement.point.x}
    margin-top={placement.point.y}
    width={placement.box.width}
    height={placement.box.height}
    {carry}
    carry-threshold={DRAG_THRESHOLD_PX}
    carried-by={carryGroup}
    glide={GLIDE_MS}
    input
    onpress={handlePress}
    ondragstart={startDrag}
    ondragmove={moveDrag}
    ondragend={endDrag}
  >
    <gtkoverlay hexpand vexpand>
      <!-- The card is told its own size rather than measuring it: the store
           already holds it, and a change from the widget's context menu
           reaches the card as a prop instead of as a resize it has to
           observe. -->
      <View
        {bus}
        {registry}
        args={{
          size: placement.size,
          width: placement.box.width,
          height: placement.box.height,
        }}
        id={placement.id}
      />
      <!-- While the gallery is open, every widget can be taken off. -->
      {#if store.editing && !removing}
        <gtkbutton
          overlay
          class="widget-remove"
          halign="start"
          valign="start"
          frame={false}
          tooltip="Remove Widget"
          onclicked={remove}
        >
          <gtkicon icon="list-remove-symbolic" size={12}></gtkicon>
        </gtkbutton>
      {/if}
    </gtkoverlay>
  </gtkpressable>
{/if}

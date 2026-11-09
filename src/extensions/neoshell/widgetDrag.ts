// A widget dragged from the gallery onto the desktop travels as text, the
// one thing a Wayland drag carries between the two surfaces. Which widget it
// is and at what size is also announced on widgets:dragging while the drag
// is on, so the desktop can show where it would land before the drop.

const PREFIX = 'neoshell-widget:'

export function widgetDragText(type: string): string {
  return `${PREFIX}${type}`
}

/** The widget type a dropped text names, or '' for any other text. */
export function widgetTypeOfDrag(text: string): string {
  if (!text.startsWith(PREFIX)) {
    return ''
  }
  return text.slice(PREFIX.length)
}

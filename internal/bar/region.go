// Package bar provides the main window and input region management for neobar.
package bar

import (
	"fmt"

	layershell "github.com/diamondburned/gotk4-layer-shell/pkg/gtk4layershell"
	"github.com/diamondburned/gotk4/pkg/cairo"
	gdk "github.com/diamondburned/gotk4/pkg/gdk/v4"
	"github.com/diamondburned/gotk4/pkg/gtk/v4"
)

var panelOpen bool

// openPanel expands the window to show the panel and enables keyboard interaction.
func openPanel(win *gtk.ApplicationWindow, monitorWidth int) {
	panelOpen = true
	win.SetDefaultSize(monitorWidth, barHeight+panelHeight)
	layershell.SetKeyboardMode(&win.Window, layershell.LayerShellKeyboardModeOnDemand)
	setInputRegion(win, monitorWidth, true)
}

// closePanel collapses the window back to just the bar area.
func closePanel(win *gtk.ApplicationWindow, monitorWidth int) {
	panelOpen = false
	win.SetDefaultSize(monitorWidth, barHeight)
	layershell.SetKeyboardMode(&win.Window, layershell.LayerShellKeyboardModeNone)
	setInputRegion(win, monitorWidth, false)
}

// togglePanel toggles the panel open/closed state.
func togglePanel(win *gtk.ApplicationWindow, monitorWidth int) {
	if panelOpen {
		closePanel(win, monitorWidth)
	} else {
		openPanel(win, monitorWidth)
	}
}

// setInputRegion configures which areas of the window accept input.
// It always includes the bar area at the top, and optionally includes
// the panel area below it when withPanel is true.
func setInputRegion(win *gtk.ApplicationWindow, monitorWidth int, withPanel bool) {
	native := gtk.BaseWidget(win).Native()
	if native == nil {
		fmt.Println("setInputRegion: Native() returned nil")
		return
	}

	surface := native.Surface()
	if surface == nil {
		fmt.Println("setInputRegion: Surface() returned nil")
		return
	}

	gdkSurface, ok := surface.(*gdk.Surface)
	if !ok {
		fmt.Printf("setInputRegion: Surface is not *gdk.Surface, got %T\n", surface)
		return
	}

	region, err := cairo.RegionCreate()
	if err != nil {
		fmt.Printf("setInputRegion: Failed to create region: %v\n", err)
		return
	}

	// Always accept input on the bar area (top of screen)
	rect := &cairo.Rectangle{X: 0, Y: 0, Width: monitorWidth, Height: barHeight}
	region, _ = region.UnionRectangle(rect)

	// If panel is open, also accept input on the panel area (centered below bar)
	if withPanel {
		panelX := (monitorWidth - panelWidth) / 2
		rect = &cairo.Rectangle{X: panelX, Y: barHeight, Width: panelWidth, Height: panelHeight}
		region, _ = region.UnionRectangle(rect)
	}

	gdkSurface.SetInputRegion(region)
}

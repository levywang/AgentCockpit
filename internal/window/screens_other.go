//go:build !windows

package window

// MonitorRect represents the coordinates and dimensions of a monitor
type MonitorRect struct {
	Index  int
	X      int
	Y      int
	Width  int
	Height int
}

// GetMonitors returns a fallback monitor on non-Windows platforms
func GetMonitors() []MonitorRect {
	return []MonitorRect{
		{
			Index:  0,
			X:      0,
			Y:      0,
			Width:  1920,
			Height: 1080,
		},
	}
}

// GetWindowsMonitors is an alias for GetMonitors
func GetWindowsMonitors() []MonitorRect {
	return GetMonitors()
}

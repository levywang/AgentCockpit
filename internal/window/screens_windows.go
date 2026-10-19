//go:build windows

package window

import (
	"syscall"
	"unsafe"
)

// MonitorRect represents the coordinates and dimensions of a monitor
type MonitorRect struct {
	Index  int
	X      int
	Y      int
	Width  int
	Height int
}

var (
	user32DLL               = syscall.NewLazyDLL("user32.dll")
	procEnumDisplayMonitors = user32DLL.NewProc("EnumDisplayMonitors")
	procGetMonitorInfoW     = user32DLL.NewProc("GetMonitorInfoW")
)

type monitorInfoStruct struct {
	cbSize    uint32
	rcMonitor [4]int32 // Left, Top, Right, Bottom
	rcWork    [4]int32
	dwFlags   uint32
}

// GetMonitors enumerates all physical and virtual display monitors on Windows
func GetMonitors() []MonitorRect {
	var list []MonitorRect
	idx := 0

	cb := syscall.NewCallback(func(hMonitor, hdcMonitor, lprcMonitor, dwData uintptr) uintptr {
		var mi monitorInfoStruct
		mi.cbSize = uint32(unsafe.Sizeof(mi))
		ret, _, _ := procGetMonitorInfoW.Call(hMonitor, uintptr(unsafe.Pointer(&mi)))
		if ret != 0 {
			left := int(mi.rcMonitor[0])
			top := int(mi.rcMonitor[1])
			width := int(mi.rcMonitor[2] - mi.rcMonitor[0])
			height := int(mi.rcMonitor[3] - mi.rcMonitor[1])

			list = append(list, MonitorRect{
				Index:  idx,
				X:      left,
				Y:      top,
				Width:  width,
				Height: height,
			})
			idx++
		}
		return 1 // continue enumeration
	})

	_, _, _ = procEnumDisplayMonitors.Call(0, 0, cb, 0)

	// Fallback if enumeration returned empty
	if len(list) == 0 {
		list = append(list, MonitorRect{
			Index:  0,
			X:      0,
			Y:      0,
			Width:  1920,
			Height: 1080,
		})
	}

	return list
}

// GetWindowsMonitors is an alias for GetMonitors
func GetWindowsMonitors() []MonitorRect {
	return GetMonitors()
}

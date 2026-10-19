//go:build windows

package window

import (
	"os"
	"strings"
	"syscall"
	"time"
	"unsafe"
)

var (
	procOpenInputDesktop         = user32DLL.NewProc("OpenInputDesktop")
	procSetThreadDesktop         = user32DLL.NewProc("SetThreadDesktop")
	procFindWindowW              = user32DLL.NewProc("FindWindowW")
	procFindWindowExW            = user32DLL.NewProc("FindWindowExW")
	procSendMessageTimeoutW      = user32DLL.NewProc("SendMessageTimeoutW")
	procEnumWindows              = user32DLL.NewProc("EnumWindows")
	procEnumChildWindows         = user32DLL.NewProc("EnumChildWindows")
	procGetWindowThreadProcessId = user32DLL.NewProc("GetWindowThreadProcessId")
	procGetWindowTextLengthW     = user32DLL.NewProc("GetWindowTextLengthW")
	procGetWindowTextW           = user32DLL.NewProc("GetWindowTextW")
	procGetClassNameW            = user32DLL.NewProc("GetClassNameW")
	procGetParent                = user32DLL.NewProc("GetParent")
	procSetParent                = user32DLL.NewProc("SetParent")
	procGetWindowLongW           = user32DLL.NewProc("GetWindowLongW")
	procSetWindowLongW           = user32DLL.NewProc("SetWindowLongW")
	procSetWindowPos             = user32DLL.NewProc("SetWindowPos")
	procGetSystemMetrics         = user32DLL.NewProc("GetSystemMetrics")
	procGetDesktopWindow         = user32DLL.NewProc("GetDesktopWindow")
	procIsWindowVisible          = user32DLL.NewProc("IsWindowVisible")
	procSetForegroundWindow      = user32DLL.NewProc("SetForegroundWindow")
)

const (
	HWND_TOP       = 0
	HWND_BOTTOM    = 1
	HWND_TOPMOST   = ^uintptr(0) // -1
	HWND_NOTOPMOST = ^uintptr(1) // -2

	SWP_NOSIZE     = 0x0001
	SWP_NOMOVE     = 0x0002
	SWP_NOACTIVATE = 0x0010
	SWP_SHOWWINDOW = 0x0040

	GWL_STYLE       = ^uintptr(15) // -16
	WS_POPUP        = 0x80000000
	WS_CHILD        = 0x40000000
	WS_VISIBLE      = 0x10000000
	WS_CLIPSIBLINGS = 0x04000000
	WS_CLIPCHILDREN = 0x02000000
	WS_CAPTION      = 0x00C00000
	WS_THICKFRAME   = 0x00040000
	WS_MINIMIZEBOX  = 0x00020000
	WS_MAXIMIZEBOX  = 0x00010000
)

// Manager coordinates Win32 window styles, hierarchy, wallpaper pinning, and z-order
type Manager struct {
	appHwnd    uintptr
	savedStyle uintptr
}

// NewManager creates a window manager instance
func NewManager() *Manager {
	return &Manager{}
}

func attachInputDesktop() {
	hDesk, _, _ := procOpenInputDesktop.Call(0, 0, 0x01FF)
	if hDesk != 0 {
		procSetThreadDesktop.Call(hDesk)
	}
}

func utf16Ptr(s string) uintptr {
	p, _ := syscall.UTF16PtrFromString(s)
	return uintptr(unsafe.Pointer(p))
}

func getVirtualScreenBounds() (int32, int32, int32, int32) {
	x, _, _ := procGetSystemMetrics.Call(76) // SM_XVIRTUALSCREEN
	y, _, _ := procGetSystemMetrics.Call(77) // SM_YVIRTUALSCREEN
	w, _, _ := procGetSystemMetrics.Call(78) // SM_CXVIRTUALSCREEN
	h, _, _ := procGetSystemMetrics.Call(79) // SM_CYVIRTUALSCREEN

	if w == 0 || h == 0 {
		w, _, _ = procGetSystemMetrics.Call(0) // SM_CXSCREEN
		h, _, _ = procGetSystemMetrics.Call(1) // SM_CYSCREEN
	}
	return int32(x), int32(y), int32(w), int32(h)
}

func getWallpaperWorkerW() uintptr {
	attachInputDesktop()
	progman, _, _ := procFindWindowW.Call(utf16Ptr("Progman"), 0)
	if progman == 0 {
		return 0
	}

	var res uintptr
	// Send 0x052C to Progman to construct the WorkerW desktop background container
	procSendMessageTimeoutW.Call(progman, 0x052C, 0xD, 0x1, 0, 1000, uintptr(unsafe.Pointer(&res)))
	procSendMessageTimeoutW.Call(progman, 0x052C, 0, 0, 0, 1000, uintptr(unsafe.Pointer(&res)))

	// Method A: Check child WorkerW inside Progman (Modern Windows 11 22H2/23H2/24H2)
	var workerInside uintptr
	childCb := syscall.NewCallback(func(hwnd, lParam uintptr) uintptr {
		var classBuf [256]uint16
		procGetClassNameW.Call(hwnd, uintptr(unsafe.Pointer(&classBuf[0])), 256)
		if syscall.UTF16ToString(classBuf[:]) == "WorkerW" {
			vis, _, _ := procIsWindowVisible.Call(hwnd)
			if vis != 0 {
				workerInside = hwnd
				return 0 // stop
			}
		}
		return 1
	})
	procEnumChildWindows.Call(progman, childCb, 0)
	if workerInside != 0 {
		return workerInside
	}

	// Method B: Check top-level window containing SHELLDLL_DefView, then get next WorkerW sibling (Windows 10)
	var workerW uintptr
	cb := syscall.NewCallback(func(hwnd, lParam uintptr) uintptr {
		shellDef, _, _ := procFindWindowExW.Call(hwnd, 0, utf16Ptr("SHELLDLL_DefView"), 0)
		if shellDef != 0 {
			w, _, _ := procFindWindowExW.Call(0, hwnd, utf16Ptr("WorkerW"), 0)
			if w != 0 {
				workerW = w
				return 0
			}
		}
		return 1
	})
	procEnumWindows.Call(cb, 0)
	if workerW != 0 {
		return workerW
	}

	return progman
}

// GetAppHWND finds the main window handle of the current process
func (m *Manager) GetAppHWND() uintptr {
	if m.appHwnd != 0 {
		return m.appHwnd
	}

	attachInputDesktop()
	targetPid := uint32(os.Getpid())
	var candidate uintptr

	for attempt := 0; attempt < 15; attempt++ {
		cb := syscall.NewCallback(func(hwnd, lParam uintptr) uintptr {
			var pid uint32
			procGetWindowThreadProcessId.Call(hwnd, uintptr(unsafe.Pointer(&pid)))
			if pid == targetPid {
				parent, _, _ := procGetParent.Call(hwnd)
				desktopHwnd, _, _ := procGetDesktopWindow.Call()
				if parent == 0 || parent == desktopHwnd {
					var length int32
					ret, _, _ := procGetWindowTextLengthW.Call(hwnd)
					length = int32(ret)
					if length > 0 {
						buf := make([]uint16, length+1)
						procGetWindowTextW.Call(hwnd, uintptr(unsafe.Pointer(&buf[0])), uintptr(length+1))
						title := syscall.UTF16ToString(buf)
						if strings.Contains(strings.ToUpper(title), "AGENT") {
							m.appHwnd = hwnd
							return 0 // found exact match
						}
					}
					if candidate == 0 {
						candidate = hwnd
					}
				}
			}
			return 1
		})
		procEnumWindows.Call(cb, 0)

		if m.appHwnd != 0 {
			return m.appHwnd
		}
		if candidate != 0 {
			m.appHwnd = candidate
			return m.appHwnd
		}
		time.Sleep(100 * time.Millisecond)
	}

	return m.appHwnd
}

// SendToWallpaper attaches the window as a child of WorkerW behind desktop icons
func (m *Manager) SendToWallpaper() {
	hwnd := m.GetAppHWND()
	if hwnd == 0 {
		return
	}

	workerW := getWallpaperWorkerW()
	if workerW == 0 {
		return
	}

	// 1. Save original style if not saved yet
	style, _, _ := procGetWindowLongW.Call(hwnd, uintptr(GWL_STYLE))
	if m.savedStyle == 0 && style != 0 {
		m.savedStyle = style
	}

	// 2. Adjust window style to WS_CHILD | WS_VISIBLE | WS_CLIPSIBLINGS
	newStyle := (style &^ uintptr(WS_POPUP|WS_CAPTION|WS_THICKFRAME|WS_MINIMIZEBOX|WS_MAXIMIZEBOX)) |
		uintptr(WS_CHILD|WS_VISIBLE|WS_CLIPSIBLINGS)
	procSetWindowLongW.Call(hwnd, uintptr(GWL_STYLE), newStyle)

	// 3. Anchor window as child of the desktop's WorkerW background
	procSetParent.Call(hwnd, workerW)

	// 4. Position and size to cover the entire virtual desktop behind icons
	vx, vy, vw, vh := getVirtualScreenBounds()
	procSetWindowPos.Call(
		hwnd,
		uintptr(HWND_BOTTOM),
		uintptr(vx),
		uintptr(vy),
		uintptr(vw),
		uintptr(vh),
		SWP_NOACTIVATE|SWP_SHOWWINDOW,
	)
}

// DetachFromWallpaper restores window to standard top-level desktop container
func (m *Manager) DetachFromWallpaper() {
	hwnd := m.GetAppHWND()
	if hwnd == 0 {
		return
	}
	parent, _, _ := procGetParent.Call(hwnd)
	desktop, _, _ := procGetDesktopWindow.Call()

	if parent != 0 && parent != desktop {
		// Detach from WorkerW back to top-level desktop window
		procSetParent.Call(hwnd, 0)

		// Restore original or popup window style
		if m.savedStyle != 0 {
			procSetWindowLongW.Call(hwnd, uintptr(GWL_STYLE), m.savedStyle)
		} else {
			procSetWindowLongW.Call(hwnd, uintptr(GWL_STYLE), uintptr(WS_POPUP|WS_VISIBLE|WS_CLIPSIBLINGS))
		}
	}
}

// SetTopmost toggles the HWND_TOPMOST window flag
func (m *Manager) SetTopmost(topmost bool) {
	hwnd := m.GetAppHWND()
	if hwnd == 0 {
		return
	}
	flag := uintptr(HWND_NOTOPMOST)
	if topmost {
		flag = uintptr(HWND_TOPMOST)
	}
	procSetWindowPos.Call(
		hwnd,
		flag,
		0, 0, 0, 0,
		SWP_NOMOVE|SWP_NOSIZE|SWP_SHOWWINDOW,
	)
}

// OpenConsole brings the window to the front and foreground
func (m *Manager) OpenConsole() {
	hwnd := m.GetAppHWND()
	if hwnd != 0 {
		m.DetachFromWallpaper()

		vx, vy, vw, vh := getVirtualScreenBounds()
		procSetWindowPos.Call(
			hwnd,
			uintptr(HWND_TOP),
			uintptr(vx),
			uintptr(vy),
			uintptr(vw),
			uintptr(vh),
			SWP_SHOWWINDOW,
		)
		procSetForegroundWindow.Call(hwnd)
	}
}

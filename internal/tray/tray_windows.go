//go:build windows

package tray

import (
	"os"
	"path/filepath"
	"runtime"
	"sync"
	"syscall"
	"unsafe"
)

var (
	user32DLL              = syscall.NewLazyDLL("user32.dll")
	shell32DLL             = syscall.NewLazyDLL("shell32.dll")
	procShellNotifyIconW   = shell32DLL.NewProc("Shell_NotifyIconW")

	procRegisterClassExW    = user32DLL.NewProc("RegisterClassExW")
	procDefWindowProcW      = user32DLL.NewProc("DefWindowProcW")
	procCreateWindowExW     = user32DLL.NewProc("CreateWindowExW")
	procDestroyWindow       = user32DLL.NewProc("DestroyWindow")
	procPostQuitMessage     = user32DLL.NewProc("PostQuitMessage")
	procGetMessageW         = user32DLL.NewProc("GetMessageW")
	procTranslateMessage    = user32DLL.NewProc("TranslateMessage")
	procDispatchMessageW    = user32DLL.NewProc("DispatchMessageW")
	procCreatePopupMenu     = user32DLL.NewProc("CreatePopupMenu")
	procAppendMenuW         = user32DLL.NewProc("AppendMenuW")
	procTrackPopupMenuEx    = user32DLL.NewProc("TrackPopupMenuEx")
	procDestroyMenu         = user32DLL.NewProc("DestroyMenu")
	procSetForegroundWindow = user32DLL.NewProc("SetForegroundWindow")
	procGetCursorPos        = user32DLL.NewProc("GetCursorPos")
	procLoadIconW           = user32DLL.NewProc("LoadIconW")
	procLoadImageW          = user32DLL.NewProc("LoadImageW")
)

const (
	NIM_ADD    = 0x00000000
	NIM_MODIFY = 0x00000001
	NIM_DELETE = 0x00000002

	NIF_MESSAGE = 0x00000001
	NIF_ICON    = 0x00000002
	NIF_TIP     = 0x00000004

	WM_USER          = 0x0400
	WM_TRAYICON      = WM_USER + 101
	WM_COMMAND       = 0x0111
	WM_RBUTTONUP     = 0x0205
	WM_LBUTTONUP     = 0x0202
	WM_LBUTTONDBLCLK = 0x0203

	MF_STRING    = 0x00000000
	MF_SEPARATOR = 0x00000800

	IMAGE_ICON      = 1
	LR_LOADFROMFILE = 0x0010
	LR_DEFAULTSIZE  = 0x0040

	IDM_CONSOLE   = 2001
	IDM_LOCK_NOW  = 2002
	IDM_WALLPAPER = 2003
	IDM_WINDOWED  = 2004
	IDM_PAUSE     = 2005
	IDM_THEME     = 2006
	IDM_QUIT      = 2099
)

type NOTIFYICONDATAW struct {
	cbSize            uint32
	hWnd              uintptr
	uID               uint32
	uFlags            uint32
	uCallbackMessage  uint32
	hIcon             uintptr
	szTip             [128]uint16
	dwState           uint32
	dwStateMask       uint32
	szInfo            [256]uint16
	uTimeoutOrVersion uint32
	szInfoTitle       [64]uint16
	dwInfoFlags       uint32
	guidItem          [16]byte
	hBalloonIcon      uintptr
}

type POINT struct {
	X int32
	Y int32
}

type WNDCLASSEXW struct {
	cbSize        uint32
	style         uint32
	lpfnWndProc   uintptr
	cbClsExtra    int32
	cbWndExtra    int32
	hInstance     uintptr
	hIcon         uintptr
	hCursor       uintptr
	hbrBackground uintptr
	lpszMenuName  *uint16
	lpszClassName *uint16
	hIconSm       uintptr
}

type MSG struct {
	hwnd    uintptr
	message uint32
	wParam  uintptr
	lParam  uintptr
	time    uint32
	pt      POINT
}

// TrayCallbacks allows handling tray menu interactions
type TrayCallbacks struct {
	OnOpenConsole func()
	OnLockNow     func()
	OnSetMode     func(mode string)
	OnTogglePause func()
	OnToggleTheme func()
	OnQuit        func()
}

// Manager manages the Windows Notification Area tray icon
type Manager struct {
	hwnd      uintptr
	nid       NOTIFYICONDATAW
	callbacks TrayCallbacks
	mu        sync.Mutex
}

// WindowsTrayManager is an alias for backwards compatibility
type WindowsTrayManager = Manager

var globalTray *Manager

// Start launches the system tray icon in a background OS thread
func Start(cb TrayCallbacks) *Manager {
	tm := &Manager{
		callbacks: cb,
	}
	globalTray = tm

	readyCh := make(chan bool)
	go func() {
		runtime.LockOSThread()
		defer runtime.UnlockOSThread()
		tm.runMessageLoop(readyCh)
	}()

	<-readyCh
	return tm
}

// StartWindowsTray is an alias for Start
func StartWindowsTray(cb TrayCallbacks) *Manager {
	return Start(cb)
}

func (tm *Manager) runMessageLoop(readyCh chan bool) {
	className := syscall.StringToUTF16Ptr("AgentCockpitTrayWindowClass")

	wndProc := syscall.NewCallback(func(hwnd uintptr, msg uint32, wParam, lParam uintptr) uintptr {
		switch msg {
		case WM_TRAYICON:
			switch lParam {
			case WM_LBUTTONUP, WM_LBUTTONDBLCLK:
				if tm.callbacks.OnOpenConsole != nil {
					tm.callbacks.OnOpenConsole()
				}
			case WM_RBUTTONUP:
				tm.showPopupMenu(hwnd)
			}
			return 0
		case WM_COMMAND:
			cmdId := int(wParam & 0xffff)
			switch cmdId {
			case IDM_CONSOLE:
				if tm.callbacks.OnOpenConsole != nil {
					tm.callbacks.OnOpenConsole()
				}
			case IDM_LOCK_NOW:
				if tm.callbacks.OnLockNow != nil {
					tm.callbacks.OnLockNow()
				}
			case IDM_WALLPAPER:
				if tm.callbacks.OnSetMode != nil {
					tm.callbacks.OnSetMode("wallpaper")
				}
			case IDM_WINDOWED:
				if tm.callbacks.OnSetMode != nil {
					tm.callbacks.OnSetMode("windowed")
				}
			case IDM_PAUSE:
				if tm.callbacks.OnTogglePause != nil {
					tm.callbacks.OnTogglePause()
				}
			case IDM_THEME:
				if tm.callbacks.OnToggleTheme != nil {
					tm.callbacks.OnToggleTheme()
				}
			case IDM_QUIT:
				if tm.callbacks.OnQuit != nil {
					tm.callbacks.OnQuit()
				}
			}
			return 0
		case 0x0002: // WM_DESTROY
			procPostQuitMessage.Call(0)
			return 0
		}
		ret, _, _ := procDefWindowProcW.Call(hwnd, uintptr(msg), wParam, lParam)
		return ret
	})

	var wc WNDCLASSEXW
	wc.cbSize = uint32(unsafe.Sizeof(wc))
	wc.lpfnWndProc = wndProc
	wc.lpszClassName = className
	procRegisterClassExW.Call(uintptr(unsafe.Pointer(&wc)))

	hwnd, _, _ := procCreateWindowExW.Call(
		0,
		uintptr(unsafe.Pointer(className)),
		uintptr(unsafe.Pointer(syscall.StringToUTF16Ptr("AgentCockpitTrayWindow"))),
		0,
		0, 0, 0, 0,
		0, 0, 0, 0,
	)
	tm.hwnd = hwnd

	// Load Icon: try icon.ico first, fallback to standard application icon
	hIcon := tm.loadIcon()

	tm.nid.cbSize = uint32(unsafe.Sizeof(tm.nid))
	tm.nid.hWnd = hwnd
	tm.nid.uID = 1
	tm.nid.uFlags = NIF_MESSAGE | NIF_ICON | NIF_TIP
	tm.nid.uCallbackMessage = WM_TRAYICON
	tm.nid.hIcon = hIcon

	tip := "AGENT COCKPIT // 赛博控制台 & 动态壁纸"
	tipW, _ := syscall.UTF16FromString(tip)
	copy(tm.nid.szTip[:], tipW)

	procShellNotifyIconW.Call(NIM_ADD, uintptr(unsafe.Pointer(&tm.nid)))

	readyCh <- true

	var msg MSG
	for {
		ret, _, _ := procGetMessageW.Call(uintptr(unsafe.Pointer(&msg)), 0, 0, 0)
		if int32(ret) <= 0 {
			break
		}
		procTranslateMessage.Call(uintptr(unsafe.Pointer(&msg)))
		procDispatchMessageW.Call(uintptr(unsafe.Pointer(&msg)))
	}

	// Remove tray icon on exit
	procShellNotifyIconW.Call(NIM_DELETE, uintptr(unsafe.Pointer(&tm.nid)))
}

func (tm *Manager) loadIcon() uintptr {
	// Try to locate build/windows/icon.ico relative to current executable or workspace
	exePath, err := os.Executable()
	candidates := []string{
		"build/windows/icon.ico",
	}
	if err == nil {
		exeDir := filepath.Dir(exePath)
		candidates = append(candidates,
			filepath.Join(exeDir, "icon.ico"),
			filepath.Join(exeDir, "build", "windows", "icon.ico"),
			filepath.Join(exeDir, "..", "build", "windows", "icon.ico"),
		)
	}

	for _, p := range candidates {
		if _, err := os.Stat(p); err == nil {
			pPtr := syscall.StringToUTF16Ptr(p)
			hIcon, _, _ := procLoadImageW.Call(
				0,
				uintptr(unsafe.Pointer(pPtr)),
				IMAGE_ICON,
				16, 16,
				LR_LOADFROMFILE,
			)
			if hIcon != 0 {
				return hIcon
			}
		}
	}

	// Fallback to standard application icon
	hIcon, _, _ := procLoadIconW.Call(0, 32512) // IDI_APPLICATION
	return hIcon
}

func (tm *Manager) showPopupMenu(hwnd uintptr) {
	hMenu, _, _ := procCreatePopupMenu.Call()
	if hMenu == 0 {
		return
	}
	defer procDestroyMenu.Call(hMenu)

	appendMenuItem(hMenu, IDM_CONSOLE, "⚙ 打开控制中心 (Settings Console)")
	appendMenuItem(hMenu, IDM_LOCK_NOW, "🔒 立即锁屏 (Arm Lock Screen)")
	appendMenuItem(hMenu, 0, "") // separator
	appendMenuItem(hMenu, IDM_WALLPAPER, "🖼 切换为动态壁纸模式 (Wallpaper Mode)")
	appendMenuItem(hMenu, IDM_WINDOWED, "🪟 切换为常规窗口 (Windowed Mode)")
	appendMenuItem(hMenu, 0, "") // separator
	appendMenuItem(hMenu, IDM_PAUSE, "⏯ 暂停 / 继续动画 (Pause/Resume)")
	appendMenuItem(hMenu, IDM_THEME, "🌓 切换深浅主题 (Toggle Theme)")
	appendMenuItem(hMenu, 0, "") // separator
	appendMenuItem(hMenu, IDM_QUIT, "❌ 退出程序 (Exit Agent Cockpit)")

	var pt POINT
	procGetCursorPos.Call(uintptr(unsafe.Pointer(&pt)))

	procSetForegroundWindow.Call(hwnd)
	procTrackPopupMenuEx.Call(hMenu, 0, uintptr(pt.X), uintptr(pt.Y), hwnd, 0)
}

func appendMenuItem(hMenu uintptr, id int, text string) {
	if text == "" {
		procAppendMenuW.Call(hMenu, MF_SEPARATOR, 0, 0)
		return
	}
	textPtr := syscall.StringToUTF16Ptr(text)
	procAppendMenuW.Call(hMenu, MF_STRING, uintptr(id), uintptr(unsafe.Pointer(textPtr)))
}

func (tm *Manager) Stop() {
	if tm.hwnd != 0 {
		procShellNotifyIconW.Call(NIM_DELETE, uintptr(unsafe.Pointer(&tm.nid)))
		procDestroyWindow.Call(tm.hwnd)
	}
}

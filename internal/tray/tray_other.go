//go:build !windows

package tray

type TrayCallbacks struct {
	OnOpenConsole func()
	OnLockNow     func()
	OnSetMode     func(mode string)
	OnTogglePause func()
	OnToggleTheme func()
	OnQuit        func()
}

type Manager struct{}

type WindowsTrayManager = Manager

func Start(cb TrayCallbacks) *Manager {
	return &Manager{}
}

func StartWindowsTray(cb TrayCallbacks) *Manager {
	return Start(cb)
}

func (tm *Manager) Stop() {}

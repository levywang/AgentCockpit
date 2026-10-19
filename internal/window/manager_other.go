//go:build !windows

package window

// Manager provides a no-op window manager on non-Windows platforms
type Manager struct{}

// NewManager creates a window manager instance
func NewManager() *Manager {
	return &Manager{}
}

func (m *Manager) GetAppHWND() uintptr {
	return 0
}

func (m *Manager) SendToWallpaper() {}

func (m *Manager) DetachFromWallpaper() {}

func (m *Manager) SetTopmost(topmost bool) {}

func (m *Manager) OpenConsole() {}

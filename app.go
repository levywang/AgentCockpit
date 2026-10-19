package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"agent-cockpit/internal/agent_watcher"
	"agent-cockpit/internal/config"
	"agent-cockpit/internal/system"
	"agent-cockpit/internal/tray"
	"agent-cockpit/internal/window"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx         context.Context
	config      config.Config
	children    []*exec.Cmd
	childrenMu  sync.Mutex
	hubListener net.Listener
	trayMgr     *tray.Manager
	winMgr      *window.Manager
}

// NewApp creates a new App data structure
func NewApp(cfg config.Config) *App {
	return &App{
		config:   cfg,
		children: make([]*exec.Cmd, 0),
		winMgr:   window.NewManager(),
	}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	// Start real-time hardware telemetry monitor (CPU, Memory, Disk, Network)
	system.InitSystemMonitor(ctx)

	// Start real-time AI coding behavior watcher (Antigravity, Claude Code, Codex, Process Tree)
	var watcher *agent_watcher.WatcherSupervisor
	watcher = agent_watcher.InitWatcher(ctx, func(ev agent_watcher.AgentEvent) {
		runtime.EventsEmit(ctx, "agent-event", ev)
		if watcher != nil {
			snap := watcher.GetService().GetFullDashboardSnapshot()
			runtime.EventsEmit(ctx, "dashboard-realtime-sync", snap)
		}
	})
	if a.config.WorkspaceDir != "" {
		_ = watcher.SetWorkspaceDir(a.config.WorkspaceDir)
	}

	// Start Windows Notification Area Tray Icon (Windows 小图标)
	if !a.config.IsChild {
		a.trayMgr = tray.Start(tray.TrayCallbacks{
			OnOpenConsole: func() {
				a.OpenConsole()
			},
			OnLockNow: func() {
				a.ApplyRunningMode("lock")
				if a.ctx != nil {
					runtime.EventsEmit(a.ctx, "arm-lock")
				}
			},
			OnSetMode: func(mode string) {
				a.ApplyRunningMode(mode)
			},
			OnTogglePause: func() {
				a.TogglePause()
			},
			OnToggleTheme: func() {
				if a.ctx != nil {
					runtime.EventsEmit(a.ctx, "toggle-theme")
				}
			},
			OnQuit: func() {
				a.Quit()
			},
		})

		// Apply initial running mode (lock, wallpaper, or windowed)
		go func() {
			time.Sleep(800 * time.Millisecond)
			if a.config.Mode != "" {
				a.ApplyRunningMode(a.config.Mode)
			}
		}()
	}

	monitors := window.GetMonitors()
	a.config.MonitorCount = len(monitors)

	// 1. Secondary Screen (Child Process) Setup
	if a.config.IsChild {
		if !a.config.Windowed && a.config.MonitorIndex < len(monitors) {
			s := monitors[a.config.MonitorIndex]
			runtime.WindowSetPosition(ctx, s.X, s.Y)
			runtime.WindowSetSize(ctx, s.Width, s.Height)
			runtime.WindowFullscreen(ctx)
		}

		// Watchdog: If primary process disappears, exit child
		if a.config.HubPort > 0 {
			go func() {
				ticker := time.NewTicker(1500 * time.Millisecond)
				defer ticker.Stop()
				client := &http.Client{Timeout: 1 * time.Second}
				hubURL := fmt.Sprintf("http://127.0.0.1:%d/ping", a.config.HubPort)

				for range ticker.C {
					resp, err := client.Get(hubURL)
					if err != nil || (resp != nil && resp.StatusCode != http.StatusOK) {
						// Parent is gone, terminate child
						runtime.Quit(ctx)
						return
					}
					if resp != nil {
						_ = resp.Body.Close()
					}
				}
			}()
		}
		return
	}

	// 2. Primary Screen Setup (Only in fullscreen lock mode)
	if a.config.Mode == "lock" && !a.config.Windowed && len(monitors) > 0 {
		s0 := monitors[0]
		runtime.WindowSetPosition(ctx, s0.X, s0.Y)
		runtime.WindowSetSize(ctx, s0.Width, s0.Height)
		runtime.WindowFullscreen(ctx)
	}

	// 3. Multi-Screen Dual-Screen Auto-Spawner (ONLY for full lock screen mode when 2 or more screens exist)
	if a.config.Mode == "lock" && !a.config.Windowed && len(monitors) > 1 {
		hubPort := a.startSyncHub()
		a.config.HubPort = hubPort

		exePath, err := os.Executable()
		if err == nil {
			go func() {
				// Allow primary monitor WebView2 controller to complete initialization
				time.Sleep(1000 * time.Millisecond)

				// Guard check: ensure we are still in lock mode and not windowed
				if a.config.Mode != "lock" || a.config.Windowed {
					return
				}

				for i := 1; i < len(monitors); i++ {
					childCmd := exec.Command(
						exePath,
						"--child",
						fmt.Sprintf("--monitor=%d", i),
						fmt.Sprintf("--hub-port=%d", hubPort),
						fmt.Sprintf("--passcode=%s", a.config.Passcode),
						fmt.Sprintf("--speed=%f", a.config.Speed),
						fmt.Sprintf("--theme=%s", a.config.Theme),
						"--windowed=false",
					)

					if err := childCmd.Start(); err == nil {
						a.childrenMu.Lock()
						a.children = append(a.children, childCmd)
						a.childrenMu.Unlock()
						fmt.Printf("[+] Spawned lock screen instance on Monitor #%d (PID: %d)\n", i+1, childCmd.Process.Pid)
					} else {
						fmt.Printf("[!] Failed to spawn screen instance on Monitor #%d: %v\n", i+1, err)
					}
					time.Sleep(300 * time.Millisecond)
				}
			}()
		}
	}
}

// startSyncHub launches an internal loopback synchronization HTTP server for multi-screen events
func (a *App) startSyncHub() int {
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		fmt.Printf("[!] Failed to start sync hub: %v\n", err)
		return 0
	}
	a.hubListener = l
	port := l.Addr().(*net.TCPAddr).Port

	mux := http.NewServeMux()

	mux.HandleFunc("/ping", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("pong"))
	})

	mux.HandleFunc("/unlock", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("unlocked"))

		go func() {
			time.Sleep(200 * time.Millisecond)
			a.killChildren()
			runtime.Quit(a.ctx)
		}()
	})

	mux.HandleFunc("/toggle-pause", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("toggled"))
		runtime.EventsEmit(a.ctx, "toggle-pause")
	})

	mux.HandleFunc("/config", func(w http.ResponseWriter, r *http.Request) {
		var newCfg config.Config
		if err := json.NewDecoder(r.Body).Decode(&newCfg); err == nil {
			if newCfg.Passcode != "" {
				a.config.Passcode = newCfg.Passcode
			}
			if newCfg.Speed > 0 {
				a.config.Speed = newCfg.Speed
			}
			if newCfg.Theme != "" {
				a.config.Theme = newCfg.Theme
			}
			a.config.TvNoiseEffect = newCfg.TvNoiseEffect
			a.config.MosaicEffect = newCfg.MosaicEffect
			a.config.ScanlineEffect = newCfg.ScanlineEffect
			if a.ctx != nil {
				runtime.EventsEmit(a.ctx, "config-updated", a.config)
			}
		}
		w.WriteHeader(http.StatusOK)
	})

	server := &http.Server{Handler: mux}
	go func() {
		_ = server.Serve(l)
	}()

	return port
}

func (a *App) killChildren() {
	a.childrenMu.Lock()
	defer a.childrenMu.Unlock()

	for _, child := range a.children {
		if child != nil && child.Process != nil {
			_ = child.Process.Kill()
		}
	}
	a.children = nil
}

// GetConfig returns the configured lock screen settings to frontend
func (a *App) GetConfig() config.Config {
	return a.config
}

// UpdateConfig updates runtime configuration from frontend console and persists to disk
func (a *App) UpdateConfig(cfg config.Config) {
	if cfg.Passcode != "" {
		a.config.Passcode = cfg.Passcode
	}
	if cfg.Speed > 0 {
		a.config.Speed = cfg.Speed
	}
	if cfg.Theme != "" {
		a.config.Theme = cfg.Theme
	}
	if cfg.Mode != "" && cfg.Mode != a.config.Mode {
		a.ApplyRunningMode(cfg.Mode)
	}
	if cfg.AutoLockMinutes >= 0 {
		a.config.AutoLockMinutes = cfg.AutoLockMinutes
	}
	a.config.LockOnStartup = cfg.LockOnStartup
	a.config.AiWatcherEnabled = cfg.AiWatcherEnabled
	a.config.TvNoiseEffect = cfg.TvNoiseEffect
	a.config.MosaicEffect = cfg.MosaicEffect
	a.config.ScanlineEffect = cfg.ScanlineEffect
	if cfg.WorkspaceDir != "" {
		a.config.WorkspaceDir = cfg.WorkspaceDir
		w := agent_watcher.InitWatcher(a.ctx, nil)
		_ = w.SetWorkspaceDir(cfg.WorkspaceDir)
	}

	_ = config.SaveConfigFile(a.config)

	if a.config.IsChild && a.config.HubPort > 0 {
		body, _ := json.Marshal(cfg)
		client := &http.Client{Timeout: 1 * time.Second}
		_, _ = client.Post(fmt.Sprintf("http://127.0.0.1:%d/config", a.config.HubPort), "application/json", bytes.NewReader(body))
	} else if a.ctx != nil {
		runtime.EventsEmit(a.ctx, "config-updated", a.config)
	}
}

// SetMode dynamically changes the running mode: "lock", "wallpaper", or "windowed"
func (a *App) SetMode(mode string) {
	a.ApplyRunningMode(mode)
}

// ApplyRunningMode configures window Z-order, fullscreen state, and desktop presentation
func (a *App) ApplyRunningMode(mode string) {
	switch mode {
	case "wallpaper":
		a.killChildren()
		a.config.Mode = "wallpaper"
		a.config.Windowed = false

		if a.ctx != nil {
			runtime.WindowUnfullscreen(a.ctx)
		}
		a.winMgr.SendToWallpaper()

		if a.ctx != nil {
			runtime.EventsEmit(a.ctx, "mode-changed", "wallpaper")
		}

	case "lock":
		a.winMgr.DetachFromWallpaper()
		a.config.Mode = "lock"
		a.config.Windowed = false

		if a.ctx != nil {
			runtime.WindowFullscreen(a.ctx)
			runtime.EventsEmit(a.ctx, "mode-changed", "lock")
		}
		a.winMgr.SetTopmost(true)

	case "windowed":
		fallthrough
	default:
		a.killChildren()
		a.winMgr.DetachFromWallpaper()
		a.config.Mode = "windowed"
		a.config.Windowed = true

		if a.ctx != nil {
			runtime.WindowUnfullscreen(a.ctx)
			runtime.WindowSetSize(a.ctx, 1280, 800)
			runtime.WindowCenter(a.ctx)
			runtime.EventsEmit(a.ctx, "mode-changed", "windowed")
		}
		a.winMgr.SetTopmost(false)
	}

	_ = config.SaveConfigFile(a.config)
}

// OpenConsole brings the window to the front and displays the configuration console
func (a *App) OpenConsole() {
	a.winMgr.OpenConsole()
	if a.ctx != nil {
		runtime.WindowShow(a.ctx)
		runtime.EventsEmit(a.ctx, "open-console")
	}
}

// SendToWallpaper returns the window to wallpaper layer
func (a *App) SendToWallpaper() {
	if a.config.Mode == "wallpaper" {
		a.winMgr.SendToWallpaper()
	}
}

// Unlock handles the unlock event from frontend
func (a *App) Unlock() {
	if a.config.IsChild && a.config.HubPort > 0 {
		client := &http.Client{Timeout: 2 * time.Second}
		_, _ = client.Post(fmt.Sprintf("http://127.0.0.1:%d/unlock", a.config.HubPort), "text/plain", nil)
		runtime.Quit(a.ctx)
		return
	}

	// If in wallpaper mode or windowed mode, unlocking disarms lock modal without exiting app
	if a.config.Mode == "wallpaper" || a.config.Mode == "windowed" {
		runtime.EventsEmit(a.ctx, "unlock")
		return
	}

	a.killChildren()
	runtime.Quit(a.ctx)
}

// TogglePause forwards pause state to other screens if running multi-screen
func (a *App) TogglePause() {
	if a.config.IsChild && a.config.HubPort > 0 {
		client := &http.Client{Timeout: 1 * time.Second}
		_, _ = client.Post(fmt.Sprintf("http://127.0.0.1:%d/toggle-pause", a.config.HubPort), "text/plain", nil)
	} else if a.hubListener != nil {
		runtime.EventsEmit(a.ctx, "toggle-pause")
	}
}

// Quit terminates the application and cleans up the tray icon
func (a *App) Quit() {
	if a.trayMgr != nil {
		a.trayMgr.Stop()
	}
	a.killChildren()
	runtime.Quit(a.ctx)
}

// GetSystemStats returns hardware telemetry
func (a *App) GetSystemStats() system.SystemStats {
	return system.GetSystemStats()
}

// GetRecentAgentEvents returns captured AI coding events from in-memory ring buffer
func (a *App) GetRecentAgentEvents(limit int) []agent_watcher.AgentEvent {
	w := agent_watcher.InitWatcher(a.ctx, nil)
	return w.GetRecentEvents(limit)
}

// GetActiveSessions returns currently active AI coding sessions
func (a *App) GetActiveSessions() []agent_watcher.ActiveSession {
	w := agent_watcher.InitWatcher(a.ctx, nil)
	return w.GetActiveSessions()
}

// GetTaskFeed returns real-time event feed for Window 1 (TASK FEED)
func (a *App) GetTaskFeed(limit int) []agent_watcher.FeedItemDTO {
	w := agent_watcher.InitWatcher(a.ctx, nil)
	return w.GetService().GetTaskFeed(limit)
}

// GetSolverTelemetry returns real-time metrics for Window 2 (PARTICLE SOLVER)
func (a *App) GetSolverTelemetry() agent_watcher.SolverTelemetryDTO {
	w := agent_watcher.InitWatcher(a.ctx, nil)
	return w.GetService().GetSolverTelemetry()
}

// GetWorkspaceCode returns real workspace code for Window 3 (WORKSPACE CODE)
func (a *App) GetWorkspaceCode() agent_watcher.WorkspaceCodeDTO {
	w := agent_watcher.InitWatcher(a.ctx, nil)
	return w.GetService().GetWorkspaceCode()
}

// GetAgentDispatchList returns real agent orchestration state for Window 4 (AGENTS DISPATCH)
func (a *App) GetAgentDispatchList() []agent_watcher.AgentDispatchDTO {
	w := agent_watcher.InitWatcher(a.ctx, nil)
	return w.GetService().GetAgentDispatchList()
}

// GetStagePipelineData returns real stage metrics and packet tags for top animation (上方的动画与指标)
func (a *App) GetStagePipelineData() agent_watcher.StagePipelineDataDTO {
	w := agent_watcher.InitWatcher(a.ctx, nil)
	return w.GetService().GetStagePipelineData()
}

// GetFullDashboardSnapshot returns full dashboard snapshot for 5 windows + top animation
func (a *App) GetFullDashboardSnapshot() agent_watcher.DashboardSnapshotDTO {
	w := agent_watcher.InitWatcher(a.ctx, nil)
	return w.GetService().GetFullDashboardSnapshot()
}

// SetWorkspaceDir updates the monitored directory from frontend console and persists to config
func (a *App) SetWorkspaceDir(dir string) (string, error) {
	cleanDir := strings.TrimSpace(dir)
	if cleanDir == "" {
		return "", fmt.Errorf("directory path cannot be empty")
	}
	absDir, err := filepath.Abs(cleanDir)
	if err != nil {
		return "", fmt.Errorf("invalid directory path: %w", err)
	}
	fi, err := os.Stat(absDir)
	if err != nil || !fi.IsDir() {
		return "", fmt.Errorf("directory does not exist: %s", absDir)
	}

	a.config.WorkspaceDir = absDir
	_ = config.SaveConfigFile(a.config)

	w := agent_watcher.InitWatcher(a.ctx, nil)
	if err := w.SetWorkspaceDir(absDir); err != nil {
		return "", err
	}

	if a.ctx != nil {
		runtime.EventsEmit(a.ctx, "config-updated", a.config)
		snap := w.GetService().GetFullDashboardSnapshot()
		runtime.EventsEmit(a.ctx, "dashboard-realtime-sync", snap)
	}
	return absDir, nil
}

// GetWorkspaceDir returns the currently monitored workspace directory
func (a *App) GetWorkspaceDir() string {
	if a.config.WorkspaceDir != "" {
		return a.config.WorkspaceDir
	}
	w := agent_watcher.InitWatcher(a.ctx, nil)
	return w.GetWorkspaceDir()
}

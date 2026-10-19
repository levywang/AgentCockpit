package agent_watcher

import (
	"context"
	"os"
	"sync"
	"time"
)

// WatcherSupervisor coordinates all log tailers and process sniffers
type WatcherSupervisor struct {
	ctx      context.Context
	cancel   context.CancelFunc
	store    *MemoryStore
	onEvent  func(AgentEvent)
	mu        sync.Mutex
	running   bool
	sources   []pollable
	wsWatcher *WorkspaceWatcher
}

type pollable interface {
	PollOnce()
}

// Global supervisor singleton
var (
	supervisor     *WatcherSupervisor
	supervisorOnce sync.Once
)

// InitWatcher initializes and starts the unified AI monitoring daemon
func InitWatcher(ctx context.Context, onEvent func(AgentEvent)) *WatcherSupervisor {
	supervisorOnce.Do(func() {
		wCtx, cancel := context.WithCancel(ctx)
		store := NewMemoryStore(500)
		service := GetWatcherService(store)

		emitHandler := func(ev AgentEvent) {
			store.Push(ev)
			service.RecordEvent(ev)
			if onEvent != nil {
				onEvent(ev)
			}
		}

		paths := DetectToolPaths()

		// Import source implementations dynamically via closure or registration
		supervisor = &WatcherSupervisor{
			ctx:     wCtx,
			cancel:  cancel,
			store:   store,
			onEvent: emitHandler,
			sources: make([]pollable, 0),
		}

		// Initialize real directory workspace file watcher
		cwd, _ := os.Getwd()
		supervisor.wsWatcher = NewWorkspaceWatcher(wCtx, cwd, service, emitHandler)
		service.SetWorkspaceWatcher(supervisor.wsWatcher)

		// Register source monitors
		supervisor.initSources(paths, emitHandler)

		// Start background polling daemon
		go supervisor.run()
	})

	return supervisor
}

// GetService returns the AgentWatcherService interface implementation
func (ws *WatcherSupervisor) GetService() AgentWatcherService {
	return GetWatcherService(ws.store)
}

func (ws *WatcherSupervisor) initSources(paths ToolPaths, emitHandler func(AgentEvent)) {
	// 1. Antigravity transcript tailer
	if len(paths.AntigravityBrainDirs) > 0 {
		ws.RegisterSource(NewAntigravityWatcher(paths.AntigravityBrainDirs, emitHandler))
	}

	// 2. Claude Code session tailer
	if len(paths.ClaudeCodeDirs) > 0 {
		ws.RegisterSource(NewClaudeCodeWatcher(paths.ClaudeCodeDirs, emitHandler))
	}

	// 3. Subprocess tree sniffer (cross-platform for any active AI tools)
	ws.RegisterSource(NewProcessTreeMonitor(emitHandler))
}

func (ws *WatcherSupervisor) RegisterSource(src pollable) {
	ws.mu.Lock()
	defer ws.mu.Unlock()
	ws.sources = append(ws.sources, src)
}

func (ws *WatcherSupervisor) run() {
	ws.running = true
	ticker := time.NewTicker(800 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-ws.ctx.Done():
			ws.running = false
			return
		case <-ticker.C:
			ws.mu.Lock()
			sourcesCopy := append([]pollable(nil), ws.sources...)
			ws.mu.Unlock()

			for _, s := range sourcesCopy {
				s.PollOnce()
			}
		}
	}
}

// GetRecentEvents returns the latest captured AI behavior events from memory
func (ws *WatcherSupervisor) GetRecentEvents(limit int) []AgentEvent {
	if ws.store == nil {
		return nil
	}
	return ws.store.GetRecent(limit)
}

// GetActiveSessions returns currently active AI sessions from memory
func (ws *WatcherSupervisor) GetActiveSessions() []ActiveSession {
	if ws.store == nil {
		return nil
	}
	return ws.store.GetSessions()
}

// PushEvent allows external injection of an event (e.g. from hooks or proxies)
func (ws *WatcherSupervisor) PushEvent(ev AgentEvent) {
	if ws.store != nil {
		ws.store.Push(ev)
	}
	if ws.onEvent != nil {
		ws.onEvent(ev)
	}
}

// SetWorkspaceDir updates the active directory being monitored by the workspace watcher
func (ws *WatcherSupervisor) SetWorkspaceDir(dir string) error {
	ws.mu.Lock()
	defer ws.mu.Unlock()
	if ws.wsWatcher != nil {
		return ws.wsWatcher.SetDirectory(dir)
	}
	return nil
}

// GetWorkspaceDir returns the current directory monitored by the workspace watcher
func (ws *WatcherSupervisor) GetWorkspaceDir() string {
	ws.mu.Lock()
	defer ws.mu.Unlock()
	if ws.wsWatcher != nil {
		return ws.wsWatcher.GetDirectory()
	}
	return ""
}


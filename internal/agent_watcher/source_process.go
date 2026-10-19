package agent_watcher

import (
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/shirou/gopsutil/v3/process"
)

// ProcessTreeMonitor periodically inspects the system process tree to detect
// AI coding tools (Claude, Antigravity, Codex) and their spawned subprocesses.
type ProcessTreeMonitor struct {
	mu           sync.Mutex
	knownPIDs    map[int32]time.Time
	aiParentPIDs map[int32]string // PID -> Tool Name
	emit         func(AgentEvent)
}

func NewProcessTreeMonitor(emit func(AgentEvent)) *ProcessTreeMonitor {
	return &ProcessTreeMonitor{
		knownPIDs:    make(map[int32]time.Time),
		aiParentPIDs: make(map[int32]string),
		emit:         emit,
	}
}

// PollOnce inspects running processes and identifies newly spawned AI sub-commands
func (ptm *ProcessTreeMonitor) PollOnce() {
	procs, err := process.Processes()
	if err != nil {
		return
	}

	ptm.mu.Lock()
	defer ptm.mu.Unlock()

	currentPIDs := make(map[int32]bool)
	now := time.Now()

	// 1. Identify primary AI tool parent processes
	for _, p := range procs {
		currentPIDs[p.Pid] = true
		name, _ := p.Name()
		nameLower := strings.ToLower(name)

		if strings.Contains(nameLower, "claude") {
			ptm.aiParentPIDs[p.Pid] = "claude_code"
		} else if strings.Contains(nameLower, "antigravity") || strings.Contains(nameLower, "agy") {
			ptm.aiParentPIDs[p.Pid] = "antigravity"
		} else if strings.Contains(nameLower, "codex") || strings.Contains(nameLower, "copilot") {
			ptm.aiParentPIDs[p.Pid] = "codex"
		} else if strings.Contains(nameLower, "node") || strings.Contains(nameLower, "python") {
			cmd, _ := p.Cmdline()
			cmdLower := strings.ToLower(cmd)
			if strings.Contains(cmdLower, "claude") {
				ptm.aiParentPIDs[p.Pid] = "claude_code"
			} else if strings.Contains(cmdLower, "antigravity") || strings.Contains(cmdLower, "agy") {
				ptm.aiParentPIDs[p.Pid] = "antigravity"
			}
		}
	}

	// 2. Identify child processes spawned by AI tool processes
	for _, p := range procs {
		ppid, err := p.Ppid()
		if err != nil {
			continue
		}

		source, isChildOfAI := ptm.aiParentPIDs[ppid]
		if isChildOfAI {
			// Register child as known or handle new appearance
			if _, seen := ptm.knownPIDs[p.Pid]; !seen {
				ptm.knownPIDs[p.Pid] = now

				cmdline, _ := p.Cmdline()
				pName, _ := p.Name()
				if cmdline == "" {
					cmdline = pName
				}

				displayCmd := cmdline
				if len(displayCmd) > 60 {
					displayCmd = displayCmd[:60] + "..."
				}

				ptm.emit(AgentEvent{
					ID:        fmt.Sprintf("PROC-%d", p.Pid),
					Timestamp: now.UnixMilli(),
					Source:    source,
					SessionID: fmt.Sprintf("pid-%d", ppid),
					Type:      EventProcess,
					Action:    "SPAWN_CHILD",
					Target:    pName,
					Summary:   fmt.Sprintf("[%s] Spawned: %s", source, displayCmd),
					Details: map[string]interface{}{
						"pid":     p.Pid,
						"ppid":    ppid,
						"name":    pName,
						"cmdline": cmdline,
					},
					PID: p.Pid,
				})
			}
		}
	}

	// Clean up stale known PIDs
	for pid, t := range ptm.knownPIDs {
		if !currentPIDs[pid] && now.Sub(t) > 2*time.Minute {
			delete(ptm.knownPIDs, pid)
		}
	}
	for pid := range ptm.aiParentPIDs {
		if !currentPIDs[pid] {
			delete(ptm.aiParentPIDs, pid)
		}
	}
}

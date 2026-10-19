package agent_watcher

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

// ClaudeCodeWatcher monitors Claude Code CLI activity files
type ClaudeCodeWatcher struct {
	claudeDirs []string
	offsets    map[string]int64
	mu         sync.Mutex
	emit       func(AgentEvent)
}

func NewClaudeCodeWatcher(claudeDirs []string, emit func(AgentEvent)) *ClaudeCodeWatcher {
	return &ClaudeCodeWatcher{
		claudeDirs: claudeDirs,
		offsets:    make(map[string]int64),
		emit:       emit,
	}
}

func (cw *ClaudeCodeWatcher) PollOnce() {
	for _, cDir := range cw.claudeDirs {
		// 1. History log
		histPath := filepath.Join(cDir, "history.jsonl")
		if fi, err := os.Stat(histPath); err == nil && fi.Size() > 0 {
			cw.tailClaudeFile("claude_cli", histPath, fi.Size())
		}

		// 2. Projects subfolder
		projDir := filepath.Join(cDir, "projects")
		if entries, err := os.ReadDir(projDir); err == nil {
			for _, e := range entries {
				if e.IsDir() {
					logPath := filepath.Join(projDir, e.Name(), "session.jsonl")
					if fi, err := os.Stat(logPath); err == nil && fi.Size() > 0 {
						cw.tailClaudeFile(e.Name(), logPath, fi.Size())
					}
				}
			}
		}
	}
}

func (cw *ClaudeCodeWatcher) tailClaudeFile(sessionID, path string, currentSize int64) {
	cw.mu.Lock()
	lastOffset, exists := cw.offsets[path]
	if !exists {
		if currentSize > 16384 {
			lastOffset = currentSize - 16384
		} else {
			lastOffset = 0
		}
		cw.offsets[path] = lastOffset
	}

	if currentSize <= lastOffset {
		cw.mu.Unlock()
		return
	}

	file, err := os.Open(path)
	if err != nil {
		cw.mu.Unlock()
		return
	}
	defer file.Close()

	_, _ = file.Seek(lastOffset, io.SeekStart)
	reader := bufio.NewReader(file)
	newOffset := lastOffset

	for {
		line, err := reader.ReadBytes('\n')
		if len(line) > 0 {
			newOffset += int64(len(line))
			cw.parseLine(sessionID, line)
		}
		if err != nil {
			break
		}
	}

	cw.offsets[path] = newOffset
	cw.mu.Unlock()
}

func (cw *ClaudeCodeWatcher) parseLine(sessionID string, line []byte) {
	var m map[string]interface{}
	if err := json.Unmarshal(line, &m); err != nil {
		return
	}

	now := time.Now().UnixMilli()

	// Extract prompt or action
	if display, ok := m["display"].(string); ok && strings.TrimSpace(display) != "" {
		cw.emit(AgentEvent{
			ID:        fmt.Sprintf("CC-%d", now%100000),
			Timestamp: now,
			Source:    "claude_code",
			SessionID: sessionID,
			Type:      EventToolCall,
			Action:    "EXEC_CMD",
			Target:    "CLI",
			Summary:   fmt.Sprintf("Claude: %s", display),
			Details:   m,
		})
	} else if cmd, ok := m["command"].(string); ok {
		cw.emit(AgentEvent{
			ID:        fmt.Sprintf("CC-%d", now%100000),
			Timestamp: now,
			Source:    "claude_code",
			SessionID: sessionID,
			Type:      EventToolCall,
			Action:    "RUN_CMD",
			Target:    cmd,
			Summary:   fmt.Sprintf("Claude Exec: %s", cmd),
			Details:   m,
		})
	}
}

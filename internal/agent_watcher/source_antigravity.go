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

// AntigravityWatcher tails Antigravity conversation transcripts
type AntigravityWatcher struct {
	brainDirs []string
	offsets   map[string]int64
	mu        sync.Mutex
	emit      func(AgentEvent)
}

func NewAntigravityWatcher(brainDirs []string, emit func(AgentEvent)) *AntigravityWatcher {
	return &AntigravityWatcher{
		brainDirs: brainDirs,
		offsets:   make(map[string]int64),
		emit:      emit,
	}
}

// PollOnce scans all transcript.jsonl files in brain directories and tails new lines
func (aw *AntigravityWatcher) PollOnce() {
	for _, brainDir := range aw.brainDirs {
		entries, err := os.ReadDir(brainDir)
		if err != nil {
			continue
		}

		for _, e := range entries {
			if !e.IsDir() {
				continue
			}
			convID := e.Name()
			transcriptPath := filepath.Join(brainDir, convID, ".system_generated", "logs", "transcript.jsonl")

			fi, err := os.Stat(transcriptPath)
			if err != nil || fi.Size() == 0 {
				continue
			}

			aw.tailFile(convID, transcriptPath, fi.Size())
		}
	}
}

type transcriptLine struct {
	StepIndex int                  `json:"step_index"`
	Type      string               `json:"type"`
	Content   string               `json:"content"`
	ToolCalls []transcriptToolCall `json:"tool_calls"`
}

type transcriptToolCall struct {
	Name      string                 `json:"name"`
	Arguments map[string]interface{} `json:"arguments"`
}

func (aw *AntigravityWatcher) tailFile(convID, path string, currentSize int64) {
	aw.mu.Lock()
	lastOffset, exists := aw.offsets[path]
	if !exists {
		// On first discovery: if file is large, start near the end (last 32KB)
		if currentSize > 32768 {
			lastOffset = currentSize - 32768
		} else {
			lastOffset = 0
		}
		aw.offsets[path] = lastOffset
	}

	if currentSize <= lastOffset {
		aw.mu.Unlock()
		return
	}

	file, err := os.Open(path)
	if err != nil {
		aw.mu.Unlock()
		return
	}
	defer file.Close()

	_, _ = file.Seek(lastOffset, io.SeekStart)
	reader := bufio.NewReader(file)
	newOffset := lastOffset

	for {
		lineBytes, err := reader.ReadBytes('\n')
		if len(lineBytes) > 0 {
			newOffset += int64(len(lineBytes))
			aw.parseLine(convID, lineBytes)
		}
		if err != nil {
			break
		}
	}

	aw.offsets[path] = newOffset
	aw.mu.Unlock()
}

func (aw *AntigravityWatcher) parseLine(convID string, raw []byte) {
	var item transcriptLine
	if err := json.Unmarshal(raw, &item); err != nil {
		return
	}

	now := time.Now().UnixMilli()

	// 1. Tool Calls
	if len(item.ToolCalls) > 0 {
		for _, tc := range item.ToolCalls {
			action := "TOOL_EXEC"
			target := ""
			summary := fmt.Sprintf("Invoked %s", tc.Name)

			switch tc.Name {
			case "replace_file_content", "multi_replace_file_content":
				action = "EDIT_FILE"
				if f, ok := tc.Arguments["TargetFile"].(string); ok {
					target = filepath.Base(f)
					summary = fmt.Sprintf("Modifying %s", target)
				}
			case "write_to_file":
				action = "CREATE_FILE"
				if f, ok := tc.Arguments["TargetFile"].(string); ok {
					target = filepath.Base(f)
					summary = fmt.Sprintf("Writing to %s", target)
				}
			case "run_command":
				action = "RUN_CMD"
				if cmd, ok := tc.Arguments["CommandLine"].(string); ok {
					target = cmd
					if len(cmd) > 40 {
						target = cmd[:40] + "..."
					}
					summary = fmt.Sprintf("Exec: %s", target)
				}
			case "grep_search":
				action = "SEARCH_GREP"
				if q, ok := tc.Arguments["Query"].(string); ok {
					target = q
					summary = fmt.Sprintf("Grep: %s", q)
				}
			case "view_file":
				action = "READ_FILE"
				if f, ok := tc.Arguments["AbsolutePath"].(string); ok {
					target = filepath.Base(f)
					summary = fmt.Sprintf("Viewing %s", target)
				}
			case "read_url_content":
				action = "WEB_FETCH"
				if u, ok := tc.Arguments["Url"].(string); ok {
					target = u
					summary = fmt.Sprintf("Web: %s", u)
				}
			}

			aw.emit(AgentEvent{
				ID:        fmt.Sprintf("AGY-%d-%d", item.StepIndex, time.Now().UnixNano()%10000),
				Timestamp: now,
				Source:    "antigravity",
				SessionID: convID,
				Type:      EventToolCall,
				Action:    action,
				Target:    target,
				Summary:   summary,
				Details:   tc.Arguments,
			})
		}
		return
	}

	// 2. User input
	if item.Type == "USER_INPUT" && strings.TrimSpace(item.Content) != "" {
		snippet := strings.TrimSpace(item.Content)
		if len(snippet) > 60 {
			snippet = snippet[:60] + "..."
		}
		aw.emit(AgentEvent{
			ID:        fmt.Sprintf("AGY-U-%d", item.StepIndex),
			Timestamp: now,
			Source:    "antigravity",
			SessionID: convID,
			Type:      EventPrompt,
			Action:    "USER_PROMPT",
			Target:    "Console",
			Summary:   fmt.Sprintf("User: %s", snippet),
			Details:   map[string]interface{}{"prompt": item.Content},
		})
	}
}

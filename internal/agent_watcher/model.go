package agent_watcher

// EventType defines the category of an AI event
type EventType string

const (
	EventPrompt   EventType = "USER_PROMPT" // User prompt / instruction
	EventThought  EventType = "AGENT_THINK" // AI thinking / reasoning
	EventToolCall EventType = "TOOL_CALL"   // Tool execution (file edit, run command, search, etc.)
	EventProcess  EventType = "PROC_SPAWN"  // Spawned subprocess (git, npm, python, compiler)
	EventNetAPI   EventType = "NET_API"     // Model API request / response
)

// AgentEvent represents a single normalized AI coding action
type AgentEvent struct {
	ID         string                 `json:"id"`
	Timestamp  int64                  `json:"timestamp"`
	Source     string                 `json:"source"`     // "antigravity" | "claude_code" | "codex" | "system"
	SessionID  string                 `json:"sessionId"`  // Active session / conversation ID
	Type       EventType              `json:"type"`       // USER_PROMPT | AGENT_THINK | TOOL_CALL | PROC_SPAWN
	Action     string                 `json:"action"`     // e.g. "RUN_CMD", "EDIT_FILE", "READ_FILE", "THINK"
	Target     string                 `json:"target"`     // file path, command string, target URL
	Summary    string                 `json:"summary"`    // concise human-readable description
	Details    map[string]interface{} `json:"details"`    // tool args, diff snippets, exit codes
	PID        int32                  `json:"pid"`        // child process PID if applicable
	DurationMs int64                  `json:"durationMs"` // execution duration in ms
}

// ActiveSession represents a currently detected AI tool session
type ActiveSession struct {
	Source      string `json:"source"`
	SessionID   string `json:"sessionId"`
	Title       string `json:"title"`
	LastEventAt int64  `json:"lastEventAt"`
	Status      string `json:"status"` // "active" | "idle"
}

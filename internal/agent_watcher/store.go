package agent_watcher

import (
	"sync"
	"time"
)

// MemoryStore manages in-memory event ring buffer and active session registry.
// No persistent disk writes; completely ephemeral and dropped on program termination.
type MemoryStore struct {
	mu       sync.RWMutex
	events   []AgentEvent
	capacity int
	sessions map[string]*ActiveSession
}

func NewMemoryStore(capacity int) *MemoryStore {
	if capacity <= 0 {
		capacity = 500
	}
	return &MemoryStore{
		events:   make([]AgentEvent, 0, capacity),
		capacity: capacity,
		sessions: make(map[string]*ActiveSession),
	}
}

// Push appends a new event, evicting the oldest if capacity is exceeded.
func (m *MemoryStore) Push(ev AgentEvent) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if len(m.events) >= m.capacity {
		// Drop oldest element
		m.events = m.events[1:]
	}
	m.events = append(m.events, ev)

	// Update session activity
	if ev.SessionID != "" {
		sKey := ev.Source + ":" + ev.SessionID
		if sess, exists := m.sessions[sKey]; exists {
			sess.LastEventAt = ev.Timestamp
			sess.Status = "active"
		} else {
			m.sessions[sKey] = &ActiveSession{
				Source:      ev.Source,
				SessionID:   ev.SessionID,
				Title:       ev.Source + " // " + ev.Action,
				LastEventAt: ev.Timestamp,
				Status:      "active",
			}
		}
	}
}

// GetRecent returns up to n most recent events in chronological order
func (m *MemoryStore) GetRecent(n int) []AgentEvent {
	m.mu.RLock()
	defer m.mu.RUnlock()

	total := len(m.events)
	if n <= 0 || n > total {
		n = total
	}

	result := make([]AgentEvent, n)
	copy(result, m.events[total-n:])
	return result
}

// GetSessions returns a snapshot of active AI sessions, marking stale ones as idle
func (m *MemoryStore) GetSessions() []ActiveSession {
	m.mu.Lock()
	defer m.mu.Unlock()

	now := time.Now().UnixMilli()
	list := make([]ActiveSession, 0, len(m.sessions))

	for _, s := range m.sessions {
		// If no event in 45 seconds, mark as idle
		if now-s.LastEventAt > 45000 {
			s.Status = "idle"
		}
		list = append(list, *s)
	}

	return list
}

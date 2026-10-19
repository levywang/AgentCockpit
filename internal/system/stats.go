package system

import (
	"context"
	"os"
	"sync"
	"time"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/shirou/gopsutil/v3/net"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// SystemStats represents the computer's real-time hardware telemetry
type SystemStats struct {
	CPUPercent   float64 `json:"cpuPercent"`
	CPUCores     int     `json:"cpuCores"`
	CPUModel     string  `json:"cpuModel"`

	MemTotal     uint64  `json:"memTotal"`
	MemUsed      uint64  `json:"memUsed"`
	MemFree      uint64  `json:"memFree"`
	MemPercent   float64 `json:"memPercent"`

	DiskTotal    uint64  `json:"diskTotal"`
	DiskUsed     uint64  `json:"diskUsed"`
	DiskFree     uint64  `json:"diskFree"`
	DiskPercent  float64 `json:"diskPercent"`
	DiskPath     string  `json:"diskPath"`

	NetSentRate  float64 `json:"netSentRate"`  // Bytes per second
	NetRecvRate  float64 `json:"netRecvRate"`  // Bytes per second
	NetTotalSent uint64  `json:"netTotalSent"` // Total bytes sent
	NetTotalRecv uint64  `json:"netTotalRecv"` // Total bytes received

	Timestamp    int64   `json:"timestamp"`
}

// SystemMonitor manages continuous hardware metrics sampling
type SystemMonitor struct {
	ctx        context.Context
	mu         sync.RWMutex
	lastStats  SystemStats
	lastNet    *net.IOCountersStat
	lastNetAt  time.Time
	cpuModel   string
	cpuCores   int
	diskPath   string
}

var (
	monitor     *SystemMonitor
	monitorOnce sync.Once
)

// InitSystemMonitor initializes and starts the background telemetry daemon
func InitSystemMonitor(ctx context.Context) *SystemMonitor {
	monitorOnce.Do(func() {
		cores, _ := cpu.Counts(true)
		model := "Unknown CPU"
		if infos, err := cpu.Info(); err == nil && len(infos) > 0 {
			model = infos[0].ModelName
		}

		drive := os.Getenv("SystemDrive")
		if drive == "" {
			drive = "C:"
		}
		drive += "\\"

		monitor = &SystemMonitor{
			ctx:       ctx,
			cpuCores:  cores,
			cpuModel:  model,
			diskPath:  drive,
			lastNetAt: time.Now(),
		}

		// Initial sample
		monitor.sample()

		// Start polling loop: 1.5-second interval
		go monitor.loop()
	})
	return monitor
}

func (sm *SystemMonitor) loop() {
	ticker := time.NewTicker(1500 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-sm.ctx.Done():
			return
		case <-ticker.C:
			stats := sm.sample()
			runtime.EventsEmit(sm.ctx, "system-stats", stats)
		}
	}
}

func (sm *SystemMonitor) sample() SystemStats {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	stats := SystemStats{
		CPUCores:  sm.cpuCores,
		CPUModel:  sm.cpuModel,
		DiskPath:  sm.diskPath,
		Timestamp: time.Now().UnixMilli(),
	}

	// 1. CPU Usage
	percentages, err := cpu.Percent(0, false)
	if err == nil && len(percentages) > 0 {
		stats.CPUPercent = percentages[0]
	}

	// 2. Memory Usage
	vm, err := mem.VirtualMemory()
	if err == nil {
		stats.MemTotal = vm.Total
		stats.MemUsed = vm.Used
		stats.MemFree = vm.Available
		stats.MemPercent = vm.UsedPercent
	}

	// 3. Disk Usage
	du, err := disk.Usage(sm.diskPath)
	if err == nil {
		stats.DiskTotal = du.Total
		stats.DiskUsed = du.Used
		stats.DiskFree = du.Free
		stats.DiskPercent = du.UsedPercent
	}

	// 4. Network Rates & Totals
	netIO, err := net.IOCounters(false)
	now := time.Now()
	if err == nil && len(netIO) > 0 {
		current := &netIO[0]
		stats.NetTotalSent = current.BytesSent
		stats.NetTotalRecv = current.BytesRecv

		if sm.lastNet != nil {
			elapsed := now.Sub(sm.lastNetAt).Seconds()
			if elapsed > 0 {
				sentDelta := float64(current.BytesSent - sm.lastNet.BytesSent)
				recvDelta := float64(current.BytesRecv - sm.lastNet.BytesRecv)

				if sentDelta >= 0 {
					stats.NetSentRate = sentDelta / elapsed
				}
				if recvDelta >= 0 {
					stats.NetRecvRate = recvDelta / elapsed
				}
			}
		}

		sm.lastNet = current
		sm.lastNetAt = now
	}

	sm.lastStats = stats
	return stats
}

// GetStats returns the most recently captured hardware metrics snapshot
func (sm *SystemMonitor) GetStats() SystemStats {
	sm.mu.RLock()
	defer sm.mu.RUnlock()
	return sm.lastStats
}

// GetSystemStats provides a package-level helper to retrieve the latest telemetry
func GetSystemStats() SystemStats {
	if monitor != nil {
		return monitor.GetStats()
	}
	return SystemStats{
		CPUCores:  4,
		CPUModel:  "Telemetry Initializing...",
		Timestamp: time.Now().UnixMilli(),
	}
}

import { useState, useEffect, useRef } from 'react';
import type { SystemStatusData } from '../types';

export interface SystemStatusHistory {
  cpu: number[];
  mem: number[];
  netDown: number[];
  netUp: number[];
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const safeI = Math.min(i, sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, safeI)).toFixed(dm))} ${sizes[safeI]}`;
}

export function formatRate(bytesPerSec: number, decimals = 1): string {
  if (!bytesPerSec || bytesPerSec <= 0) return '0.0 KB/s';
  if (bytesPerSec < 1024) return `${bytesPerSec.toFixed(0)} B/s`;
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(decimals)} KB/s`;
  return `${(bytesPerSec / (1024 * 1024)).toFixed(decimals)} MB/s`;
}

const DEFAULT_STATS: SystemStatusData = {
  cpuPercent: 0,
  cpuCores: 8,
  cpuModel: 'Detecting CPU...',
  memTotal: 16 * 1024 * 1024 * 1024,
  memUsed: 8 * 1024 * 1024 * 1024,
  memFree: 8 * 1024 * 1024 * 1024,
  memPercent: 50,
  diskTotal: 512 * 1024 * 1024 * 1024,
  diskUsed: 256 * 1024 * 1024 * 1024,
  diskFree: 256 * 1024 * 1024 * 1024,
  diskPercent: 50,
  diskPath: 'C:',
  netSentRate: 0,
  netRecvRate: 0,
  netTotalSent: 0,
  netTotalRecv: 0,
  timestamp: Date.now(),
};

const MAX_HISTORY = 24;

export function useSystemStatus() {
  const [stats, setStats] = useState<SystemStatusData>(DEFAULT_STATS);
  const [isLive, setIsLive] = useState(false);
  const [history, setHistory] = useState<SystemStatusHistory>({
    cpu: Array(MAX_HISTORY).fill(15),
    mem: Array(MAX_HISTORY).fill(50),
    netDown: Array(MAX_HISTORY).fill(0),
    netUp: Array(MAX_HISTORY).fill(0),
  });

  const lastUpdateRef = useRef<number>(Date.now());

  useEffect(() => {
    let unmounted = false;
    const w = typeof window !== 'undefined' ? (window as any) : null;

    const pushHistory = (newStats: SystemStatusData) => {
      setHistory(prev => ({
        cpu: [...prev.cpu.slice(1), Math.max(0, Math.min(100, newStats.cpuPercent))],
        mem: [...prev.mem.slice(1), Math.max(0, Math.min(100, newStats.memPercent))],
        netDown: [...prev.netDown.slice(1), newStats.netRecvRate],
        netUp: [...prev.netUp.slice(1), newStats.netSentRate],
      }));
    };

    const handleUpdate = (data: any) => {
      if (unmounted || !data) return;
      setIsLive(true);
      lastUpdateRef.current = Date.now();

      const parsed: SystemStatusData = {
        cpuPercent: typeof data.cpuPercent === 'number' ? data.cpuPercent : 0,
        cpuCores: data.cpuCores || 8,
        cpuModel: data.cpuModel || 'CPU Hardware',
        memTotal: data.memTotal || 0,
        memUsed: data.memUsed || 0,
        memFree: data.memFree || 0,
        memPercent: typeof data.memPercent === 'number' ? data.memPercent : 0,
        diskTotal: data.diskTotal || 0,
        diskUsed: data.diskUsed || 0,
        diskFree: data.diskFree || 0,
        diskPercent: typeof data.diskPercent === 'number' ? data.diskPercent : 0,
        diskPath: data.diskPath || 'C:',
        netSentRate: typeof data.netSentRate === 'number' ? data.netSentRate : 0,
        netRecvRate: typeof data.netRecvRate === 'number' ? data.netRecvRate : 0,
        netTotalSent: data.netTotalSent || 0,
        netTotalRecv: data.netTotalRecv || 0,
        timestamp: data.timestamp || Date.now(),
      };

      setStats(parsed);
      pushHistory(parsed);
    };

    // 1. Try initial fetch via Wails binding
    if (w?.go?.main?.App?.GetSystemStats) {
      w.go.main.App.GetSystemStats()
        .then((initial: any) => {
          if (!unmounted && initial) {
            handleUpdate(initial);
          }
        })
        .catch((err: any) => console.warn('[SystemStatus] initial fetch err:', err));
    }

    // 2. Subscribe to real-time events emitted by Go background daemon
    if (w?.runtime?.EventsOn) {
      w.runtime.EventsOn('system-status', handleUpdate);
    }

    // 3. Fallback / Dev Simulator (only active if no real Go Wails events arrive)
    const fallbackTimer = setInterval(() => {
      // If we haven't received a live update in the last 2.5 seconds, run subtle simulation
      if (Date.now() - lastUpdateRef.current > 2500) {
        setIsLive(false);
        setStats(prev => {
          const cpuP = Math.max(8, Math.min(95, prev.cpuPercent + (Math.random() - 0.48) * 8));
          const memP = Math.max(30, Math.min(85, prev.memPercent + (Math.random() - 0.5) * 1.5));
          const down = Math.max(1024, Math.random() < 0.2 ? Math.random() * 8 * 1024 * 1024 : Math.random() * 450 * 1024);
          const up = Math.max(512, Math.random() < 0.2 ? Math.random() * 2 * 1024 * 1024 : Math.random() * 120 * 1024);
          const nextData: SystemStatusData = {
            ...prev,
            cpuPercent: Math.round(cpuP * 10) / 10,
            memPercent: Math.round(memP * 10) / 10,
            memUsed: Math.round((memP / 100) * prev.memTotal),
            netRecvRate: down,
            netSentRate: up,
            netTotalRecv: prev.netTotalRecv + down,
            netTotalSent: prev.netTotalSent + up,
            timestamp: Date.now(),
          };
          pushHistory(nextData);
          return nextData;
        });
      }
    }, 1000);

    return () => {
      unmounted = true;
      clearInterval(fallbackTimer);
      if (w?.runtime?.EventsOff) {
        w.runtime.EventsOff('system-status');
      }
    };
  }, []);

  return { stats, history, isLive };
}

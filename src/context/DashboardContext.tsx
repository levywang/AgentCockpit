import React, { createContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type {
  ThemeMode,
  AppMode,
  TaskItem,
  AgentItem,
  WorkflowItem,
  FeedItem,
  AgentEvent,
  SolverTelemetry,
  WorkspaceCodeData,
  AgentDispatchItem,
  StagePipelineData,
  DashboardSnapshot
} from '../types';
import { CONFIG, mulberry32 } from '../constants/config';

interface DashboardContextType {
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  toggleTheme: () => void;
  mode: AppMode;
  setMode: (m: AppMode) => void;
  updateMode: (m: AppMode) => void;
  autoLockMinutes: number;
  updateAutoLockMinutes: (mins: number) => void;
  lockOnStartup: boolean;
  updateLockOnStartup: (val: boolean) => void;
  aiWatcherEnabled: boolean;
  updateAiWatcherEnabled: (val: boolean) => void;
  workspaceDir: string;
  updateWorkspaceDir: (dir: string) => Promise<{ success: boolean; message: string }>;

  // Visual Effects state and mutators
  tvNoiseEffect: boolean;
  updateTvNoiseEffect: (val: boolean) => void;
  mosaicEffect: boolean;
  updateMosaicEffect: (val: boolean) => void;
  scanlineEffect: boolean;
  updateScanlineEffect: (val: boolean) => void;
  triggerTvFlicker: () => void;
  tvFlickerCount: number;

  isPaused: boolean;
  setIsPaused: (p: boolean) => void;
  togglePause: () => void;
  animSpeed: number;
  setAnimSpeed: (s: number) => void;
  isLocked: boolean;
  setIsLocked: (l: boolean) => void;
  isLockModalOpen: boolean;
  openLockModal: () => void;
  closeLockModal: () => void;
  unlockWithPasscode: (code: string) => boolean;
  configPasscode: string;

  // Web Frontend Console state and mutators
  isConsoleOpen: boolean;
  openConsole: () => void;
  closeConsole: () => void;
  updatePasscode: (code: string) => void;
  updateSpeed: (speed: number) => void;
  updateTheme: (theme: ThemeMode) => void;

  // Simulation Data
  tasks: TaskItem[];
  agents: AgentItem[];
  wfs: WorkflowItem[];
  feed: FeedItem[];
  hubWf: number[];
  hubCh: number[];
  hoverHub: number;
  setHoverHub: (idx: number) => void;

  // Code Typewriter state
  codeMeta: { file: string; agentCode: string; agentName: string };
  codeRows: { ln: number; text: string; isCurrent: boolean }[];

  // Metrics
  cfl: number;
  stepN: number;
  setStepN: React.Dispatch<React.SetStateAction<number>>;
  clockStr: string;
  hiIdx: number;
  simT: number;

  // Real AI Watcher Telemetry & Five Windows State
  realFeed: FeedItem[];
  realSolver: SolverTelemetry;
  realCode: WorkspaceCodeData;
  realAgents: AgentDispatchItem[];
  realStageData: StagePipelineData;
  isWatcherLive: boolean;

  // Actions
  triggerHubImpact: (hubIdx: number) => void;
  hubImpacts: number[];
}

export const DashboardContext = createContext<DashboardContextType | null>(null);

const R = mulberry32(20261016);
const NW = CONFIG.workflows.length;

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Controls State
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('agent-cockpit-theme') as ThemeMode;
      if (saved) return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  });
  const [isPaused, setIsPaused] = useState(false);
  const [animSpeed, setAnimSpeed] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('agent-cockpit-speed');
      if (saved) {
        const val = parseFloat(saved);
        if (!isNaN(val) && val > 0) return val;
      }
    }
    return 1.0;
  });
  const [isLocked, setIsLocked] = useState(false);
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [configPasscode, setConfigPasscode] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('agent-cockpit-passcode');
      if (saved) return saved;
    }
    return '1234';
  });

  // Mode and lock screen / wallpaper options (Default: Windowed mode)
  const [mode, setMode] = useState<AppMode>('windowed');
  const [autoLockMinutes, setAutoLockMinutes] = useState<number>(0);
  const [lockOnStartup, setLockOnStartup] = useState<boolean>(false);
  const [aiWatcherEnabled, setAiWatcherEnabled] = useState<boolean>(true);
  const [workspaceDir, setWorkspaceDir] = useState<string>('');

  // Visual Effects states
  const [tvNoiseEffect, setTvNoiseEffect] = useState<boolean>(false);
  const [mosaicEffect, setMosaicEffect] = useState<boolean>(false);
  const [scanlineEffect, setScanlineEffect] = useState<boolean>(false);
  const [tvFlickerCount, setTvFlickerCount] = useState<number>(0);

  const triggerTvFlicker = useCallback(() => {
    setTvFlickerCount(c => c + 1);
  }, []);

  const openConsole = useCallback(() => setIsConsoleOpen(true), []);
  const closeConsole = useCallback(() => {
    setIsConsoleOpen(false);
    if (mode === 'wallpaper') {
      const w = window as any;
      if (w.go?.main?.App?.SendToWallpaper) {
        w.go.main.App.SendToWallpaper().catch(console.error);
      }
    }
  }, [mode]);

  const updatePasscode = useCallback((code: string) => {
    const clean = code.trim();
    if (!clean) return;
    setConfigPasscode(clean);
    if (typeof window !== 'undefined') {
      localStorage.setItem('agent-cockpit-passcode', clean);
      const w = window as any;
      if (w.go?.main?.App?.UpdateConfig) {
        w.go.main.App.UpdateConfig({
          passcode: clean,
          speed: animSpeed,
          theme,
          mode,
          autoLockMinutes,
          lockOnStartup,
          aiWatcherEnabled,
          tvNoiseEffect,
          mosaicEffect,
          scanlineEffect,
          workspaceDir
        }).catch(console.error);
      }
    }
  }, [aiWatcherEnabled, animSpeed, autoLockMinutes, lockOnStartup, mode, mosaicEffect, scanlineEffect, theme, tvNoiseEffect, workspaceDir]);

  const updateSpeed = useCallback((s: number) => {
    const val = Math.max(0.1, Math.min(10.0, s));
    setAnimSpeed(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('agent-cockpit-speed', String(val));
      const w = window as any;
      if (w.go?.main?.App?.UpdateConfig) {
        w.go.main.App.UpdateConfig({
          passcode: configPasscode,
          speed: val,
          theme,
          mode,
          autoLockMinutes,
          lockOnStartup,
          aiWatcherEnabled,
          tvNoiseEffect,
          mosaicEffect,
          scanlineEffect,
          workspaceDir
        }).catch(console.error);
      }
    }
  }, [aiWatcherEnabled, autoLockMinutes, configPasscode, lockOnStartup, mode, mosaicEffect, scanlineEffect, theme, tvNoiseEffect, workspaceDir]);

  const updateTheme = useCallback((t: ThemeMode) => {
    setTheme(t);
    if (typeof window !== 'undefined') {
      localStorage.setItem('agent-cockpit-theme', t);
      const w = window as any;
      if (w.go?.main?.App?.UpdateConfig) {
        w.go.main.App.UpdateConfig({
          passcode: configPasscode,
          speed: animSpeed,
          theme: t,
          mode,
          autoLockMinutes,
          lockOnStartup,
          aiWatcherEnabled,
          tvNoiseEffect,
          mosaicEffect,
          scanlineEffect,
          workspaceDir
        }).catch(console.error);
      }
    }
  }, [aiWatcherEnabled, animSpeed, autoLockMinutes, configPasscode, lockOnStartup, mode, mosaicEffect, scanlineEffect, tvNoiseEffect, workspaceDir]);

  const updateMode = useCallback((m: AppMode) => {
    setMode(m);
    if (m === 'wallpaper') {
      setIsLocked(false);
      setIsLockModalOpen(false);
      setIsConsoleOpen(false);
    } else if (m === 'lock') {
      setIsLocked(true);
    }
    if (typeof window !== 'undefined') {
      const w = window as any;
      if (w.go?.main?.App?.SetMode) {
        w.go.main.App.SetMode(m).catch(console.error);
      }
    }
  }, []);

  const updateAutoLockMinutes = useCallback((mins: number) => {
    setAutoLockMinutes(mins);
    if (typeof window !== 'undefined') {
      const w = window as any;
      if (w.go?.main?.App?.UpdateConfig) {
        w.go.main.App.UpdateConfig({
          passcode: configPasscode,
          speed: animSpeed,
          theme,
          mode,
          autoLockMinutes: mins,
          lockOnStartup,
          aiWatcherEnabled,
          tvNoiseEffect,
          mosaicEffect,
          scanlineEffect
        }).catch(console.error);
      }
    }
  }, [aiWatcherEnabled, animSpeed, configPasscode, lockOnStartup, mode, mosaicEffect, scanlineEffect, theme, tvNoiseEffect]);

  const updateLockOnStartup = useCallback((val: boolean) => {
    setLockOnStartup(val);
    if (typeof window !== 'undefined') {
      const w = window as any;
      if (w.go?.main?.App?.UpdateConfig) {
        w.go.main.App.UpdateConfig({
          passcode: configPasscode,
          speed: animSpeed,
          theme,
          mode,
          autoLockMinutes,
          lockOnStartup: val,
          aiWatcherEnabled,
          tvNoiseEffect,
          mosaicEffect,
          scanlineEffect
        }).catch(console.error);
      }
    }
  }, [aiWatcherEnabled, animSpeed, autoLockMinutes, configPasscode, mode, mosaicEffect, scanlineEffect, theme, tvNoiseEffect]);

  const updateAiWatcherEnabled = useCallback((val: boolean) => {
    setAiWatcherEnabled(val);
    if (typeof window !== 'undefined') {
      const w = window as any;
      if (w.go?.main?.App?.UpdateConfig) {
        w.go.main.App.UpdateConfig({
          passcode: configPasscode,
          speed: animSpeed,
          theme,
          mode,
          autoLockMinutes,
          lockOnStartup,
          aiWatcherEnabled: val,
          tvNoiseEffect,
          mosaicEffect,
          scanlineEffect
        }).catch(console.error);
      }
    }
  }, [animSpeed, autoLockMinutes, configPasscode, lockOnStartup, mode, mosaicEffect, scanlineEffect, theme, tvNoiseEffect]);

  const updateTvNoiseEffect = useCallback((val: boolean) => {
    setTvNoiseEffect(val);
    if (typeof window !== 'undefined') {
      const w = window as any;
      if (w.go?.main?.App?.UpdateConfig) {
        w.go.main.App.UpdateConfig({
          passcode: configPasscode,
          speed: animSpeed,
          theme,
          mode,
          autoLockMinutes,
          lockOnStartup,
          aiWatcherEnabled,
          tvNoiseEffect: val,
          mosaicEffect,
          scanlineEffect
        }).catch(console.error);
      }
    }
  }, [aiWatcherEnabled, animSpeed, autoLockMinutes, configPasscode, lockOnStartup, mode, mosaicEffect, scanlineEffect, theme]);

  const updateMosaicEffect = useCallback((val: boolean) => {
    setMosaicEffect(val);
    if (typeof window !== 'undefined') {
      const w = window as any;
      if (w.go?.main?.App?.UpdateConfig) {
        w.go.main.App.UpdateConfig({
          passcode: configPasscode,
          speed: animSpeed,
          theme,
          mode,
          autoLockMinutes,
          lockOnStartup,
          aiWatcherEnabled,
          tvNoiseEffect,
          mosaicEffect: val,
          scanlineEffect
        }).catch(console.error);
      }
    }
  }, [aiWatcherEnabled, animSpeed, autoLockMinutes, configPasscode, lockOnStartup, mode, scanlineEffect, theme, tvNoiseEffect]);

  const updateScanlineEffect = useCallback((val: boolean) => {
    setScanlineEffect(val);
    if (typeof window !== 'undefined') {
      const w = window as any;
      if (w.go?.main?.App?.UpdateConfig) {
        w.go.main.App.UpdateConfig({
          passcode: configPasscode,
          speed: animSpeed,
          theme,
          mode,
          autoLockMinutes,
          lockOnStartup,
          aiWatcherEnabled,
          tvNoiseEffect,
          mosaicEffect,
          scanlineEffect: val,
          workspaceDir
        }).catch(console.error);
      }
    }
  }, [aiWatcherEnabled, animSpeed, autoLockMinutes, configPasscode, lockOnStartup, mode, mosaicEffect, theme, tvNoiseEffect, workspaceDir]);

  const updateWorkspaceDir = useCallback(async (dir: string): Promise<{ success: boolean; message: string }> => {
    const clean = dir.trim();
    if (!clean) return { success: false, message: '工作空间目录不能为空' };
    setWorkspaceDir(clean);
    if (typeof window !== 'undefined') {
      const w = window as any;
      if (w.go?.main?.App?.SetWorkspaceDir) {
        try {
          const res = await w.go.main.App.SetWorkspaceDir(clean);
          const resolved = typeof res === 'string' ? res : clean;
          setWorkspaceDir(resolved);
          return { success: true, message: resolved };
        } catch (err: any) {
          const msg = err?.message || String(err);
          return { success: false, message: msg };
        }
      }
    }
    return { success: true, message: clean };
  }, []);

  // Synchronize configuration from Wails Go Backend if available
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const w = window as any;
      if (w.go?.main?.App?.GetConfig) {
        w.go.main.App.GetConfig()
          .then((cfg: any) => {
            if (cfg) {
              if (cfg.theme === 'dark' || cfg.theme === 'light') setTheme(cfg.theme);
              if (typeof cfg.speed === 'number' && cfg.speed > 0) setAnimSpeed(cfg.speed);
              if (cfg.passcode) setConfigPasscode(cfg.passcode);
              if (cfg.mode) {
                setMode(cfg.mode);
                if (cfg.mode === 'windowed' || cfg.mode === 'wallpaper') {
                  setIsLocked(false);
                  setIsLockModalOpen(false);
                } else if (cfg.mode === 'lock') {
                  setIsLocked(cfg.lockOnStartup === true);
                }
              } else {
                setMode('windowed');
                setIsLocked(false);
                setIsLockModalOpen(false);
              }
              if (typeof cfg.autoLockMinutes === 'number') setAutoLockMinutes(cfg.autoLockMinutes);
              if (typeof cfg.lockOnStartup === 'boolean') setLockOnStartup(cfg.lockOnStartup);
              if (typeof cfg.aiWatcherEnabled === 'boolean') setAiWatcherEnabled(cfg.aiWatcherEnabled);
              if (typeof cfg.tvNoiseEffect === 'boolean') setTvNoiseEffect(cfg.tvNoiseEffect);
              if (typeof cfg.mosaicEffect === 'boolean') setMosaicEffect(cfg.mosaicEffect);
              if (typeof cfg.scanlineEffect === 'boolean') setScanlineEffect(cfg.scanlineEffect);
              if (cfg.workspaceDir) setWorkspaceDir(cfg.workspaceDir);
            }
          })
          .catch((err: any) => console.error('Failed to load Wails config:', err));
      }

      if (w.go?.main?.App?.GetWorkspaceDir) {
        w.go.main.App.GetWorkspaceDir()
          .then((dir: string) => {
            if (dir) setWorkspaceDir(dir);
          })
          .catch(() => {});
      }

      if (w.runtime?.EventsOn) {
        w.runtime.EventsOn('toggle-pause', () => {
          setIsPaused(p => !p);
        });
        w.runtime.EventsOn('unlock', () => {
          setIsLocked(false);
          setIsLockModalOpen(false);
        });
        w.runtime.EventsOn('mode-changed', (m: AppMode) => {
          setMode(m);
          if (m === 'wallpaper') {
            setIsLocked(false);
            setIsLockModalOpen(false);
            setIsConsoleOpen(false);
          } else if (m === 'lock') {
            setIsLocked(true);
          }
        });
        w.runtime.EventsOn('open-console', () => {
          setIsConsoleOpen(true);
        });
        w.runtime.EventsOn('arm-lock', () => {
          setMode('lock');
          setIsLocked(true);
          setIsLockModalOpen(true);
        });
        w.runtime.EventsOn('toggle-theme', () => {
          setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
        });
        w.runtime.EventsOn('config-updated', (cfg: any) => {
          if (cfg) {
            if (cfg.theme === 'dark' || cfg.theme === 'light') setTheme(cfg.theme);
            if (typeof cfg.speed === 'number' && cfg.speed > 0) setAnimSpeed(cfg.speed);
            if (cfg.passcode) setConfigPasscode(cfg.passcode);
            if (cfg.mode) setMode(cfg.mode);
            if (typeof cfg.autoLockMinutes === 'number') setAutoLockMinutes(cfg.autoLockMinutes);
            if (typeof cfg.lockOnStartup === 'boolean') setLockOnStartup(cfg.lockOnStartup);
            if (typeof cfg.aiWatcherEnabled === 'boolean') setAiWatcherEnabled(cfg.aiWatcherEnabled);
            if (typeof cfg.tvNoiseEffect === 'boolean') setTvNoiseEffect(cfg.tvNoiseEffect);
            if (typeof cfg.mosaicEffect === 'boolean') setMosaicEffect(cfg.mosaicEffect);
            if (typeof cfg.scanlineEffect === 'boolean') setScanlineEffect(cfg.scanlineEffect);
            if (cfg.workspaceDir) setWorkspaceDir(cfg.workspaceDir);
          }
        });
      }
    }
  }, []);

  // Auto-Lock idle timer for lock mode
  useEffect(() => {
    if (autoLockMinutes <= 0 || mode !== 'lock' || isLocked) return;

    let timeoutId: any;
    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsLocked(true);
        setIsLockModalOpen(true);
      }, autoLockMinutes * 60 * 1000);
    };

    resetTimer();
    const evNames = ['mousedown', 'mousemove', 'keydown', 'touchstart'];
    evNames.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));

    return () => {
      clearTimeout(timeoutId);
      evNames.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [autoLockMinutes, isLocked, mode]);

  // Expose DevTools window.AgentCockpit API for browser console configuration
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const w = window as any;
      const api = {
        setPassword: (pwd: string) => updatePasscode(pwd),
        setSpeed: (spd: number) => updateSpeed(spd),
        setTheme: (t: 'dark' | 'light') => updateTheme(t),
        openConsole: () => setIsConsoleOpen(true),
        closeConsole: () => setIsConsoleOpen(false),
        toggleLock: () => setIsLocked(l => !l),
        getConfig: () => ({ passcode: configPasscode, speed: animSpeed, theme, isLocked, workspaceDir }),
        setWorkspaceDir: (dir: string) => updateWorkspaceDir(dir),
        getWorkspaceDir: () => workspaceDir
      };
      w.AgentCockpit = api;

      console.log(
        '%c[AGENT COCKPIT // WEB CONSOLE ARMED]%c Settings can be modified via UI button [⚙ CONSOLE] or DevTools commands:\n• AgentCockpit.setPassword("your_pin")\n• AgentCockpit.setSpeed(2.0)\n• AgentCockpit.setTheme("dark"|"light")\n• AgentCockpit.setWorkspaceDir("D:/Code/my-repo")\n• AgentCockpit.getConfig()',
        'color: #34d996; font-weight: bold; font-size: 12px; background: #030605; padding: 4px 8px; border-radius: 4px;',
        'color: #86857f; font-size: 11px;'
      );
    }
  }, [animSpeed, configPasscode, isLocked, theme, updatePasscode, updateSpeed, updateTheme, updateWorkspaceDir, workspaceDir]);

  // Sync theme to root element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('agent-cockpit-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    updateTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, updateTheme]);

  const togglePause = useCallback(() => {
    setIsPaused(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        const w = window as any;
        if (w.go?.main?.App?.TogglePause) {
          w.go.main.App.TogglePause().catch(console.error);
        }
      }
      return next;
    });
  }, []);

  const openLockModal = useCallback(() => {
    setIsLockModalOpen(true);
  }, []);

  const closeLockModal = useCallback(() => {
    setIsLockModalOpen(false);
  }, []);

  const unlockWithPasscode = useCallback((code: string) => {
    const clean = code.trim().toLowerCase();
    const validPins = [configPasscode.toLowerCase(), '1234', 'admin', 'ops', '8888'];
    if (validPins.includes(clean)) {
      setIsLocked(false);
      if (typeof window !== 'undefined') {
        const w = window as any;
        if (w.go?.main?.App?.Unlock) {
          w.go.main.App.Unlock().catch(console.error);
        }
      }
      return true;
    }
    return false;
  }, [configPasscode]);

  // 2. Initial Data Generation
  const initialData = useMemo(() => {
    const tasksInit: TaskItem[] = Array.from({ length: 64 }, (_, i) => ({
      i,
      id: 'T-' + String(i + 1).padStart(3, '0'),
      name: CONFIG.taskNames[(R() * CONFIG.taskNames.length) | 0],
      wf: (R() * NW) | 0,
      prog: 0,
      state: 'queued',
      agent: -1
    }));

    const agentsInit: AgentItem[] = CONFIG.agents.map(([code, name], i) => ({
      i,
      code,
      name,
      task: -1
    }));

    const wfsInit: WorkflowItem[] = CONFIG.workflows.map((name, i) => ({
      i,
      id: 'W' + String(i + 1).padStart(2, '0'),
      name,
      q: 0.8,
      cells: Array.from({ length: 16 }, () => R())
    }));
    [0.91, 0.86, 0.72, 0.88, 0.84, 0.69, 0.93, 0.82, 0.74, 0.87, 0.71].forEach((q, i) => {
      if (wfsInit[i]) wfsInit[i].q = q;
    });

    const order = tasksInit.map(t => t.i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = (R() * (i + 1)) | 0;
      [order[i], order[j]] = [order[j], order[i]];
    }
    order.slice(0, 22).forEach(i => {
      tasksInit[i].state = 'done';
      tasksInit[i].prog = 1;
    });
    order.slice(22, 32).forEach((i, k) => {
      const t = tasksInit[i];
      t.state = 'run';
      t.prog = 0.06 + R() * 0.85;
      t.agent = k;
      agentsInit[k].task = i;
    });

    const feedInit: FeedItem[] = [];
    const verbs: ('FETCH' | 'BUILD' | 'CHECK' | 'AUDIT')[] = ['FETCH', 'BUILD', 'CHECK', 'AUDIT'];
    let n = 38;
    order.slice(8, 20).forEach((i, k) => {
      feedInit.push({
        n: n++,
        verb: verbs[k % 4],
        text: `${verbs[k % 4]} ${tasksInit[i].name}`
      });
    });

    return { tasksInit, agentsInit, wfsInit, feedInit };
  }, []);

  const [tasks, setTasks] = useState<TaskItem[]>(initialData.tasksInit);
  const [agents, setAgents] = useState<AgentItem[]>(initialData.agentsInit);
  const [wfs, setWfs] = useState<WorkflowItem[]>(initialData.wfsInit);
  const [feed, setFeed] = useState<FeedItem[]>(initialData.feedInit);

  // Stable references for high-frequency simulation loop
  const tasksRef = useRef<TaskItem[]>(initialData.tasksInit);
  const agentsRef = useRef<AgentItem[]>(initialData.agentsInit);
  const feedRef = useRef<FeedItem[]>(initialData.feedInit);
  const simTRef = useRef(0);
  const stepNRef = useRef(561);

  // Hubs tracking
  const [hubWf, setHubWf] = useState<number[]>([4, 0, 8]);
  const [hubCh, setHubCh] = useState<number[]>([-10, -10, -10]);
  const [hoverHub, setHoverHub] = useState<number>(-1);
  const [hubImpacts, setHubImpacts] = useState<number[]>([0, 0, 0]);

  // Code typewriter
  const [codeIdx, setCodeIdx] = useState(0);
  const [cl, setCl] = useState(0);
  const [cc, setCc] = useState(0);
  const codeOrderRef = useRef<number[]>([]);
  const holdRef = useRef(0);
  const linePauseRef = useRef(0);

  // Metrics
  const [cfl, setCfl] = useState(0.42);
  const [stepN, setStepN] = useState(561);
  const [clockStr, setClockStr] = useState('');
  const [hiIdx, setHiIdx] = useState(1);

  const logNRef = useRef(50);

  // Real AI Watcher States for Five Windows and Top Animation
  const [realFeed, setRealFeed] = useState<FeedItem[]>([]);
  const [realSolver, setRealSolver] = useState<SolverTelemetry>({
    eventVelocity: 0,
    activeSources: 1,
    eventCount: 0,
    throughputKB: 0,
    status: 'OPTIMAL',
    currentTask: 'Agent Cockpit Telemetry Stream Active',
    lastVerb: 'IDLE'
  });
  const [realCode, setRealCode] = useState<WorkspaceCodeData>({
    file: 'agent_watcher/service.go',
    agentCode: 'AGY-01',
    agentName: 'Antigravity Assistant',
    startLine: 1,
    lines: [
      'package agent_watcher',
      '',
      '// AgentWatcherService unifies all providers into a cohesive real-time service',
      'type AgentWatcherService interface {',
      '    GetTaskFeed(limit int) []FeedItemDTO',
      '    GetSolverTelemetry() SolverTelemetryDTO',
      '    GetWorkspaceCode() WorkspaceCodeDTO',
      '    GetAgentDispatchList() []AgentDispatchDTO',
      '    GetStagePipelineData() StagePipelineDataDTO',
      '}'
    ]
  });
  const [realAgents, setRealAgents] = useState<AgentDispatchItem[]>([]);
  const [realStageData, setRealStageData] = useState<StagePipelineData>({
    totalEvents: 0,
    activeAgents: 1,
    totalSources: 3,
    doneOutputs: 0,
    verifiedCount: 0,
    pendingCount: 2,
    recentPackets: ['SYNC AGY', 'EDIT paths.go', 'EXEC wails', 'CHECK proc', 'SYS nominal'],
    hotHubIndex: 0
  });
  const [isWatcherLive, setIsWatcherLive] = useState<boolean>(false);

  const triggerHubImpact = useCallback((idx: number) => {
    setHubImpacts(prev => {
      const next = [...prev];
      next[idx] = simTRef.current;
      return next;
    });
  }, []);

  // Handle incoming live real AI tool events
  const handleLiveAgentEvent = useCallback((ev: AgentEvent) => {
    if (!ev) return;
    let verb = 'EXEC';
    if (ev.type === 'USER_PROMPT') verb = 'PROMPT';
    else if (ev.type === 'AGENT_THINK') verb = 'THINK';
    else if (ev.action === 'EDIT_FILE' || ev.action === 'CREATE_FILE') verb = 'EDIT';
    else if (ev.action === 'READ_FILE' || ev.action === 'SEARCH_GREP') verb = 'CHECK';
    else if (ev.type === 'PROC_SPAWN') verb = 'SPAWN';

    const sourceTag = ev.source ? ev.source.toUpperCase() : 'AI';
    const newFeedItem: FeedItem = {
      n: logNRef.current++,
      verb,
      text: `[${sourceTag}] ${ev.summary || ev.action}`
    };

    setFeed(prev => [...prev.slice(-35), newFeedItem]);
    feedRef.current = [...feedRef.current.slice(-35), newFeedItem];

    // Trigger visual pulse on hubs
    setHubImpacts(prev => {
      const next = [...prev];
      next[Math.floor(Math.random() * 3)] = simTRef.current;
      return next;
    });

    // If file edit, show real code in workspace code panel
    if (ev.action === 'EDIT_FILE' || ev.action === 'CREATE_FILE') {
      const fileName = ev.target || 'workspace_file.go';
      let codeLines: string[] = [];
      if (ev.details?.ReplacementContent && typeof ev.details.ReplacementContent === 'string') {
        codeLines = ev.details.ReplacementContent.split('\n').filter((l: string) => l.trim().length > 0);
      } else if (ev.details?.CodeContent && typeof ev.details.CodeContent === 'string') {
        codeLines = ev.details.CodeContent.split('\n').filter((l: string) => l.trim().length > 0);
      }
      if (codeLines.length > 0) {
        setRealCode({
          file: fileName,
          agentCode: ev.source === 'claude_code' ? 'CC' : ev.source === 'antigravity' ? 'AG' : 'AI',
          agentName: ev.source === 'claude_code' ? 'Claude Code' : ev.source === 'antigravity' ? 'Antigravity' : 'Codex',
          startLine: 1,
          lines: codeLines
        });
      }
    }

    // Reflect tool activity in agents grid
    setAgents(prev => {
      const next = [...prev];
      const agentIdx = ev.source === 'claude_code' ? 1 : ev.source === 'codex' ? 2 : 0;
      if (next[agentIdx]) {
        next[agentIdx] = {
          ...next[agentIdx],
          name: ev.source === 'claude_code' ? 'Claude Code' : ev.source === 'antigravity' ? 'Antigravity' : 'Codex',
          task: 0
        };
      }
      return next;
    });
  }, []);

  // Synchronize full dashboard state from backend snapshot
  const syncRealDashboard = useCallback((snap: DashboardSnapshot) => {
    if (!snap) return;
    setIsWatcherLive(true);
    if (Array.isArray(snap.feed) && snap.feed.length > 0) {
      setRealFeed(snap.feed);
      setFeed(snap.feed);
      feedRef.current = snap.feed;
    }
    if (snap.solver) {
      setRealSolver(snap.solver);
    }
    if (snap.code && Array.isArray(snap.code.lines) && snap.code.lines.length > 0) {
      setRealCode(snap.code);
    }
    if (Array.isArray(snap.agents) && snap.agents.length > 0) {
      setRealAgents(snap.agents);
      setAgents(snap.agents.map((ag, i) => ({
        i,
        code: ag.code,
        name: ag.name,
        task: ag.status === 'busy' ? 0 : -1
      })));
    }
    if (snap.stageData) {
      setRealStageData(snap.stageData);
      if (typeof snap.stageData.hotHubIndex === 'number') {
        triggerHubImpact(snap.stageData.hotHubIndex);
      }
    }
  }, [triggerHubImpact]);

  // Real-time AI coding agent event listener & polling
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const w = window as any;

    // 1. Initial full snapshot fetch
    if (w.go?.main?.App?.GetFullDashboardSnapshot) {
      w.go.main.App.GetFullDashboardSnapshot()
        .then((snap: any) => syncRealDashboard(snap))
        .catch((err: any) => console.warn('GetFullDashboardSnapshot fallback:', err));
    }

    // 2. Real-time push listeners from Go backend
    if (w.runtime?.EventsOn) {
      w.runtime.EventsOn('dashboard-realtime-sync', (snap: any) => {
        syncRealDashboard(snap);
      });
      w.runtime.EventsOn('agent-event', (ev: AgentEvent) => {
        handleLiveAgentEvent(ev);
      });
    }

    // 3. Periodic polling every 1500ms to guarantee fresh state
    const pollTimer = setInterval(() => {
      if (w.go?.main?.App?.GetFullDashboardSnapshot) {
        w.go.main.App.GetFullDashboardSnapshot()
          .then((snap: any) => syncRealDashboard(snap))
          .catch(() => {});
      }
    }, 1500);

    return () => clearInterval(pollTimer);
  }, [handleLiveAgentEvent, syncRealDashboard]);

  // Next code set
  const pickNextCodeSet = useCallback(() => {
    if (!codeOrderRef.current.length) {
      codeOrderRef.current = CONFIG.codeSets.map((_, i) => i);
      for (let i = codeOrderRef.current.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        [codeOrderRef.current[i], codeOrderRef.current[j]] = [codeOrderRef.current[j], codeOrderRef.current[i]];
      }
    }
    const nextIdx = codeOrderRef.current.shift() ?? 0;
    setCodeIdx(nextIdx);
    setCl(0);
    setCc(0);
    holdRef.current = 0;
    linePauseRef.current = 0;
  }, []);

  useEffect(() => {
    pickNextCodeSet();
  }, [pickNextCodeSet]);

  // Simulation loop references
  const lastTimeRef = useRef(0);
  const accStepRef = useRef(0);
  const accHudRef = useRef(0);
  const accHubRef = useRef(0);
  const accCycleRef = useRef(0);
  const accTypeRef = useRef(0);
  const hubTurnRef = useRef(0);

  // Discrete Step logic - runs cleanly and synchronously
  const runSimulationStep = useCallback(() => {
    const nextTasks = tasksRef.current.map(t => ({ ...t }));
    const nextAgents = agentsRef.current.map(a => ({ ...a }));
    let nextFeed = [...feedRef.current];
    const logEvents: { verb: 'FETCH' | 'BUILD' | 'CHECK' | 'AUDIT'; name: string }[] = [];

    // 1. Advance running tasks for busy agents
    for (const a of nextAgents) {
      if (a.task < 0 || a.task >= nextTasks.length) continue;
      const t = nextTasks[a.task];
      t.prog = Math.min(1, t.prog + 0.03 + Math.random() * 0.08);
      if (t.prog >= 1) {
        t.state = 'done';
        t.agent = -1;
        a.task = -1;
        const vb = Math.random() < 0.5 ? 'CHECK' : 'AUDIT';
        logEvents.push({ verb: vb, name: t.name });
      }
    }

    // 2. Assign queued tasks to idle agents
    for (const a of nextAgents) {
      if (a.task >= 0 || Math.random() > 0.45) continue;
      const queued = nextTasks.filter(t => t.state === 'queued');
      if (!queued.length) break;
      const t = queued[(Math.random() * queued.length) | 0];
      t.state = 'run';
      t.agent = a.i;
      t.prog = 0.02;
      a.task = t.i;
      const vb = Math.random() < 0.5 ? 'FETCH' : 'BUILD';
      logEvents.push({ verb: vb, name: t.name });
    }

    // 3. Replenish queue if low on queued tasks (continuous circular stream)
    const queuedCount = nextTasks.filter(t => t.state === 'queued').length;
    if (queuedCount < 10) {
      const doneTasks = nextTasks.filter(t => t.state === 'done');
      if (doneTasks.length > 0) {
        const recycled = doneTasks.sort(() => Math.random() - 0.5).slice(0, 18);
        for (const t of recycled) {
          t.state = 'queued';
          t.prog = 0;
          t.agent = -1;
        }
      }
    }

    // 4. Append log events to feed
    for (const ev of logEvents) {
      nextFeed.push({
        n: logNRef.current++,
        verb: ev.verb,
        text: `${ev.verb} ${ev.name}`
      });
    }
    if (nextFeed.length > 36) {
      nextFeed = nextFeed.slice(-36);
    }

    // 5. Update refs & states atomically
    tasksRef.current = nextTasks;
    agentsRef.current = nextAgents;
    feedRef.current = nextFeed;
    setTasks(nextTasks);
    setAgents(nextAgents);
    setFeed(nextFeed);

    stepNRef.current += 1;
    setStepN(stepNRef.current);

    setWfs(prevWfs => {
      const next = prevWfs.map(w => ({ ...w }));
      const w = next[(Math.random() * next.length) | 0];
      if (w) {
        w.q = Math.max(0.6, Math.min(0.97, w.q + (Math.random() - 0.38) * 0.05));
        w.cells[(Math.random() * 16) | 0] = Math.random();
      }
      return next;
    });
  }, []);

  // Hub Switch logic - reads from stable refs
  const runHubSwitch = useCallback(() => {
    setHubWf(prevHubWf => {
      const nextHubs = [...prevHubWf];
      const i = hubTurnRef.current++ % nextHubs.length;
      const currentTasks = tasksRef.current;
      const busy = currentTasks.filter(t => t.state === 'run').map(t => t.wf);
      const uniqueBusy = [...new Set(busy)].filter(w => !nextHubs.includes(w));
      const pool = uniqueBusy.length ? uniqueBusy : CONFIG.workflows.map((_, idx) => idx).filter(w => !nextHubs.includes(w));
      nextHubs[i] = pool[(Math.random() * pool.length) | 0] ?? 0;
      setHubCh(ch => {
        const nextCh = [...ch];
        nextCh[i] = simTRef.current;
        return nextCh;
      });
      triggerHubImpact(i);
      return nextHubs;
    });
  }, [triggerHubImpact]);

  // Track previous real code file to reset typewriter when a new file is loaded
  const prevCodeFileRef = useRef<string>('');
  useEffect(() => {
    if (realCode && realCode.file && realCode.file !== prevCodeFileRef.current) {
      prevCodeFileRef.current = realCode.file;
      setCl(0);
      setCc(0);
      holdRef.current = 0;
      linePauseRef.current = 0;
    }
  }, [realCode]);

  // Code typewriter tick
  const runTypeTick = useCallback(() => {
    const hasReal = Boolean(realCode && realCode.lines && realCode.lines.length > 0);
    const cset = CONFIG.codeSets[codeIdx];
    const lines = hasReal ? realCode.lines : (cset?.lines || []);
    if (!lines || lines.length === 0) return;

    if (holdRef.current > 0) {
      holdRef.current--;
      if (holdRef.current === 0) {
        if (hasReal) {
          // Restart typing loop for real code
          setCl(0);
          setCc(0);
        } else {
          pickNextCodeSet();
        }
      }
      return;
    }
    if (linePauseRef.current > 0) {
      linePauseRef.current--;
      return;
    }

    setCc(prevCc => {
      const currentLine = lines[cl] || '';
      let nextCc = prevCc + (Math.random() < 0.35 ? 2 : 1);
      if (nextCc >= currentLine.length) {
        nextCc = currentLine.length;
        if (cl < lines.length - 1) {
          setCl(c => c + 1);
          linePauseRef.current = 4;
          return 0;
        } else {
          holdRef.current = 60;
        }
      }
      return nextCc;
    });
  }, [cl, codeIdx, pickNextCodeSet, realCode]);

  // Main high-precision animation loop
  useEffect(() => {
    let animId: number;
    const loop = (now: number) => {
      animId = requestAnimationFrame(loop);
      if (!lastTimeRef.current) lastTimeRef.current = now;
      const realDt = Math.min(0.05, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;

      const dt = isPaused ? 0 : realDt * animSpeed;
      if (dt > 0) {
        simTRef.current += dt;

        accTypeRef.current += dt;
        while (accTypeRef.current >= 0.034) {
          runTypeTick();
          accTypeRef.current -= 0.034;
        }

        accStepRef.current += dt;
        while (accStepRef.current >= 0.9) {
          runSimulationStep();
          accStepRef.current -= 0.9;
        }

        accHudRef.current += dt;
        if (accHudRef.current >= 0.3) {
          setCfl(0.3 + Math.random() * 0.45);
          accHudRef.current = 0;
        }

        accHubRef.current += dt;
        if (accHubRef.current >= 2.4) {
          runHubSwitch();
          accHubRef.current = 0;
        }

        accCycleRef.current += dt;
        if (accCycleRef.current >= 4.5) {
          setHiIdx(h => (h + 1) % 6);
          accCycleRef.current = 0;
        }
      }
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [animSpeed, isPaused, runHubSwitch, runSimulationStep, runTypeTick]);

  // Real-time clock update (wall time)
  useEffect(() => {
    const pad2 = (n: number) => String(n).padStart(2, '0');
    const updateClock = () => {
      const d = new Date();
      setClockStr(`${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`);
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute code rows for typewriter display
  const currentCodeSet = CONFIG.codeSets[codeIdx] || CONFIG.codeSets[0];
  const assignedAgent = agents[currentCodeSet.agent] || agents[0];
  const codeMeta = useMemo(() => {
    if (realCode && realCode.lines && realCode.lines.length > 0) {
      return {
        file: realCode.file,
        agentCode: realCode.agentCode,
        agentName: realCode.agentName
      };
    }
    return {
      file: currentCodeSet.file,
      agentCode: assignedAgent?.code || '01',
      agentName: assignedAgent?.name || 'Agent'
    };
  }, [assignedAgent, currentCodeSet, realCode]);

  const codeRows = useMemo(() => {
    const hasReal = Boolean(realCode && realCode.lines && realCode.lines.length > 0);
    const lines = hasReal ? realCode.lines : (currentCodeSet?.lines || []);
    const startLine = hasReal ? (realCode.startLine || 1) : (currentCodeSet?.start || 1);
    const fit = 8;

    const rows = [];
    const minLine = Math.max(0, cl - fit + 1);
    const maxLine = Math.min(cl, lines.length - 1);
    for (let i = minLine; i <= maxLine; i++) {
      const lineText = lines[i] || '';
      const text = i < cl ? lineText : lineText.slice(0, cc);
      rows.push({
        ln: i + startLine,
        text,
        isCurrent: i === cl
      });
    }
    return rows;
  }, [cl, cc, currentCodeSet, realCode]);

  const value = {
    theme,
    setTheme,
    toggleTheme,
    mode,
    setMode,
    updateMode,
    autoLockMinutes,
    updateAutoLockMinutes,
    lockOnStartup,
    updateLockOnStartup,
    aiWatcherEnabled,
    updateAiWatcherEnabled,
    tvNoiseEffect,
    updateTvNoiseEffect,
    mosaicEffect,
    updateMosaicEffect,
    scanlineEffect,
    updateScanlineEffect,
    triggerTvFlicker,
    tvFlickerCount,
    workspaceDir,
    updateWorkspaceDir,
    isPaused,
    setIsPaused,
    togglePause,
    animSpeed,
    setAnimSpeed,
    isLocked,
    setIsLocked,
    isLockModalOpen,
    openLockModal,
    closeLockModal,
    unlockWithPasscode,
    configPasscode,

    isConsoleOpen,
    openConsole,
    closeConsole,
    updatePasscode,
    updateSpeed,
    updateTheme,

    tasks,
    agents,
    wfs,
    feed,
    hubWf,
    hubCh,
    hoverHub,
    setHoverHub,

    codeMeta,
    codeRows,

    cfl,
    stepN,
    setStepN,
    clockStr,
    hiIdx,
    simT: simTRef.current,

    triggerHubImpact,
    hubImpacts,

    // Real AI Telemetry for 5 Windows + Top Animation
    realFeed,
    realSolver,
    realCode,
    realAgents,
    realStageData,
    isWatcherLive
  };

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
};

export { useDashboard } from './useDashboard';

export type ThemeMode = 'dark' | 'light';
export type AppMode = 'lock' | 'wallpaper' | 'windowed';

export type SolverMode = 'advect' | 'project' | 'rerun';

export interface TaskItem {
  i: number;
  id: string;
  name: string;
  wf: number;
  prog: number;
  state: 'queued' | 'run' | 'done';
  agent: number;
}

export interface AgentItem {
  i: number;
  code: string;
  name: string;
  task: number;
}

export interface WorkflowItem {
  i: number;
  id: string;
  name: string;
  q: number;
  cells: number[];
}

export interface FeedItem {
  n: number;
  verb: 'FETCH' | 'BUILD' | 'CHECK' | 'AUDIT' | 'EXEC' | 'EDIT' | 'PROMPT' | 'THINK' | 'SPAWN' | string;
  text: string;
}

export interface CodeSet {
  file: string;
  agent: number;
  start: number;
  lines: string[];
}

export interface HubNode {
  x: number;
  y: number;
  curves: BezierCurve[];
  wf: number;
  id: string;
}

export interface BezierCurve {
  x1: number;
  y1: number;
  cx1?: number;
  cy1?: number;
  cx2?: number;
  cy2?: number;
  cx?: number;
  cy?: number;
  x2: number;
  y2: number;
  hubIdx?: number;
  isTrunk?: boolean;
}

export interface ActiveFiber {
  q: BezierCurve;
  speed: number;
  dash: number;
  gap: number;
  phase: number;
  width: number;
  hubIdx: number;
  hot: boolean;
}

export interface DynamicPacket {
  q: BezierCurve;
  u: number;
  v: number;
  len: number;
  size: number;
  hot: boolean;
  tag: string | null;
  hubIdx: number;
}

export interface GatewayItem {
  tag: string;
  proto: string;
  bus: string;
}

export interface SystemStatusData {
  cpuPercent: number;
  cpuCores: number;
  cpuModel: string;

  memTotal: number;
  memUsed: number;
  memFree: number;
  memPercent: number;

  diskTotal: number;
  diskUsed: number;
  diskFree: number;
  diskPercent: number;
  diskPath: string;

  netSentRate: number;
  netRecvRate: number;
  netTotalSent: number;
  netTotalRecv: number;

  timestamp: number;
}

export type AgentEventType = 'USER_PROMPT' | 'AGENT_THINK' | 'TOOL_CALL' | 'PROC_SPAWN' | 'NET_API';

export interface AgentEvent {
  id: string;
  timestamp: number;
  source: 'antigravity' | 'claude_code' | 'codex' | 'system';
  sessionId: string;
  type: AgentEventType;
  action: string;
  target: string;
  summary: string;
  details?: Record<string, any>;
  pid?: number;
  durationMs?: number;
}

export interface ActiveSession {
  source: string;
  sessionId: string;
  title: string;
  lastEventAt: number;
  status: 'active' | 'idle';
}

export interface VisualEffectsConfig {
  tvNoiseEffect: boolean;
  mosaicEffect: boolean;
  scanlineEffect: boolean;
}

export interface AppConfig {
  passcode: string;
  speed: number;
  theme: string;
  mode: string;
  autoLockMinutes: number;
  lockOnStartup: boolean;
  windowed: boolean;
  aiWatcherEnabled: boolean;
  tvNoiseEffect: boolean;
  mosaicEffect: boolean;
  scanlineEffect: boolean;
  workspaceDir: string;
}

export interface SolverTelemetry {
  eventVelocity: number;
  activeSources: number;
  eventCount: number;
  throughputKB: number;
  status: string;
  currentTask: string;
  lastVerb: string;
}

export interface WorkspaceCodeData {
  file: string;
  agentCode: string;
  agentName: string;
  startLine: number;
  lines: string[];
}

export interface AgentDispatchItem {
  code: string;
  name: string;
  source: string;
  status: 'busy' | 'idle' | 'done';
  taskTitle: string;
  progress: number;
  actionType: string;
}

export interface StageSourceItem {
  id: string;
  name: string;
  bus: string;
  tag: string;
  active: boolean;
  byteRate?: string;
  hubIndex: number;
}

export interface StageHubItem {
  id: string;
  name: string;
  subtitle: string;
  status: string;
  q: number;
  eventsCount: number;
  activeSrcs?: number;
}

export interface StagePipelineData {
  totalEvents: number;
  activeAgents: number;
  totalSources: number;
  doneOutputs: number;
  verifiedCount: number;
  pendingCount: number;
  recentPackets: string[];
  hotHubIndex: number;
  sources?: StageSourceItem[];
  hubs?: StageHubItem[];
}

export interface DashboardSnapshot {
  feed: FeedItem[];
  solver: SolverTelemetry;
  code: WorkspaceCodeData;
  agents: AgentDispatchItem[];
  stageData: StagePipelineData;
  timestamp: number;
}



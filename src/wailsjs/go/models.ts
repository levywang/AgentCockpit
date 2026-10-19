export namespace agent_watcher {
	
	export class ActiveSession {
	    source: string;
	    sessionId: string;
	    title: string;
	    lastEventAt: number;
	    status: string;
	
	    static createFrom(source: any = {}) {
	        return new ActiveSession(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.source = source["source"];
	        this.sessionId = source["sessionId"];
	        this.title = source["title"];
	        this.lastEventAt = source["lastEventAt"];
	        this.status = source["status"];
	    }
	}
	export class AgentDispatchDTO {
	    code: string;
	    name: string;
	    source: string;
	    status: string;
	    taskTitle: string;
	    progress: number;
	    actionType: string;
	
	    static createFrom(source: any = {}) {
	        return new AgentDispatchDTO(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.code = source["code"];
	        this.name = source["name"];
	        this.source = source["source"];
	        this.status = source["status"];
	        this.taskTitle = source["taskTitle"];
	        this.progress = source["progress"];
	        this.actionType = source["actionType"];
	    }
	}
	export class AgentEvent {
	    id: string;
	    timestamp: number;
	    source: string;
	    sessionId: string;
	    type: string;
	    action: string;
	    target: string;
	    summary: string;
	    details: Record<string, any>;
	    pid: number;
	    durationMs: number;
	
	    static createFrom(source: any = {}) {
	        return new AgentEvent(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.timestamp = source["timestamp"];
	        this.source = source["source"];
	        this.sessionId = source["sessionId"];
	        this.type = source["type"];
	        this.action = source["action"];
	        this.target = source["target"];
	        this.summary = source["summary"];
	        this.details = source["details"];
	        this.pid = source["pid"];
	        this.durationMs = source["durationMs"];
	    }
	}
	export class StageHubDTO {
	    id: string;
	    name: string;
	    subtitle: string;
	    status: string;
	    q: number;
	    eventsCount: number;
	    activeSrcs: number;
	
	    static createFrom(source: any = {}) {
	        return new StageHubDTO(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.subtitle = source["subtitle"];
	        this.status = source["status"];
	        this.q = source["q"];
	        this.eventsCount = source["eventsCount"];
	        this.activeSrcs = source["activeSrcs"];
	    }
	}
	export class StageSourceDTO {
	    id: string;
	    name: string;
	    bus: string;
	    tag: string;
	    active: boolean;
	    byteRate: string;
	    hubIndex: number;
	
	    static createFrom(source: any = {}) {
	        return new StageSourceDTO(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.bus = source["bus"];
	        this.tag = source["tag"];
	        this.active = source["active"];
	        this.byteRate = source["byteRate"];
	        this.hubIndex = source["hubIndex"];
	    }
	}
	export class StagePipelineDataDTO {
	    totalEvents: number;
	    activeAgents: number;
	    totalSources: number;
	    doneOutputs: number;
	    verifiedCount: number;
	    pendingCount: number;
	    recentPackets: string[];
	    hotHubIndex: number;
	    sources: StageSourceDTO[];
	    hubs: StageHubDTO[];
	
	    static createFrom(source: any = {}) {
	        return new StagePipelineDataDTO(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.totalEvents = source["totalEvents"];
	        this.activeAgents = source["activeAgents"];
	        this.totalSources = source["totalSources"];
	        this.doneOutputs = source["doneOutputs"];
	        this.verifiedCount = source["verifiedCount"];
	        this.pendingCount = source["pendingCount"];
	        this.recentPackets = source["recentPackets"];
	        this.hotHubIndex = source["hotHubIndex"];
	        this.sources = this.convertValues(source["sources"], StageSourceDTO);
	        this.hubs = this.convertValues(source["hubs"], StageHubDTO);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class WorkspaceCodeDTO {
	    file: string;
	    agentCode: string;
	    agentName: string;
	    startLine: number;
	    lines: string[];
	
	    static createFrom(source: any = {}) {
	        return new WorkspaceCodeDTO(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.file = source["file"];
	        this.agentCode = source["agentCode"];
	        this.agentName = source["agentName"];
	        this.startLine = source["startLine"];
	        this.lines = source["lines"];
	    }
	}
	export class SolverTelemetryDTO {
	    eventVelocity: number;
	    activeSources: number;
	    eventCount: number;
	    throughputKB: number;
	    status: string;
	    currentTask: string;
	    lastVerb: string;
	
	    static createFrom(source: any = {}) {
	        return new SolverTelemetryDTO(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.eventVelocity = source["eventVelocity"];
	        this.activeSources = source["activeSources"];
	        this.eventCount = source["eventCount"];
	        this.throughputKB = source["throughputKB"];
	        this.status = source["status"];
	        this.currentTask = source["currentTask"];
	        this.lastVerb = source["lastVerb"];
	    }
	}
	export class FeedItemDTO {
	    n: number;
	    verb: string;
	    text: string;
	    source: string;
	    timeStr: string;
	
	    static createFrom(source: any = {}) {
	        return new FeedItemDTO(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.n = source["n"];
	        this.verb = source["verb"];
	        this.text = source["text"];
	        this.source = source["source"];
	        this.timeStr = source["timeStr"];
	    }
	}
	export class DashboardSnapshotDTO {
	    feed: FeedItemDTO[];
	    solver: SolverTelemetryDTO;
	    code: WorkspaceCodeDTO;
	    agents: AgentDispatchDTO[];
	    stageData: StagePipelineDataDTO;
	    timestamp: number;
	
	    static createFrom(source: any = {}) {
	        return new DashboardSnapshotDTO(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.feed = this.convertValues(source["feed"], FeedItemDTO);
	        this.solver = this.convertValues(source["solver"], SolverTelemetryDTO);
	        this.code = this.convertValues(source["code"], WorkspaceCodeDTO);
	        this.agents = this.convertValues(source["agents"], AgentDispatchDTO);
	        this.stageData = this.convertValues(source["stageData"], StagePipelineDataDTO);
	        this.timestamp = source["timestamp"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	
	
	
	

}

export namespace config {
	
	export class Config {
	    passcode: string;
	    speed: number;
	    theme: string;
	    mode: string;
	    autoLockMinutes: number;
	    lockOnStartup: boolean;
	    windowed: boolean;
	    isChild: boolean;
	    monitorIndex: number;
	    hubPort: number;
	    monitorCount: number;
	    aiWatcherEnabled: boolean;
	    tvNoiseEffect: boolean;
	    mosaicEffect: boolean;
	    scanlineEffect: boolean;
	    workspaceDir: string;
	
	    static createFrom(source: any = {}) {
	        return new Config(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.passcode = source["passcode"];
	        this.speed = source["speed"];
	        this.theme = source["theme"];
	        this.mode = source["mode"];
	        this.autoLockMinutes = source["autoLockMinutes"];
	        this.lockOnStartup = source["lockOnStartup"];
	        this.windowed = source["windowed"];
	        this.isChild = source["isChild"];
	        this.monitorIndex = source["monitorIndex"];
	        this.hubPort = source["hubPort"];
	        this.monitorCount = source["monitorCount"];
	        this.aiWatcherEnabled = source["aiWatcherEnabled"];
	        this.tvNoiseEffect = source["tvNoiseEffect"];
	        this.mosaicEffect = source["mosaicEffect"];
	        this.scanlineEffect = source["scanlineEffect"];
	        this.workspaceDir = source["workspaceDir"];
	    }
	}

}

export namespace system {
	
	export class SystemStats {
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
	
	    static createFrom(source: any = {}) {
	        return new SystemStats(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.cpuPercent = source["cpuPercent"];
	        this.cpuCores = source["cpuCores"];
	        this.cpuModel = source["cpuModel"];
	        this.memTotal = source["memTotal"];
	        this.memUsed = source["memUsed"];
	        this.memFree = source["memFree"];
	        this.memPercent = source["memPercent"];
	        this.diskTotal = source["diskTotal"];
	        this.diskUsed = source["diskUsed"];
	        this.diskFree = source["diskFree"];
	        this.diskPercent = source["diskPercent"];
	        this.diskPath = source["diskPath"];
	        this.netSentRate = source["netSentRate"];
	        this.netRecvRate = source["netRecvRate"];
	        this.netTotalSent = source["netTotalSent"];
	        this.netTotalRecv = source["netTotalRecv"];
	        this.timestamp = source["timestamp"];
	    }
	}

}


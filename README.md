# AGENT COCKPIT // Cyberdeck AI Orchestration & Multi-Monitor HUD
> *Autonomous AI Agent Cockpit, Workspace Watcher & Multi-Monitor Lock Screen / Live Wallpaper*

<p align="center">
  <img src="logo.png" alt="Agent Cockpit Logo" width="120" height="120" style="border-radius: 16px;" /><br>
  <b>Futuristic AI Agent Cockpit, Real-time Workspace Watcher & Multi-Monitor Lock Screen / Live Wallpaper</b><br>
  使用 <b>Go + Wails v2 + React 19 + TypeScript</b> 打造的硬核赛博风多屏桌面座舱与 AI 智能体调度监控大盘
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Language-Go%201.20+-00ADD8?style=flat-square&logo=go" alt="Go" />
  <img src="https://img.shields.io/badge/Frontend-React%2019%20%2B%20TypeScript-61DAFB?style=flat-square&logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/Framework-Wails%20v2-DF1A29?style=flat-square" alt="Wails v2" />
  <img src="https://img.shields.io/badge/OS-Windows%20(Multi--Monitor)-0078D6?style=flat-square&logo=windows" alt="Windows" />
  <img src="https://img.shields.io/badge/Config-YAML%20%2B%20JSON-orange?style=flat-square" alt="YAML Config" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License" />
</p>

---

## 🌟 项目简介

本项目是一款面向未来的 **AI 智能体编排与全实态调度监控控制台（AI Cyberdeck Cockpit）**，同时集成了 **Windows 多屏（双屏）锁屏守护**、**桌面底层动态壁纸** 以及 **常规悬浮开发窗口** 三种运行形态。

系统深度融合了 **Go 语言系统级窗口调度、Win32 原生 API 与 Wails v2 架构**，配合 React 19 + TypeScript 高性能渲染引擎。它不仅拥有纯正硬核的赛博黑客视觉风格（旋转飞轮、汇聚集线器、粒子对流场、复古 CRT 电视雪花与马赛克防窥滤镜），更内置了**真实 AI 编程行为嗅探引擎与本地代码工作区文件监控（fsnotify）**，将 AI 智能体的每次思考、命令执行与文件改动以科幻大盘的形式跃然屏上。

---

## 🚀 最新更新亮点 (Recent Changelog)

- 📺 **新增复古 CRT 视觉特效与防窥滤镜系统 (Visual FX Overlay)**：
  - **老电视雪花杂波 (CRT TV Noise & Snow)**：24 FPS 像素杂波模拟，偶发水平同步瞬变与微闪动，精准还原显像管天线无信号质感；
  - **全局马赛克像素化滤镜 (Mosaic Pixelation)**：SVG 硬件采样点阵粗颗粒滤镜，防止工位窥视代码与敏感数据，控制台与密码解锁弹窗智能豁免；
  - **CRT 逐行扫描线与暗角 (Scanlines & Vignette)**：工业显示器隔行光栅微光，沉浸感倍增；
  - **彻底修复偶发闪烁**：关闭特效时严格杜绝任何无预期的全屏闪屏，办公体验纯净护眼。
- 📁 **新增真实工程工作区文件监控引擎 (Workspace Directory Watcher)**：
  - 基于 Go `fsnotify` 递归监听指定源码目录（`workspaceDir`），100ms 快速去抖捕获 `.go`、`.ts`、`.tsx`、`.py`、`.js`、`.json`、`.yaml` 等 18+ 种主流源码改动；
  - 代码变更实时流式注入底部的 **WORKSPACE (RUNTIME CODE)** 面板并高亮呈现；闲置时自动智能平滑轮巡。
- 🤖 **全面接口化重构与五大面板“全真实数据”贯通**：
  - Go 后端建立面向接口的标准架构体系（`TelemetryProvider`、`AgentDispatchProvider`、`StageDataProvider`、`WorkspaceWatcher`）；
  - **TASK FEED**：实时解析 Antigravity / Claude Code / Codex 的工具调用与真实思考事件；
  - **PARTICLE SOLVER**：流体粒子流速与真实 AI 事件吞吐速率（Event Velocity）动态正相关；
  - **12 AGENT DISPATCH**：自适应网格展示本机活跃的 AI 工具与子进程，解决文字挤占并补充 Tooltip 提示；
  - **MAIN STAGE**：主舞台光纤数据彗星与集线器冲击波由真实事件动态击发。
- 📝 **全面支持 YAML 配置文件 (`config.yaml`)**：
  - 支持根目录 `config.yaml` 格式加载、持久化与自动默认配置生成；
  - 支持应用数据目录 `%LOCALAPPDATA%\AgentCockpit` 隔离存储 WebView2 数据与本地配置文件，并提供完整的单元测试覆盖。

---

## ✨ 核心特性详解

### 1. 三种桌面运行形态自由切换 (Tri-Mode Architecture)

无需重启进程，在 Web 控制台或任务栏托盘中可随时无缝切换：

| 模式 | 系统层级 | 键鼠交互 | 适用场景 |
| :--- | :--- | :--- | :--- |
| 🪟 **常规居中窗口 (Windowed)** | 标准桌面顶层窗口 | 完整放行，支持自由缩放/拖拽 | **默认启动模式**。在单屏或多任务开发时，作为伴随监视小窗放置一隅 |
| 🔒 **全屏锁屏守护 (Lock Screen)** | `HWND_TOPMOST` 独占置顶 | 全局事件拦截防误触与窥屏 | 离开工位时一键启用，必须输入预设密码解锁验证后退出 |
| 🖼 **动态桌面壁纸 (Wallpaper)** | 嵌入桌面底层 `WorkerW` / `HWND_BOTTOM` | 完全放行，穿透至桌面图标 | 钉在桌面最底层作为动态高科技壁纸，打字办公互不干扰 |

### 2. 原生多屏（双屏）锁屏调度 (Multi-Screen Sync Hub)
- **多显示器自动探测**：调用 Win32 Display API 自动枚举所有物理与虚拟监视器（支持双屏及多联屏）。
- **独立高精全屏渲染**：主进程覆盖主屏，并自动为每个副屏拉起独立全屏渲染进程，享有独立 GPU 渲染管线与高刷新率。
- **全局多屏状态同步 (Sync Hub)**：无论在哪个屏幕上解锁或按空格暂停，所有屏幕窗口保持步调一致；解锁时多屏联动解除。

### 3. 复古赛博视觉特效叠加层 (Visual FX Suite)
通过 Web 前端控制台的「✨ 视觉特效」标签页可独立启闭以下特效：
- **老电视雪花杂波 (CRT TV Noise & Snow)**：基于 Canvas 24 FPS 噪点算法模拟真实老式电视机，带有 4~8 秒偶发微闪动及手动测试闪烁按钮。
- **全局马赛克防窥像素化 (Mosaic Pixelation)**：将全局图表、文字转化为像素点阵艺术风格，既有复古像素情怀，又能有效遮挡敏感业务代码。
- **CRT 逐行扫描线 (Scanlines & Vignette)**：隔行扫描光栅与边缘球面暗角，瞬间穿越至 80 年代黑客终端。

### 4. 真实工程文件工作区实时监控 (Workspace Watcher)
- 底层基于 `fsnotify` 实现高性能文件树监听，支持监听任意外部或本机项目目录。
- 智能过滤 `node_modules`、`.git`、`dist`、`.gemini`、`build` 等编译产物目录。
- 当开发者或 AI Agent 在工作区中修改保存代码时，实时提取代码片段、起始行号与文件名，动态注入底部 **WORKSPACE** 打字机面板。

### 5. AI 编程行为统一监听中枢 (AI Agent Watcher)
- **多工具自动嗅探**：非侵入式自动检测 **Google Antigravity、Claude Code、OpenAI Codex**。
- **行为深度还原**：监听会话 `transcript.jsonl`、历史会话与工具调用（`run_command`、`replace_file_content`、`write_to_file` 等）。
- **子进程追踪**：通过 `gopsutil` 跨平台探测 AI 衍生子进程（`git`、`npm`、`python`、`go` 等编译测试命令）。
- **纯内存并发安全环**：基于 Go 原生并发安全环形缓冲区（Ring Buffer），重启即丢，零磁盘 IO 负担，隐私绝对安全。

### 6. 全动态硬核主舞台 (Main Stage Canvas · 全真实数据贯通)
- **真实滚动网关传送带 (Live Gateway Conveyor)**：实时映射本机活跃的 AI 通道（`ANTIGRAVITY`、`CLAUDE CODE`、`OPENAI CODEX`）、真实工作区变更源码（如 `FILE: MainStage.tsx`、`FILE: service.go`）与原生衍生进程；活跃通道具备动态高能 LED 热脉冲与传输吞吐指示；
- **动态光纤网络 (Optical Fiber Conduits)**：各网关引脚与三大中枢 Hub 之间实时建立定向 S 曲线贝塞尔光纤，带正弦波呼吸微光与连续高频电流；
- **真实光子数据彗星 (Photon Comets)**：穿梭数据包携带当前正在发生的真实 AI 工具操作微标签（如 `[EDIT MainStage.tsx]`、`[EXEC go test]`、`[FS MOD config.yaml]`、`[TOOL run_cmd]`）；
- **真实三联中枢集线器 (Convergence Hubs)**：
  - **HUB-01 // AGENT REASONING & DISPATCH**：汇聚 Antigravity 编排中枢与 CLI 工具调度；
  - **HUB-02 // AI SYNTHESIS & EXECUTION**：汇聚 Claude Code、Codex 与编译构建子进程；
  - **HUB-03 // WORKSPACE & RUNTIME KERNEL**：汇聚 `fsnotify` 递归文件树监控与 Windows 硬件原生遥测；
  - 鼠标悬浮与点击可查看该 Hub 的实时导管数、真实事件吞吐数与质量评分（Provenance Quality）；
- **飞轮旋转代码块 (Flywheel Radial Telemetry)**：飞轮径向数据块动态投射当前工作区的真实源码片段（TypeScript / Go / Python）与实时事件流，彻底告别静态 Mock；
- **底层管线 HUD 状态**：底部实时呈现已调度事件全量计数、实时活跃智能体总数及系统稳定性 CFL 校验。

### 7. 底部五大硬核监控仪表盘 (Bottom Panels)
1. **TASK FEED（任务事件流）**：流式展示真实抓取、构建、审计日志及 AI 工具真实调用。
2. **PARTICLE SOLVER（对流场流体求解器）**：实时粒子向量场模拟，速度随真实 AI 操作吞吐率动态加快，支持鼠标点击生成瞬态涡流。
3. **WORKSPACE（工作区运行时代码）**：实时映射真实工作区文件的编辑与代码保存。
4. **12 AGENT DISPATCH（智能体调度网格）**：2×6 自适应矩阵展示本机 AI 智能体状态与活跃进程。
5. **SYS TELEMETRY（硬件原生遥测）**：Go 语言原生探测电脑 CPU、内存、磁盘与网络实时状态。

---

## 🎛️ Web 前端控制中心与系统托盘

### Web 控制台 (Web Operations Console)
在未锁屏状态下点击页面右上角 **`⚙ CONSOLE`** 按钮，或按下快捷键 <kbd>`</kbd> / <kbd>~</kbd> / <kbd>C</kbd> 即可呼出 6 大功能模块：
- **🖥 运行模式**：快速在 锁屏 / 壁纸 / 窗口 间热切换。
- **🔐 锁屏与安全**：自定义解锁密码（默认 `1234`）、闲置自动锁屏时间（1/5/10/30分钟）、开机/启动即锁屏。
- **🖼 壁纸配置**：说明与一键设为 Windows 桌面底层动态壁纸。
- **🤖 AI 编程监听**：查看已接入的 AI 工具状态、监听目录与当前活跃会话数。
- **⚡ 速度与主题**：调整 0.2× ~ 5.0× 全局时间仿真倍速，切换 **Dark（黑客深黑）** 与 **Light（蓝图纸墨）** 主题。
- **✨ 视觉特效**：独立启闭 TV 噪点雪花、马赛克防窥、CRT 扫描线。

### Windows 任务栏系统托盘 (System Tray)
程序启动后在任务栏右下角通知区域常驻小图标：
- **鼠标左键单击**：一键呼出 / 隐藏 Web 控制台。
- **鼠标右键菜单**：快捷切换运行模式（锁屏/壁纸/窗口）、暂停动效、切换黑白主题、立即锁屏或安全退出。

---

## ⌨️ 常用快捷键

| 快捷键 | 功能说明 |
| :--- | :--- |
| <kbd>Space</kbd> | **暂停 / 恢复全局播放**（多屏联动同步） |
| <kbd>`</kbd> / <kbd>~</kbd> / <kbd>C</kbd> | **打开 / 关闭 Web 前端配置控制台**（解锁状态） |
| <kbd>Esc</kbd> | 关闭当前打开的弹窗 / Web 控制台 |
| <kbd>1</kbd> | 切换至 **0.5×** 慢速播放 |
| <kbd>2</kbd> | 切换至 **1.0×** 常速播放 |
| <kbd>3</kbd> | 切换至 **2.0×** 倍速播放 |
| <kbd>4</kbd> | 切换至 **4.0×** 极速播放 |
| <kbd>[</kbd> / <kbd>]</kbd> | 递减 / 递增播放速度 |

---

## ⚙️ 配置文件与命令行参数

### `config.yaml` 配置文件示例
项目根目录下的 `config.yaml` 包含清晰的配置与注释，可在启动前修改，亦会在界面操作时自动写回持久化：

```yaml
# AGENT COCKPIT 核心配置文件
passcode: "1234"              # 锁屏解锁密码
speed: 1.0                    # 仿真播放速度倍率 (0.2 ~ 5.0)
theme: "dark"                 # 视觉主题: dark(黑客黑) | light(蓝图白)
mode: "windowed"              # 运行模式: windowed(窗口) | lock(锁屏) | wallpaper(壁纸)
autoLockMinutes: 0            # 闲置自动锁屏分钟数 (0 为禁用)
lockOnStartup: false          # 是否启动时立即全屏锁屏
aiWatcherEnabled: true        # 是否启用后台 AI 编程行为自动监听
workspaceDir: "."             # 真实工作区监听路径 (支持相对路径或绝对路径)

# 赛博视觉特效
tvNoiseEffect: false          # 老电视雪花杂波滤镜
mosaicEffect: false           # 全局马赛克像素化防窥滤镜
scanlineEffect: false         # CRT 逐行扫描线与暗角
```

### 终端命令行启动参数
支持直接通过命令行覆盖默认参数，方便快捷脚本启动与调试：

```powershell
# 1. 默认启动（使用 config.yaml 配置）
.\build\bin\agent-cockpit.exe

# 2. 窗口化模式运行 (1280x800)
.\build\bin\agent-cockpit.exe -w

# 3. 指定监听的工作区项目目录
.\build\bin\agent-cockpit.exe -d "D:\Code\my-awesome-project"

# 4. 指定自定义配置文件路径
.\build\bin\agent-cockpit.exe -c "C:\configs\custom-cockpit.yaml"

# 5. 指定初始密码、倍速与主题
.\build\bin\agent-cockpit.exe -p 8888 -s 2.0 -t light -m lock
```

---

## 🛠️ 项目架构与目录结构

```
agent-cockpit/
├── main.go                           # Go 进程入口，WebView2 隔离与 Wails 参数配置
├── app.go                            # Wails 运行时绑定、模式切换、配置管理与控制台 API
├── config.yaml                       # 根目录 YAML 配置文件模板
├── internal/                         # 内部模块 (标准 Go 工程结构)
│   ├── config/                       # 配置持久化与 CLI 参数解析 (config.go)
│   ├── system/                       # 原生 CPU、内存、磁盘与网络遥测采集 (stats.go)
│   ├── tray/                         # Windows 原生任务栏通知区小图标与右键菜单
│   ├── window/                       # Win32 锁屏(HWND_TOPMOST)、壁纸(WorkerW)与显示器枚举
│   └── agent_watcher/                # AI 编程行为与工作区监控引擎
│       ├── model.go                  # 遥测数据模型与 DTO 定义
│       ├── paths.go                  # 平台日志路径探针
│       ├── service.go                # 面向接口的遥测调度服务架构
│       ├── source_antigravity.go     # Antigravity 实时行为探针
│       ├── source_claude.go          # Claude Code 实时行为探针
│       ├── source_process.go         # 本机 AI 衍生进程树嗅探器
│       ├── store.go                  # 并发安全环形事件内存缓冲区
│       ├── watcher.go                # 监听监督中枢 Supervisor 与事件转发
│       └── workspace_watcher.go      # 基于 fsnotify 的真实工作区目录监听引擎
├── wails.json                        # Wails v2 构建工程定义
├── build/                            # 应用程序图标与 Windows Manifest
│   └── bin/agent-cockpit.exe         # 编译生成的独立二进制程序
└── src/                              # 前端 React 19 + TypeScript 源码
    ├── components/
    │   ├── Console/WebConsoleModal.tsx   # 6 大模块 Web 核心控制中心
    │   ├── Effects/VisualEffectsOverlay.tsx # CRT 电视雪花噪点与马赛克特效滤镜
    │   ├── Header/Controls.tsx           # 顶部控制栏与模式药丸
    │   ├── Header/MetricRail.tsx         # 顶部技术指标轨道（接入真实 Stage 数据）
    │   ├── Panels/                       # 底部 5 大仪表盘组件
    │   │   ├── TaskFeedPanel.tsx         # 真实 AI 任务事件流
    │   │   ├── ParticleSolverPanel.tsx   # 对流场粒子（速度联动 AI 真实吞吐率）
    │   │   ├── WorkspaceCodePanel.tsx    # 真实工作区代码流式打字机
    │   │   ├── AgentsDispatchPanel.tsx   # 2x6 自适应智能体网格
    │   │   └── SystemStatusPanel.tsx     # 系统硬件状态指标
    │   ├── Security/LockModal.tsx        # 密码验证解锁弹窗
    │   └── Stage/MainStage.tsx           # 核心 Canvas 全动态舞台（飞轮/集线器/光纤）
    ├── context/DashboardContext.tsx      # 全局物理时序仿真引擎与 Wails 状态通信
    └── hooks/                            # 防误触、快捷键与系统状态 Hooks
```

---

## 🔨 构建与编译

### 环境要求
- [Go](https://golang.org/) 1.20+
- [Node.js](https://nodejs.org/) 18+
- [Wails CLI v2](https://wails.io/) (`go install github.com/wailsapp/wails/v2/cmd/wails@latest`)

### 编译可执行程序
运行以下命令构建纯净独立的 Windows 可执行程序（无 CMD 终端黑框）：

```bash
# 构建生产环境纯净二进制文件
wails build
```

构建完成后，程序将生成于 `build/bin/agent-cockpit.exe`。

---

## 🙏 致谢与灵感来源 (Inspiration & Thanks)

本项目灵感来源自：[cyberdaddyleo/agent-display](https://github.com/cyberdaddyleo/agent-display)，特此感谢！

---

## 📄 开源许可

本项目遵循 [MIT License](LICENSE) 进行开源。

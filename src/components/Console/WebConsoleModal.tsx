import React, { useState, useEffect } from 'react';
import { useDashboard } from '../../context/DashboardContext';

export const WebConsoleModal: React.FC = () => {
  const {
    isConsoleOpen,
    closeConsole,
    configPasscode,
    updatePasscode,
    animSpeed,
    updateSpeed,
    theme,
    updateTheme,
    mode,
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
    workspaceDir,
    updateWorkspaceDir,
    setIsLocked,
    openLockModal
  } = useDashboard();

  type TabKey = 'mode' | 'lock' | 'wallpaper' | 'ai' | 'speed_theme' | 'effects';
  const [activeTab, setActiveTab] = useState<TabKey>('mode');
  const [inputPass, setInputPass] = useState(configPasscode);
  const [inputWorkspaceDir, setInputWorkspaceDir] = useState(workspaceDir);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [wsStatus, setWsStatus] = useState<{ text: string; isError: boolean } | null>(null);
  const [activeSessionCount, setActiveSessionCount] = useState<number>(0);

  // Sync input passcode when configPasscode changes
  useEffect(() => {
    setInputPass(configPasscode);
  }, [configPasscode]);

  // Sync input workspace dir when workspaceDir changes
  useEffect(() => {
    setInputWorkspaceDir(workspaceDir);
  }, [workspaceDir]);

  // Query live active sessions when console opens or tab changes
  useEffect(() => {
    if (!isConsoleOpen) return;
    const w = window as any;
    if (w.go?.main?.App?.GetActiveSessions) {
      w.go.main.App.GetActiveSessions()
        .then((sessions: any[]) => {
          if (Array.isArray(sessions)) {
            setActiveSessionCount(sessions.length);
          }
        })
        .catch(() => {});
    }
  }, [isConsoleOpen, activeTab]);

  // Handle ESC key to close console
  useEffect(() => {
    if (!isConsoleOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeConsole();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isConsoleOpen, closeConsole]);

  if (!isConsoleOpen) return null;

  const handleSavePasscode = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputPass.trim();
    if (!clean) return;
    updatePasscode(clean);
    setSaveStatus('PASSWORD UPDATED // CONFIG SAVED');
    setTimeout(() => setSaveStatus(null), 2500);
  };

  const handleLockNow = () => {
    closeConsole();
    setIsLocked(true);
    openLockModal();
  };

  const handleQuit = () => {
    if (window.confirm('确认要退出 Agent Cockpit 监控程序吗？')) {
      const w = window as any;
      if (w.go?.main?.App?.Quit) {
        w.go.main.App.Quit();
      }
    }
  };

  const speedPresets = [0.5, 1.0, 2.0, 4.0];
  const autoLockOptions = [
    { label: '关闭 (Disabled)', value: 0 },
    { label: '1 分钟', value: 1 },
    { label: '5 分钟', value: 5 },
    { label: '10 分钟', value: 10 },
    { label: '30 分钟', value: 30 }
  ];

  return (
    <div
      className="lock-modal-mask"
      id="consoleModal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="consoleModalTitle"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          closeConsole();
        }
      }}
    >
      <div className="lock-modal console-modal" style={{ maxWidth: '640px' }}>
        {/* Header */}
        <div className="lock-modal-hdr">
          <div className="lock-badge" style={{ color: 'var(--accent)' }}>
            ⚙ AGENT COCKPIT // 核心功能控制中心
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="console-sec-badge" style={{ textTransform: 'uppercase' }}>
              MODE: {mode}
            </span>
            <span className="lock-code">TRAY-SYNCED</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="console-tab-nav">
          <button
            type="button"
            className={`console-tab-btn ${activeTab === 'mode' ? 'active' : ''}`}
            onClick={() => setActiveTab('mode')}
          >
            🖥 运行模式
          </button>
          <button
            type="button"
            className={`console-tab-btn ${activeTab === 'lock' ? 'active' : ''}`}
            onClick={() => setActiveTab('lock')}
          >
            🔐 锁屏与安全
          </button>
          <button
            type="button"
            className={`console-tab-btn ${activeTab === 'wallpaper' ? 'active' : ''}`}
            onClick={() => setActiveTab('wallpaper')}
          >
            🖼 壁纸配置
          </button>
          <button
            type="button"
            className={`console-tab-btn ${activeTab === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai')}
          >
            🤖 AI & 工作空间
          </button>
          <button
            type="button"
            className={`console-tab-btn ${activeTab === 'speed_theme' ? 'active' : ''}`}
            onClick={() => setActiveTab('speed_theme')}
          >
            ⚡ 速度与主题
          </button>
          <button
            type="button"
            className={`console-tab-btn ${activeTab === 'effects' ? 'active' : ''}`}
            onClick={() => setActiveTab('effects')}
          >
            ✨ 视觉特效
          </button>
        </div>

        {/* Modal Body */}
        <div className="lock-modal-body" style={{ maxHeight: '68vh', overflowY: 'auto' }}>
          {/* TAB 1: 运行模式 */}
          {activeTab === 'mode' && (
            <div>
              <div className="console-sec-desc">
                选择 Agent Cockpit 核心呈现模式。无需使用 Windows CMD 命令行，参数更改将即时生效并持久化至本地配置。
              </div>

              <div className="mode-selection-grid">
                {/* Mode 1: 锁屏模式 */}
                <div
                  className={`mode-card ${mode === 'lock' ? 'active' : ''}`}
                  onClick={() => updateMode('lock')}
                >
                  <div className="mode-card-hdr">
                    <span className="mode-card-title">🔒 全屏锁屏守护 (LOCK SCREEN)</span>
                    {mode === 'lock' && <span className="mode-active-pill">ACTIVE</span>}
                  </div>
                  <div className="mode-card-specs">HWND_TOPMOST · 全屏置顶 · 键鼠阻断 · 密码防窥</div>
                  <div className="mode-card-desc">
                    全屏独占屏幕顶层，拦截键盘触控事件以防误触与窥屏，必须输入解锁密码方可解除或退出。离开工位时的绝佳科技屏保。
                  </div>
                  <button
                    type="button"
                    className={`btn-pill ${mode === 'lock' ? 'active' : ''}`}
                    style={{ marginTop: '8px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      updateMode('lock');
                    }}
                  >
                    {mode === 'lock' ? '✓ 当前已激活' : '切换至锁屏模式'}
                  </button>
                </div>

                {/* Mode 2: 动态壁纸模式 */}
                <div
                  className={`mode-card ${mode === 'wallpaper' ? 'active' : ''}`}
                  onClick={() => updateMode('wallpaper')}
                >
                  <div className="mode-card-hdr">
                    <span className="mode-card-title">🖼 动态桌面壁纸 (WALLPAPER)</span>
                    {mode === 'wallpaper' && <span className="mode-active-pill">ACTIVE</span>}
                  </div>
                  <div className="mode-card-specs">HWND_BOTTOM · 置于底层 · 放行键鼠 · 无感伴随</div>
                  <div className="mode-card-desc">
                    全屏置于桌面底层（所有打开的应用程序窗口下方），自动解除按键触控拦截，完全不影响敲代码与办公，作为沉浸式动态科技壁纸运行。
                  </div>
                  <button
                    type="button"
                    className={`btn-pill ${mode === 'wallpaper' ? 'active' : ''}`}
                    style={{ marginTop: '8px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      updateMode('wallpaper');
                    }}
                  >
                    {mode === 'wallpaper' ? '✓ 当前已激活' : '切换为动态壁纸'}
                  </button>
                </div>

                {/* Mode 3: 常规窗口模式 */}
                <div
                  className={`mode-card ${mode === 'windowed' ? 'active' : ''}`}
                  onClick={() => updateMode('windowed')}
                >
                  <div className="mode-card-hdr">
                    <span className="mode-card-title">🪟 常规居中窗口 (WINDOWED)</span>
                    {mode === 'windowed' && <span className="mode-active-pill">ACTIVE</span>}
                  </div>
                  <div className="mode-card-specs">1280×800 · 窗口化 · 自由拖拽与缩放 · 随开随看</div>
                  <div className="mode-card-desc">
                    以标准桌面可移动窗口方式运行，便于单显示器环境一边查阅 AI 监控大盘，一边处理其他事务。
                  </div>
                  <button
                    type="button"
                    className={`btn-pill ${mode === 'windowed' ? 'active' : ''}`}
                    style={{ marginTop: '8px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      updateMode('windowed');
                    }}
                  >
                    {mode === 'windowed' ? '✓ 当前已激活' : '切换为常规窗口'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 锁屏与安全 */}
          {activeTab === 'lock' && (
            <div>
              {/* Passcode Config */}
              <div className="console-sec">
                <div className="console-sec-hdr">
                  <span className="console-sec-title">🔐 解锁密码配置 (UNLOCK PASSCODE)</span>
                  <span className="console-sec-badge">当前有效: {configPasscode}</span>
                </div>
                <div style={{ fontSize: '9px', color: 'var(--mute)', marginBottom: '8px' }}>
                  设置在锁屏模式下解除锁定或安全退出所需的密码（默认 1234）。
                </div>
                <form onSubmit={handleSavePasscode} className="lock-input-row">
                  <input
                    type="text"
                    placeholder="输入新密码 (1~20位字符)"
                    value={inputPass}
                    onChange={e => setInputPass(e.target.value)}
                    maxLength={20}
                    autoComplete="off"
                  />
                  <button type="submit" className="btn" style={{ fontWeight: 700 }}>
                    保存密码
                  </button>
                </form>
                {saveStatus && <div className="lock-msg ok">{saveStatus}</div>}
              </div>

              {/* Auto-Lock Idle Timeout */}
              <div className="console-sec">
                <div className="console-sec-hdr">
                  <span className="console-sec-title">⏱ 闲置自动锁屏 (AUTO-LOCK IDLE)</span>
                  <span className="console-sec-badge">
                    {autoLockMinutes === 0 ? '已禁用' : `${autoLockMinutes} 分钟后`}
                  </span>
                </div>
                <div style={{ fontSize: '9px', color: 'var(--mute)', marginBottom: '8px' }}>
                  当在窗口或壁纸模式下无鼠标/键盘活动超过指定时间后，系统将自动激活全屏安全锁屏。
                </div>
                <div className="speed-pills">
                  {autoLockOptions.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`btn-pill ${autoLockMinutes === opt.value ? 'active' : ''}`}
                      onClick={() => updateAutoLockMinutes(opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Startup Lock */}
              <div className="console-sec">
                <div className="console-sec-hdr">
                  <span className="console-sec-title">🚀 启动即锁屏 (LOCK ON STARTUP)</span>
                  <span className="console-sec-badge">
                    {lockOnStartup ? '已开启' : '已关闭'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '9px', color: 'var(--mute)', maxWidth: '80%' }}>
                    程序冷启动时直接进入全屏锁屏防护，必须正确输入解锁密码方可解锁。
                  </div>
                  <button
                    type="button"
                    className={`btn-pill ${lockOnStartup ? 'active' : ''}`}
                    onClick={() => updateLockOnStartup(!lockOnStartup)}
                  >
                    {lockOnStartup ? '● 开启中' : '○ 已关闭'}
                  </button>
                </div>
              </div>

              {/* Immediate Lock Action */}
              <div className="console-sec" style={{ borderColor: 'rgba(224, 86, 86, 0.4)', background: 'rgba(224, 86, 86, 0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <b style={{ fontSize: '9.5px', color: '#e05656', letterSpacing: '0.08em' }}>
                      ARM LOCK SCREEN NOW
                    </b>
                    <div style={{ fontSize: '8.5px', color: 'var(--mute)', marginTop: '2px' }}>
                      立即锁定当前工作站并全屏展示科技监控大屏。
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn"
                    style={{ color: '#e05656', borderColor: '#e05656' }}
                    onClick={handleLockNow}
                  >
                    🔒 立即锁屏
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: 壁纸配置 */}
          {activeTab === 'wallpaper' && (
            <div>
              <div className="console-sec">
                <div className="console-sec-hdr">
                  <span className="console-sec-title">🖼 动态壁纸工作机制与特性</span>
                  <span className="console-sec-badge">WIN32 HWND_BOTTOM</span>
                </div>
                <div className="wallpaper-info-list">
                  <div className="wallpaper-info-item">
                    <b>1. 桌面底层无干扰置顶:</b>
                    <span>
                      通过 Windows Win32 API 自动将窗口嵌入并吸附在桌面最底层 (`HWND_BOTTOM`)。你的 VS Code、浏览器、终端都将浮在监控大盘上方，不产生视觉或操作阻挡。
                    </span>
                  </div>
                  <div className="wallpaper-info-item">
                    <b>2. 键鼠穿透与放行:</b>
                    <span>
                      壁纸模式下，程序会自动卸载全局按键与鼠标拦截钩子，不会误触发锁屏阻断，桌面图标点击与日常打字办公完全流畅。
                    </span>
                  </div>
                  <div className="wallpaper-info-item">
                    <b>3. 动态自适应多屏:</b>
                    <span>
                      自动检测桌面主副屏幕分辨率，渲染无损自适应全屏科技动画。
                    </span>
                  </div>
                  <div className="wallpaper-info-item">
                    <b>4. 任务栏右下角常驻托盘小图标:</b>
                    <span>
                      若在壁纸模式下想唤出本控制台或切换模式，只需右键或点击屏幕右下角的 Agent Cockpit 托盘图标即可立即打开。
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: '14px', textAlign: 'center' }}>
                  <button
                    type="button"
                    className="btn"
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      fontWeight: 800,
                      borderColor: 'var(--accent)',
                      color: 'var(--accent)'
                    }}
                    onClick={() => updateMode('wallpaper')}
                  >
                    {mode === 'wallpaper' ? '✓ 当前已作为桌面动态壁纸运行' : '🖼 立即设为桌面动态壁纸'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: AI 编程监听 */}
          {activeTab === 'ai' && (
            <div>
              <div className="console-sec">
                <div className="console-sec-hdr">
                  <span className="console-sec-title">🤖 AI 编程行为全局监听器</span>
                  <span className="console-sec-badge">
                    {aiWatcherEnabled ? 'ACTIVE LISTENING' : 'DISABLED'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ fontSize: '9px', color: 'var(--mute)', maxWidth: '78%' }}>
                    跨平台（Windows/Linux/macOS）自动监听并解析 Codex、Claude Code、Antigravity 的文件编辑、CLI 命令与会话活动。
                  </div>
                  <button
                    type="button"
                    className={`btn-pill ${aiWatcherEnabled ? 'active' : ''}`}
                    onClick={() => updateAiWatcherEnabled(!aiWatcherEnabled)}
                  >
                    {aiWatcherEnabled ? '● 监听中' : '○ 已暂停'}
                  </button>
                </div>

                <div className="watcher-cards-grid">
                  <div className="watcher-card">
                    <div className="watcher-card-hdr">
                      <b>GOOGLE ANTIGRAVITY</b>
                      <span className="status-indicator-dot online" />
                    </div>
                    <small>监听路径: ~/.gemini/antigravity-ide/brain/*</small>
                    <div className="watcher-card-foot">会话日志、工具调用、思考流监控</div>
                  </div>

                  <div className="watcher-card">
                    <div className="watcher-card-hdr">
                      <b>CLAUDE CODE</b>
                      <span className="status-indicator-dot online" />
                    </div>
                    <small>监听路径: ~/.claude/projects/*</small>
                    <div className="watcher-card-foot">会话轨迹、文件改动、Shell执行</div>
                  </div>

                  <div className="watcher-card">
                    <div className="watcher-card-hdr">
                      <b>OPENAI CODEX / CLI</b>
                      <span className="status-indicator-dot online" />
                    </div>
                    <small>监听机制: 子进程与控制台管道嗅探</small>
                    <div className="watcher-card-foot">命令输入与执行状态监控</div>
                  </div>
                </div>

                <div className="console-meta-box" style={{ marginTop: '10px' }}>
                  <div>💾 <b>内存存储模式:</b> 所有 AI 编程监听数据均保存在高并发环形内存中，退出后自动丢弃，零磁盘写入负担。</div>
                  <div>📡 <b>当前活跃 AI 会话数:</b> <b style={{ color: 'var(--accent)' }}>{activeSessionCount}</b> 个并行会话</div>
                </div>
              </div>

              {/* Workspace Directory Configuration Section */}
              <div className="console-sec" style={{ marginTop: '12px' }}>
                <div className="console-sec-hdr">
                  <span className="console-sec-title">📂 真实代码工作空间监听 (WORKSPACE DIRECTORY)</span>
                  <span className="console-sec-badge">
                    {workspaceDir ? 'MONITORING DIR' : 'NOT SET'}
                  </span>
                </div>
                <div style={{ fontSize: '9px', color: 'var(--mute)', marginBottom: '8px' }}>
                  设置一个您正在开发的真实项目目录（例如 <code>D:\Code\my-project</code>）。Agent Cockpit 将监听该目录下文件的实时保存与改动，并在 <b>Window 3 (WORKSPACE RUNTIME CODE)</b> 中以赛博打字机动画实时展示代码变动。
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const clean = inputWorkspaceDir.trim();
                    if (!clean) {
                      setWsStatus({ text: '⚠️ 目录路径不能为空', isError: true });
                      setTimeout(() => setWsStatus(null), 3000);
                      return;
                    }
                    const res = await updateWorkspaceDir(clean);
                    if (res.success) {
                      setWsStatus({ text: `✓ 成功监听工作空间: ${res.message}`, isError: false });
                      setTimeout(() => setWsStatus(null), 3500);
                    } else {
                      setWsStatus({ text: `✗ 设置失败: ${res.message}`, isError: true });
                      setTimeout(() => setWsStatus(null), 4000);
                    }
                  }}
                  style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
                >
                  <input
                    type="text"
                    value={inputWorkspaceDir}
                    onChange={e => setInputWorkspaceDir(e.target.value)}
                    placeholder="例如: D:\Code\my-project 或 /Users/name/repo"
                    className="console-input"
                    style={{ flex: 1, fontFamily: 'var(--mono)', fontSize: '10px' }}
                  />
                  <button type="submit" className="btn" style={{ borderColor: 'var(--accent)', color: 'var(--accent)', whiteSpace: 'nowrap' }}>
                    💾 保存并监听
                  </button>
                  <button
                    type="button"
                    className="btn"
                    style={{ fontSize: '9px', padding: '6px 10px', whiteSpace: 'nowrap' }}
                    onClick={async () => {
                      const w = window as any;
                      if (w.go?.main?.App?.GetWorkspaceDir) {
                        try {
                          const cur = await w.go.main.App.GetWorkspaceDir();
                          if (cur) {
                            setInputWorkspaceDir(cur);
                            const res = await updateWorkspaceDir(cur);
                            if (res.success) {
                              setWsStatus({ text: `✓ 已定位至当前工作目录: ${res.message}`, isError: false });
                              setTimeout(() => setWsStatus(null), 3500);
                            }
                          }
                        } catch (err: any) {
                          setWsStatus({ text: `✗ 无法获取工作目录: ${err?.message || err}`, isError: true });
                          setTimeout(() => setWsStatus(null), 3500);
                        }
                      }
                    }}
                    title="自动探测并绑定当前程序运行目录"
                  >
                    📍 当前目录
                  </button>
                </form>

                {wsStatus && (
                  <div
                    style={{
                      fontSize: '9px',
                      marginTop: '6px',
                      color: wsStatus.isError ? '#e05656' : 'var(--accent)',
                      fontFamily: 'var(--mono)'
                    }}
                  >
                    {wsStatus.text}
                  </div>
                )}

                <div className="console-meta-box" style={{ marginTop: '10px', fontSize: '8.5px' }}>
                  <div>📁 <b>当前生效目录:</b> <code style={{ color: 'var(--accent)' }}>{workspaceDir || '(未配置，默认使用程序运行目录)'}</code></div>
                  <div>⚡ <b>联动特性:</b> 监听 <code>.go, .ts, .tsx, .py, .js, .json, .yaml</code> 等常见代码变更，闲置时自动轮播项目文件。</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: 速度与主题 */}
          {activeTab === 'speed_theme' && (
            <div>
              {/* Playback Speed */}
              <div className="console-sec">
                <div className="console-sec-hdr">
                  <span className="console-sec-title">⚡ 动画与仿真倍速</span>
                  <span className="console-sec-badge">{animSpeed.toFixed(1)}× MULTIPLIER</span>
                </div>
                <div className="speed-pills">
                  {speedPresets.map(s => (
                    <button
                      key={s}
                      type="button"
                      className={`btn-pill ${Math.abs(animSpeed - s) < 0.05 ? 'active' : ''}`}
                      onClick={() => updateSpeed(s)}
                    >
                      {s === 1.0 ? '1.0× (标准速度)' : `${s.toFixed(1)}×`}
                    </button>
                  ))}
                </div>
                <div className="slider-row">
                  <input
                    type="range"
                    min="0.2"
                    max="5.0"
                    step="0.1"
                    value={animSpeed}
                    onChange={e => updateSpeed(parseFloat(e.target.value))}
                    className="console-slider"
                  />
                  <span className="slider-val">{animSpeed.toFixed(1)}×</span>
                </div>
              </div>

              {/* Theme Selection */}
              <div className="console-sec">
                <div className="console-sec-hdr">
                  <span className="console-sec-title">🎨 黑白 / 深浅视觉主题</span>
                  <span className="console-sec-badge">{theme.toUpperCase()}</span>
                </div>
                <div className="theme-options">
                  <button
                    type="button"
                    className={`theme-card ${theme === 'dark' ? 'active' : ''}`}
                    onClick={() => updateTheme('dark')}
                  >
                    <b>DARK THEME (黑客黑)</b>
                    <small>极客暗黑 · 荧光赛博绿 · 高对比夜间模式</small>
                  </button>
                  <button
                    type="button"
                    className={`theme-card ${theme === 'light' ? 'active' : ''}`}
                    onClick={() => updateTheme('light')}
                  >
                    <b>LIGHT THEME (蓝图白)</b>
                    <small>纸质墨水 · 现代蓝图工程灰 · 日间高清晰</small>
                  </button>
                </div>
              </div>

              {/* Exit Application Section */}
              <div className="console-sec" style={{ borderColor: 'rgba(224, 86, 86, 0.4)', background: 'rgba(224, 86, 86, 0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <b style={{ fontSize: '9.5px', color: '#e05656', letterSpacing: '0.08em' }}>
                      ❌ 退出程序 (EXIT AGENT COCKPIT)
                    </b>
                    <div style={{ fontSize: '8.5px', color: 'var(--mute)', marginTop: '2px' }}>
                      安全终止所有后台监听器与系统托盘图标，彻底退出应用程序。
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn"
                    style={{ color: '#e05656', borderColor: '#e05656', fontWeight: 800 }}
                    onClick={handleQuit}
                  >
                    退出程序
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: 视觉特效 (VISUAL EFFECTS) */}
          {activeTab === 'effects' && (
            <div>
              <div className="console-sec-desc">
                自定义屏幕全局复古与科技感视觉特效。配置项即时生效并自动持久化在运行目录的 config.yaml 中。
              </div>

              <div className="mode-selection-grid">
                {/* 1. CRT TV Snow Static */}
                <div className={`mode-card ${tvNoiseEffect ? 'active' : ''}`}>
                  <div className="mode-card-hdr">
                    <span className="mode-card-title">📺 老电视雪花特效 (CRT TV NOISE & SNOW)</span>
                    <span
                      className="mode-active-pill"
                      style={{
                        background: tvNoiseEffect ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
                        color: tvNoiseEffect ? 'var(--bg)' : 'var(--mute)'
                      }}
                    >
                      {tvNoiseEffect ? 'ACTIVE' : 'OFF'}
                    </span>
                  </div>
                  <div className="mode-card-specs">24 FPS · 像素噪点 · 偶发水平同步闪变 · 80年代CRT显像管</div>
                  <div className="mode-card-desc">
                    模拟老式显像管电视天线无信号时的黑白杂波噪点。在运行过程中每隔 4~8 秒随机触发水平同步瞬断、亮暗抖动与信号闪烁，忠实还原老电视偶尔闪动的雪花质感。
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className={`btn-pill ${tvNoiseEffect ? 'active' : ''}`}
                      onClick={() => updateTvNoiseEffect(!tvNoiseEffect)}
                    >
                      {tvNoiseEffect ? '✓ 点击关闭雪花特效' : '开启老电视雪花特效'}
                    </button>
                    {tvNoiseEffect && (
                      <button
                        type="button"
                        className="btn-pill"
                        style={{ borderColor: 'var(--accent)', color: 'var(--accent)', fontWeight: 700 }}
                        onClick={triggerTvFlicker}
                        title="立即触发一次老电视偶尔闪变效果"
                      >
                        ⚡ 立即测试闪动 (TEST FLICKER)
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. Global Mosaic Pixelation */}
                <div className={`mode-card ${mosaicEffect ? 'active' : ''}`}>
                  <div className="mode-card-hdr">
                    <span className="mode-card-title">🔲 全局马赛克特效 (MOSAIC / PIXELATION)</span>
                    <span
                      className="mode-active-pill"
                      style={{
                        background: mosaicEffect ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
                        color: mosaicEffect ? 'var(--bg)' : 'var(--mute)'
                      }}
                    >
                      {mosaicEffect ? 'ACTIVE' : 'OFF'}
                    </span>
                  </div>
                  <div className="mode-card-specs">SVG 硬件像素化 · 全局点阵粗颗粒 · 监控防窥 · 赛博复古</div>
                  <div className="mode-card-desc">
                    对监控大盘进行全局点阵像素化采样，将所有文字、曲线与数据转化为复古粗颗粒像素方块。既能有效防止工位旁人窥视敏感代码与数据，又兼具像素艺术格调。控制台与密码窗口自动免除马赛克以保证操作清晰。
                  </div>
                  <div style={{ marginTop: '10px' }}>
                    <button
                      type="button"
                      className={`btn-pill ${mosaicEffect ? 'active' : ''}`}
                      onClick={() => updateMosaicEffect(!mosaicEffect)}
                    >
                      {mosaicEffect ? '✓ 点击关闭马赛克特效' : '开启全局马赛克特效'}
                    </button>
                  </div>
                </div>

                {/* 3. CRT Scanlines & Vignette */}
                <div className={`mode-card ${scanlineEffect ? 'active' : ''}`}>
                  <div className="mode-card-hdr">
                    <span className="mode-card-title">📟 CRT 逐行扫描线与球面暗角 (SCANLINES & VIGNETTE)</span>
                    <span
                      className="mode-active-pill"
                      style={{
                        background: scanlineEffect ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
                        color: scanlineEffect ? 'var(--bg)' : 'var(--mute)'
                      }}
                    >
                      {scanlineEffect ? 'ACTIVE' : 'OFF'}
                    </span>
                  </div>
                  <div className="mode-card-specs">逐行电子束光栅 · 球面暗角 · 磷光微光 · 工业终端感</div>
                  <div className="mode-card-desc">
                    模拟早期工业计算机终端 CRT 显示器的隔行扫描光栅和球面边缘衰减暗角，配合黑客黑主题使用视觉震撼。
                  </div>
                  <div style={{ marginTop: '10px' }}>
                    <button
                      type="button"
                      className={`btn-pill ${scanlineEffect ? 'active' : ''}`}
                      onClick={() => updateScanlineEffect(!scanlineEffect)}
                    >
                      {scanlineEffect ? '✓ 点击关闭扫描线特效' : '开启 CRT 扫描线特效'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Persistent Windows System Tray Note */}
          <div className="tray-notice-banner">
            <span style={{ fontSize: '13px' }}>📌</span>
            <div style={{ flex: 1 }}>
              <b>Windows 任务栏通知区小图标已集成</b>
              <div style={{ fontSize: '8px', color: 'var(--mute)', marginTop: '2px' }}>
                在屏幕右下角通知区域找到 Agent Cockpit 图标：左键快速打开本控制台，右键可直达切换 锁屏/壁纸/窗口、暂停动效、切换主题与退出。
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="lock-modal-ftr">
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn-sm"
              onClick={handleLockNow}
              style={{ color: '#e05656', borderColor: '#e05656', fontWeight: 700 }}
            >
              🔒 立即锁屏
            </button>
            <button
              type="button"
              className="btn-sm"
              onClick={handleQuit}
              style={{ color: '#e05656', borderColor: '#e05656', fontWeight: 700 }}
              title="退出 Agent Cockpit 进程"
            >
              ❌ 退出程序
            </button>
          </div>
          <button type="button" className="btn" onClick={closeConsole} style={{ fontWeight: 700 }}>
            关闭控制台
          </button>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { useDashboard } from '../../context/DashboardContext';

export const Controls: React.FC = () => {
  const { openConsole } = useDashboard();

  // const modeBadge = {
  //   lock: { text: '🔒 锁屏', color: '#e05656' },
  //   wallpaper: { text: '🖼 壁纸', color: 'var(--accent)' },
  //   windowed: { text: '🪟 窗口', color: 'var(--ink2)' }
  // }[mode] || { text: '模式', color: 'var(--mute)' };

  return (
    <div className="ctls" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
      {/* <button
        className="btn-pill"
        type="button"
        title="当前运行模式 (点击打开控制中心快速切换)"
        onClick={(e) => {
          e.stopPropagation();
          openConsole();
        }}
        style={{
          borderColor: modeBadge.color,
          color: modeBadge.color,
          fontSize: '8.5px',
          padding: '3px 8px',
          cursor: 'pointer'
        }}
      >
        {modeBadge.text}
      </button> */}

      <button
        className="btn"
        id="consoleBtn"
        type="button"
        title="Agent Cockpit 控制中心 (运行模式/锁屏配置/壁纸选项/AI监听/Windows托盘)"
        onClick={(e) => {
          e.stopPropagation();
          openConsole();
        }}
      >
        ⚙ CONSOLE
      </button>
    </div>
  );
};

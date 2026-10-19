import React from 'react';
import { useSystemStatus, formatBytes, formatRate } from '../../hooks/useSystemStatus';

export const SystemStatusPanel: React.FC = () => {
  const { stats, isLive } = useSystemStatus();

  const getStatusColor = (val: number) => {
    if (val >= 90) return 'var(--c-alert, #ff4d4f)';
    if (val >= 75) return 'var(--c-warn, #faad14)';
    return 'var(--c-line, #34d996)';
  };

  const cpuColor = getStatusColor(stats.cpuPercent);
  const memColor = getStatusColor(stats.memPercent);
  const diskColor = getStatusColor(stats.diskPercent);

  return (
    <article className="panel sys-panel">
      <div className="ph">
        <h2>
          SYS TELEMETRY<i>HOST VECTORS</i>
        </h2>
        <span className="sys-badge">
          <i className={`sys-dot ${isLive ? 'on' : 'sim'}`} />
          {isLive ? 'LIVE' : 'SYNC'}
        </span>
      </div>

      <div className="pb">
        <ul className="sys-list">
          {/* 1. CPU */}
          <li className="sys-row">
            <div className="sys-row-hd">
              <span className="sys-tag">CPU</span>
              <span className="sys-val" style={{ color: cpuColor }}>
                {stats.cpuPercent.toFixed(1)}%
              </span>
            </div>
            <div className="sys-track">
              <i
                style={{
                  width: `${Math.max(2, Math.min(100, stats.cpuPercent))}%`,
                  background: cpuColor
                }}
              />
            </div>
            <div className="sys-row-ft">
              <span>{stats.cpuCores}C</span>
              <span className="sys-detail">
                {stats.cpuPercent < 35 ? 'nominal' : stats.cpuPercent < 75 ? 'busy' : 'alert'}
              </span>
            </div>
          </li>

          {/* 2. MEMORY */}
          <li className="sys-row">
            <div className="sys-row-hd">
              <span className="sys-tag">RAM</span>
              <span className="sys-val" style={{ color: memColor }}>
                {stats.memPercent.toFixed(1)}%
              </span>
            </div>
            <div className="sys-track">
              <i
                style={{
                  width: `${Math.max(2, Math.min(100, stats.memPercent))}%`,
                  background: memColor
                }}
              />
            </div>
            <div className="sys-row-ft">
              <span>{formatBytes(stats.memUsed)}</span>
              <span className="sys-detail">/ {formatBytes(stats.memTotal)}</span>
            </div>
          </li>

          {/* 3. DISK */}
          <li className="sys-row">
            <div className="sys-row-hd">
              <span className="sys-tag">DSK [{stats.diskPath}]</span>
              <span className="sys-val" style={{ color: diskColor }}>
                {stats.diskPercent.toFixed(1)}%
              </span>
            </div>
            <div className="sys-track">
              <i
                style={{
                  width: `${Math.max(2, Math.min(100, stats.diskPercent))}%`,
                  background: diskColor
                }}
              />
            </div>
            <div className="sys-row-ft">
              <span>FREE {formatBytes(stats.diskFree)}</span>
              <span className="sys-detail">/ {formatBytes(stats.diskTotal)}</span>
            </div>
          </li>

          {/* 4. NETWORK */}
          <li className="sys-row">
            <div className="sys-row-hd">
              <span className="sys-tag">NET</span>
              <span className="sys-val net-rates">
                <span className="dn">↓ {formatRate(stats.netRecvRate)}</span>
              </span>
            </div>
            <div className="sys-track net-track">
              <i
                className="net-in"
                style={{
                  width: `${Math.min(100, Math.max(3, (stats.netRecvRate / (1024 * 1024 * 4)) * 100))}%`
                }}
              />
              <i
                className="net-out"
                style={{
                  width: `${Math.min(100, Math.max(3, (stats.netSentRate / (1024 * 1024 * 2)) * 100))}%`
                }}
              />
            </div>
            <div className="sys-row-ft">
              <span className="up">↑ {formatRate(stats.netSentRate)}</span>
              <span className="sys-detail">RX {formatBytes(stats.netTotalRecv)}</span>
            </div>
          </li>
        </ul>
      </div>

      <div className="pf">
        {stats.cpuModel ? stats.cpuModel.split(' ')[0] : 'GO KERNEL'} // 1000ms loop
      </div>
    </article>
  );
};

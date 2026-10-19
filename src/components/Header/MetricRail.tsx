import React from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { CONFIG } from '../../constants/config';

export const MetricRail: React.FC = () => {
  const { tasks, agents, wfs, clockStr, hiIdx, realStageData } = useDashboard();

  const totalTasks = realStageData?.totalEvents || tasks.length;
  const activeAgents = realStageData?.activeAgents || agents.filter(a => a.task >= 0).length;
  const totalAgents = 12;
  const totalWfs = realStageData?.totalSources || CONFIG.workflows.length;
  const doneCount = realStageData?.doneOutputs || tasks.filter(t => t.state === 'done').length;
  const matchedCount = realStageData?.verifiedCount || wfs.filter(w => w.q >= 0.8).length;
  const pendingCount = realStageData?.pendingCount || Math.max(0, totalWfs - matchedCount);

  return (
    <header className="top">
      <div className="cell title">
        <h1>AGENT COCKPIT / <span className="zh">DISPATCH CENTER</span></h1>
        <p>TASKS → AGENTS → OUTPUTS · REAL-TIME AI TELEMETRY · <b id="clock">{clockStr || '--:--:--'}</b></p>
      </div>
      <div className={`cell stat ${hiIdx === 0 ? 'on' : ''}`}>
        <span className="k">TASKS<i>TOTAL</i></span>
        <span className="v" id="s0">{totalTasks}</span>
      </div>
      <div className={`cell stat ${hiIdx === 1 ? 'on' : ''}`}>
        <span className="k">AGENTS<i>ACTIVE</i></span>
        <span className="v" id="s1">
          {activeAgents} <small>/ {totalAgents}</small>
        </span>
      </div>
      <div className={`cell stat ${hiIdx === 2 ? 'on' : ''}`}>
        <span className="k">WORKFLOWS<i>PIPELINES</i></span>
        <span className="v" id="s2">{totalWfs}</span>
      </div>
      <div className={`cell stat ${hiIdx === 3 ? 'on' : ''}`}>
        <span className="k">OUTPUTS<i>DONE</i></span>
        <span className="v" id="s3">{doneCount}</span>
      </div>
      <div className={`cell stat ${hiIdx === 4 ? 'on' : ''}`}>
        <span className="k">MATCHED<i>VERIFIED</i></span>
        <span className="v" id="s4">
          {matchedCount} <small>/ {totalWfs}</small>
        </span>
      </div>
      <div className={`cell stat ${hiIdx === 5 ? 'on' : ''}`}>
        <span className="k">PENDING<i>REVIEW</i></span>
        <span className="v" id="s5">{pendingCount}</span>
      </div>
    </header>
  );
};

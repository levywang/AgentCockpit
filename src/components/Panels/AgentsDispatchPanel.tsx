import React from 'react';
import { useDashboard } from '../../context/DashboardContext';

export const AgentsDispatchPanel: React.FC = () => {
  const { agents, tasks, realAgents } = useDashboard();

  const useReal = realAgents && realAgents.length > 0;
  const activeCount = useReal
    ? realAgents.filter(a => a.status === 'busy').length
    : agents.filter(a => a.task >= 0 && tasks[a.task] && tasks[a.task].state === 'run').length;
  const totalCount = useReal ? realAgents.length : agents.length;
  const idleCount = totalCount - activeCount;

  return (
    <article className="panel">
      <div className="ph">
        <h2>
          12 AGENTS / DISPATCH<i>ORCHESTRATION</i>
        </h2>
        <span id="agMeta">{activeCount} active / {idleCount} idle</span>
      </div>
      <div className="pb">
        <ul className="agents" id="agents">
          {useReal
            ? realAgents.map(a => {
                const isRunning = a.status === 'busy';
                const progressPct = isRunning ? Math.max(12, Math.round(a.progress * 100)) : 0;
                const taskDesc = isRunning ? a.taskTitle : 'standby';
                return (
                  <li key={a.code} className={isRunning ? 'busy' : 'idle'} title={`${a.code} [${a.name}] - ${taskDesc}`}>
                    <span className="n" title={a.code}>{a.code}</span>
                    <span className="r" title={a.name}>{a.name}</span>
                    <span className="b">
                      <b>
                        <i style={{ width: `${progressPct}%` }} />
                      </b>
                      <small title={taskDesc}>{taskDesc}</small>
                    </span>
                  </li>
                );
              })
            : agents.map(a => {
                const task = a.task >= 0 && a.task < tasks.length ? tasks[a.task] : null;
                const isRunning = Boolean(task && task.state === 'run');
                const statusText = isRunning && task
                  ? `${task.id} · ${task.prog < 0.35 ? 'reading' : task.prog < 0.75 ? 'working' : 'review'}`
                  : 'idle';
                const progressPct = isRunning && task ? Math.max(4, Math.round(task.prog * 100)) : 0;

                return (
                  <li key={a.code} className={isRunning ? 'busy' : 'idle'} title={`${a.code} [${a.name}] - ${statusText}`}>
                    <span className="n" title={a.code}>{a.code}</span>
                    <span className="r" title={a.name}>{a.name}</span>
                    <span className="b">
                      <b>
                        <i style={{ width: `${progressPct}%` }} />
                      </b>
                      <small title={statusText}>{statusText}</small>
                    </span>
                  </li>
                );
              })}
        </ul>
      </div>
      <div className="pf">live process tree / detected ai tools</div>
    </article>
  );
};

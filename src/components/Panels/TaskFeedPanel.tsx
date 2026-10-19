import React, { useRef, useEffect, useState } from 'react';
import { useDashboard } from '../../context/DashboardContext';

export const TaskFeedPanel: React.FC = () => {
  const { feed, tasks, realStageData, realSolver } = useDashboard();
  const listRef = useRef<HTMLOListElement>(null);
  const [visibleCount, setVisibleCount] = useState(16);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;

    const updateHeight = () => {
      const containerH = el.parentElement?.clientHeight || el.clientHeight || 0;
      if (containerH > 20) {
        const count = Math.max(6, Math.floor(containerH / 13.5));
        setVisibleCount(count);
      }
    };

    updateHeight();
    const ro = new ResizeObserver(updateHeight);
    ro.observe(el);
    if (el.parentElement) ro.observe(el.parentElement);

    return () => ro.disconnect();
  }, []);

  const visibleItems = feed.slice(-Math.max(6, visibleCount));

  return (
    <article className="panel">
      <div className="ph">
        <h2>
          TASK FEED<i>EVENT LOG</i>
        </h2>
        <span>{realStageData?.totalEvents || tasks.length} events · {realSolver?.status || 'LIVE'}</span>
      </div>
      <div className="pb">
        <ol className="feed" ref={listRef}>
          {visibleItems.map(e => (
            <li key={e.n}>
              <span className="n">{String(e.n).padStart(3, '0')}</span>
              <span className="vb">{e.verb}</span>
              <span className="d">{e.text}</span>
            </li>
          ))}
        </ol>
      </div>
    </article>
  );
};

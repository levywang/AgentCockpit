import React from 'react';
import { useDashboard } from '../../context/DashboardContext';

export const WorkspaceCodePanel: React.FC = () => {
  const { codeMeta, codeRows } = useDashboard();

  // Python syntax highlighting helper
  const renderHighlightedText = (text: string) => {
    const trimmed = text.trim();
    if (trimmed.startsWith('#')) {
      return <span className="cm">{text}</span>;
    }

    // Split text into tokens for keywords, strings, and standard code
    const parts = text.split(/('[^']*'?|\b(?:for|in|if|def|return|not|assert|lambda)\b)/g);
    return parts.map((part, idx) => {
      if (part.startsWith("'")) {
        return <span key={idx} className="str">{part}</span>;
      }
      if (/^(?:for|in|if|def|return|not|assert|lambda)$/.test(part)) {
        return <span key={idx} className="kw">{part}</span>;
      }
      return part;
    });
  };

  return (
    <article className="panel">
      <div className="ph">
        <h2>
          WORKSPACE<i>RUNTIME CODE</i>
        </h2>
        <span id="codeMeta">
          {codeMeta.file} · {codeMeta.agentCode} {codeMeta.agentName}
        </span>
      </div>
      <div className="pb">
        <pre className="code" id="code">
          {codeRows.map(row => (
            <span key={row.ln} className={`row ${row.isCurrent ? 'cur' : ''}`}>
              <span className="ln">{String(row.ln).padStart(3, '0')}</span>
              {renderHighlightedText(row.text)}
              {row.isCurrent && <span className="caret" />}
            </span>
          ))}
        </pre>
      </div>
    </article>
  );
};

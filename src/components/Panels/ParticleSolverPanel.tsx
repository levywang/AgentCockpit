import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import type { SolverMode } from '../../types';

interface Particle {
  x: number;
  y: number;
  hl: boolean;
  age: number;
  life: number;
}

interface Vortex {
  x: number;
  y: number;
  life: number;
}

export const ParticleSolverPanel: React.FC = () => {
  const { theme, isPaused, animSpeed, stepN, setStepN, realSolver } = useDashboard();
  const [mode, setMode] = useState<SolverMode>('advect');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const particlesRef = useRef<Particle[]>([]);
  const vorticesRef = useRef<Vortex[]>([]);
  const dimsRef = useRef<{ w: number; h: number }>({ w: 1, h: 1 });
  const lastTimeRef = useRef(0);
  const simTRef = useRef(0);
  const stepAccRef = useRef(0);

  const seedParticles = useCallback((w: number, h: number) => {
    const n = Math.round(Math.min(520, (w * h) / 70));
    const parts: Particle[] = [];
    for (let i = 0; i < n; i++) {
      parts.push({
        x: Math.random() * w,
        y: Math.random() * h,
        hl: Math.random() < 0.1,
        age: Math.random() * 200,
        life: 60 + Math.random() * 180
      });
    }
    particlesRef.current = parts;
  }, []);

  const addVortex = useCallback((x: number, y: number) => {
    vorticesRef.current.push({ x, y, life: 1 });
    if (vorticesRef.current.length > 4) {
      vorticesRef.current.shift();
    }
  }, []);

  // Resize canvas according to container
  useEffect(() => {
    const handleResize = () => {
      if (!boxRef.current || !canvasRef.current) return;
      const r = boxRef.current.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.floor(r.width));
      const h = Math.max(1, Math.floor(r.height));
      const targetW = Math.round(w * dpr);
      const targetH = Math.round(h * dpr);

      // Prevent canvas wipe if dimensions haven't changed
      if (canvasRef.current.width === targetW && canvasRef.current.height === targetH) {
        return;
      }

      canvasRef.current.width = targetW;
      canvasRef.current.height = targetH;
      dimsRef.current = { w, h };
      seedParticles(w, h);
    };

    handleResize();
    const ro = new ResizeObserver(handleResize);
    if (boxRef.current) ro.observe(boxRef.current);
    return () => ro.disconnect();
  }, [seedParticles]);

  // Main canvas animation loop
  useEffect(() => {
    let animId: number;

    const render = (now: number) => {
      animId = requestAnimationFrame(render);
      const cv = canvasRef.current;
      if (!cv) return;
      const ctx = cv.getContext('2d');
      if (!ctx) return;

      if (!lastTimeRef.current) lastTimeRef.current = now;
      const realDt = Math.min(0.05, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;
      const velocity = realSolver?.eventVelocity || 0;
      const velocityMultiplier = 0.85 + Math.min(2.2, velocity / 10);
      const dt = isPaused ? 0 : realDt * animSpeed * velocityMultiplier;
      simTRef.current += dt;

      const { w, h } = dimsRef.current;
      if (w <= 1 || h <= 1) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Colors
      const isDark = theme === 'dark';
      const cPanel = isDark ? '#06100c' : '#f6f5f1';
      const cCell = isDark ? 'rgba(52,217,150,0.45)' : 'rgba(21,21,21,0.22)';
      const cInk = isDark ? '#c3f8e2' : '#151515';

      ctx.globalAlpha = 1;
      ctx.fillStyle = cPanel;
      ctx.fillRect(0, 0, w, h);

      const s = 60 * dt;
      const pa = new Path2D();
      const pb = new Path2D();

      const parts = particlesRef.current;
      const vort = vorticesRef.current;
      const tt = simTRef.current;

      for (const p of parts) {
        const a =
          Math.sin(p.x * 0.03 + tt * 0.35) * 1.7 +
          Math.cos(p.y * 0.045 - tt * 0.27) * 1.7 +
          Math.sin((p.x - p.y) * 0.015 + tt * 0.12);

        let vx = Math.cos(a) * 0.5;
        let vy = Math.sin(a) * 0.5;

        for (const v of vort) {
          const dx = p.x - v.x;
          const dy = p.y - v.y;
          const d2 = dx * dx + dy * dy + 25;
          const d = Math.sqrt(d2);
          const f = v.life * 2.4 * Math.exp(-d2 / 1400);
          vx += (-dy / d) * f;
          vy += (dx / d) * f;
        }

        if (mode === 'project') {
          vx = Math.abs(vx) + 0.2;
          vy = (Math.round(p.y / 9) * 9 - p.y) * 0.12;
        }

        const u = Math.hypot(vx, vy);
        p.x += vx * s;
        p.y += vy * s;
        p.age += s;

        if (p.age > p.life) {
          p.x = Math.random() * w;
          p.y = Math.random() * h;
          p.age = 0;
        }

        if (p.x < -6) p.x += w + 12;
        else if (p.x > w + 6) p.x -= w + 12;
        if (p.y < -6) p.y += h + 12;
        else if (p.y > h + 6) p.y -= h + 12;

        const l = 2.5 + Math.min(6, u * 5);
        const ux = vx / (u || 1);
        const uy = vy / (u || 1);
        const path = p.hl ? pb : pa;
        path.moveTo(p.x - (ux * l) / 2, p.y - (uy * l) / 2);
        path.lineTo(p.x + (ux * l) / 2, p.y + (uy * l) / 2);
      }

      ctx.lineCap = 'butt';
      ctx.strokeStyle = cCell;
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = 1.3;
      ctx.stroke(pa);

      ctx.strokeStyle = cInk;
      ctx.globalAlpha = 1;
      ctx.lineWidth = 2;
      ctx.stroke(pb);

      // Render vortices
      for (const v of vort) {
        v.life -= dt / 6;
        if (v.life > 0) {
          ctx.strokeStyle = cInk;
          ctx.globalAlpha = 0.6 * v.life;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.arc(v.x, v.y, 6 + (1 - v.life) * 20, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      for (let i = vort.length - 1; i >= 0; i--) {
        if (vort[i].life <= 0) vort.splice(i, 1);
      }

      ctx.globalAlpha = 1;
      if (dt > 0) {
        stepAccRef.current += dt;
        if (stepAccRef.current >= 0.5) {
          stepAccRef.current = 0;
          setStepN((st: number) => st + 1);
        }
      }
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [animSpeed, isPaused, mode, setStepN, theme]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const r = canvasRef.current.getBoundingClientRect();
    addVortex(e.clientX - r.left, e.clientY - r.top);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const { w, h } = dimsRef.current;
      addVortex(w * (0.2 + Math.random() * 0.6), h * (0.2 + Math.random() * 0.6));
    }
  };

  const handleRerun = () => {
    const { w, h } = dimsRef.current;
    seedParticles(w, h);
    vorticesRef.current = [];
    setStepN(0);
  };

  return (
    <article className="panel">
      <div className="ph">
        <h2>
          PARTICLE SOLVER<i>{realSolver?.status || 'OPTIMAL'}</i>
        </h2>
        <span id="stepN">
          {realSolver?.eventVelocity ? `${realSolver.eventVelocity.toFixed(1)} EV/MIN` : `step ${stepN}`}
        </span>
      </div>
      <div className="pb" id="pcBox" ref={boxRef}>
        <canvas
          id="pc"
          ref={canvasRef}
          tabIndex={0}
          aria-label="Particle vector field, click to spawn vortex"
          onPointerDown={handlePointerDown}
          onKeyDown={handleKeyDown}
        />
      </div>
      <div className="seg" role="group" aria-label="Solver Mode">
        <button
          type="button"
          data-m="advect"
          className={mode === 'advect' ? 'on' : ''}
          onClick={() => setMode('advect')}
        >
          ADVECT
        </button>
        <button
          type="button"
          data-m="project"
          className={mode === 'project' ? 'on' : ''}
          onClick={() => setMode('project')}
        >
          PROJECT
        </button>
        <button type="button" data-m="rerun" onClick={handleRerun}>
          RERUN
        </button>
      </div>
      <div
        className="pf"
        style={{
          padding: '3px 8px',
          fontSize: '7.8px',
          color: 'var(--mute)',
          borderTop: '1px solid var(--line)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}
      >
        {realSolver?.currentTask || 'FLUID DYNAMICS · REAL-TIME EVENT VELOCITY'}
      </div>
    </article>
  );
};

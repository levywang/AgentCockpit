import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import {
  CONFIG,
  CODEBITS,
  SOURCE_CATALOG,
  TAG_POOL,
  SPIN,
  GLYPH,
  TAU,
  FONT,
  mulberry32
} from '../../constants/config';
import type { BezierCurve, ActiveFiber, DynamicPacket, HubNode } from '../../types';

interface Geometry {
  cx: number;
  cy: number;
  R1: number;
  R2: number;
  narrow: boolean;
}

interface DataBlock {
  type: string;
  lines: string[];
  h: number;
  th: number;
  col: number;
  ind: number;
  seed: number;
}

interface Streak {
  th: number;
  off: number;
  f: number;
  b: number;
  hot: boolean;
  d: { p: number; len: number; v: number }[];
}

export const MainStage: React.FC = () => {
  const {
    theme,
    isPaused,
    animSpeed,
    wfs,
    hubWf,
    hubCh,
    hoverHub,
    setHoverHub,
    cfl,
    triggerHubImpact,
    hubImpacts,
    realStageData,
    realCode,
    feed,
    tvNoiseEffect
  } = useDashboard();

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tipData, setTipData] = useState<{
    visible: boolean;
    x: number;
    y: number;
    id: string;
    name: string;
    subtitle: string;
    sources: number;
    live: number;
    q: number;
  }>({
    visible: false,
    x: 0,
    y: 0,
    id: '',
    name: '',
    subtitle: '',
    sources: 0,
    live: 0,
    q: 0
  });

  const geoRef = useRef<Geometry>({ cx: 0, cy: 0, R1: 0, R2: 0, narrow: false });
  const dimsRef = useRef<{ w: number; h: number; dpr: number }>({ w: 1, h: 1, dpr: 1 });
  const layThreadsRef = useRef<HTMLCanvasElement | null>(null);
  const layRingRef = useRef<HTMLCanvasElement | null>(null);
  const hubsRef = useRef<HubNode[]>([]);
  const activeFibersRef = useRef<ActiveFiber[]>([]);
  const activeGatewayConduitsRef = useRef<{ q: BezierCurve; edgeFade: number; globalIdx: number }[]>([]);
  const packetsRef = useRef<DynamicPacket[]>([]);
  const blocksRef = useRef<DataBlock[]>([]);
  const streaksRef = useRef<Streak[]>([]);
  const blockSizesRef = useRef<{ fs: number; lh: number }>({ fs: 8, lh: 11 });

  const glitchRef = useRef<{ next: number; until: number }>({ next: 6, until: 0 });
  const lastTimeRef = useRef(0);

  // Colors theme palette
  const getPalette = useCallback(() => {
    const isDark = theme === 'dark';
    return isDark
      ? {
          dark: true,
          bg: '#030605',
          panel: '#06100c',
          band: '#040a08',
          line: '#34d996',
          hi: '#e6fff4',
          hot: '#3dffa6',
          text: '#a6efcf',
          dim: '#3d8f6f',
          hair: '#143327',
          mute: '#4c9f7f'
        }
      : {
          dark: false,
          bg: '#eeede8',
          panel: '#f6f5f1',
          band: '#eeede8',
          line: '#151515',
          hi: '#000000',
          hot: '#000000',
          text: '#1a1a1a',
          dim: '#7d7c77',
          hair: '#d2d0c9',
          mute: '#86857f'
        };
  }, [theme]);

  // Math helpers
  const ax = (Rr: number, y: number, cx: number, cy: number) =>
    cx + Math.sqrt(Math.max(0, Rr * Rr - (y - cy) * (y - cy)));

  const visAng = (Rr: number, pad: number, cy: number, h: number) =>
    Math.asin(Math.min(1, (Math.max(cy, h - cy) + pad) / Rr));

  const wrapPI = (a: number) => {
    a = (a + Math.PI) % TAU;
    return a < 0 ? a + Math.PI : a - Math.PI;
  };

  const bez = (q: BezierCurve, t: number): [number, number] => {
    const it = 1 - t;
    if (q.cx1 !== undefined && q.cy1 !== undefined && q.cx2 !== undefined && q.cy2 !== undefined) {
      const it2 = it * it,
        t2 = t * t;
      const x = it2 * it * q.x1 + 3 * it2 * t * q.cx1 + 3 * it * t2 * q.cx2 + t2 * t * q.x2;
      const y = it2 * it * q.y1 + 3 * it2 * t * q.cy1 + 3 * it * t2 * q.cy2 + t2 * t * q.y2;
      return [x, y];
    }
    const cx = q.cx ?? (q.x1 + q.x2) / 2;
    const cy = q.cy ?? (q.y1 + q.y2) / 2;
    return [it * it * q.x1 + 2 * it * t * cx + t * t * q.x2, it * it * q.y1 + 2 * it * t * cy + t * t * q.y2];
  };

  const qd = (c: CanvasRenderingContext2D, q: BezierCurve) => {
    c.beginPath();
    c.moveTo(q.x1, q.y1);
    if (q.cx1 !== undefined && q.cy1 !== undefined && q.cx2 !== undefined && q.cy2 !== undefined) {
      c.bezierCurveTo(q.cx1, q.cy1, q.cx2, q.cy2, q.x2, q.y2);
    } else {
      c.quadraticCurveTo(q.cx ?? (q.x1 + q.x2) / 2, q.cy ?? (q.y1 + q.y2) / 2, q.x2, q.y2);
    }
    c.stroke();
  };

  const mkLayer = (w: number, h: number, dpr: number): [HTMLCanvasElement, CanvasRenderingContext2D] => {
    const cv = document.createElement('canvas');
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    const c = cv.getContext('2d')!;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    return [cv, c];
  };

  const realStageDataRef = useRef(realStageData);
  useEffect(() => {
    realStageDataRef.current = realStageData;
  }, [realStageData]);

  const newPacket = useCallback((rand: boolean): DynamicPacket | null => {
    const fromGw = Math.random() < 0.45 && activeGatewayConduitsRef.current.length > 0;
    let q: BezierCurve;
    let hubIdx: number;
    if (fromGw) {
      const item =
        activeGatewayConduitsRef.current[
          (Math.random() * activeGatewayConduitsRef.current.length) | 0
        ];
      q = item.q;
      hubIdx = q.hubIdx ?? 0;
    } else if (activeFibersRef.current.length > 0) {
      const f = activeFibersRef.current[(Math.random() * activeFibersRef.current.length) | 0];
      q = f.q;
      hubIdx = f.hubIdx;
    } else {
      return null;
    }
    const withTag = Math.random() < 0.35;
    const stageData = realStageDataRef.current;
    const recentPackets = stageData?.recentPackets?.length ? stageData.recentPackets : TAG_POOL;
    return {
      q,
      u: rand ? Math.random() : 0,
      v: 0.18 + Math.random() * 0.42,
      len: 0.08 + Math.random() * 0.12,
      size: 1.8 + Math.random() * 2.2,
      hot: Math.random() < 0.35,
      tag: withTag ? recentPackets[(Math.random() * recentPackets.length) | 0] : null,
      hubIdx
    };
  }, []);

  // Build streaks for output spectrum
  const buildStreaks = useCallback(
    (g: Geometry, _w: number, h: number) => {
      const rr = mulberry32(5);
      const thVis = visAng(g.R2, 30, g.cy, h);
      const density = (g.narrow ? 420 : 1100) / (2 * thVis);
      const list: Streak[] = [];

      const mk = (th: number, Lc: number, hot: boolean) => {
        const s: Streak = {
          th: ((th % TAU) + TAU) % TAU,
          off: 20 + rr() * 4,
          f: Lc * (0.7 + rr() * 0.42),
          b: (rr() * 4) | 0,
          hot,
          d: []
        };
        const nd = rr() < 0.42 ? 1 + ((rr() * 2) | 0) : 0;
        for (let i = 0; i < nd; i++) {
          s.d.push({ p: rr() * 0.92, len: 4 + rr() * 34, v: 0 });
        }
        if (rr() < 0.3) {
          s.d.push({ p: rr(), len: 5 + rr() * 20, v: 0.05 + rr() * 0.22 });
        }
        list.push(s);
      };

      let a = 0;
      while (a < TAU) {
        const spread = 0.008 + rr() * 0.045;
        const n = Math.round(spread * 2 * density * (0.6 + rr() * 0.9));
        const Lc = 0.28 + rr() * 0.72;
        const hot = rr() < 0.14;
        for (let j = 0; j < n; j++) {
          mk(a + (rr() * 2 - 1) * spread, Lc, hot);
        }
        a += spread * 2 + rr() * 0.05;
      }
      const nl = Math.round(density * 0.25 * TAU);
      for (let j = 0; j < nl; j++) {
        mk(rr() * TAU, 0.15 + rr() * 0.85, false);
      }
      streaksRef.current = list;
    },
    []
  );

  // Build flywheel ring base
  const buildRing = useCallback(
    (g: Geometry, w: number, h: number, dpr: number) => {
      const P = getPalette();
      const [cv, c] = mkLayer(w, h, dpr);
      const { cx, cy, R1, R2 } = g;
      const half = Math.PI / 2;

      c.beginPath();
      c.arc(cx, cy, R2, 0, TAU);
      c.arc(cx, cy, R1, 0, TAU, true);
      c.fillStyle = P.band;
      c.fill();

      c.strokeStyle = P.line;
      if (P.dark) {
        c.globalAlpha = 0.18;
        c.lineWidth = 5;
        c.beginPath();
        c.arc(cx, cy, R2, -half, half);
        c.stroke();
        c.beginPath();
        c.arc(cx, cy, R1, -half, half);
        c.stroke();
      }
      c.globalAlpha = P.dark ? 0.95 : 0.85;
      c.lineWidth = 1.1;
      c.beginPath();
      c.arc(cx, cy, R1, -half, half);
      c.stroke();
      c.beginPath();
      c.arc(cx, cy, R2, -half, half);
      c.stroke();
      c.globalAlpha = 0.3;
      c.lineWidth = 0.7;
      c.beginPath();
      c.arc(cx, cy, R2 - 7, -half, half);
      c.stroke();
      c.globalAlpha = 1;

      layRingRef.current = cv;
    },
    [getPalette]
  );

  // Build flywheel data blocks
  const buildBlocks = useCallback(
    (g: Geometry) => {
      const blk: DataBlock[] = [];
      const fs = g.narrow ? 5.8 : 8.8;
      const lh = fs * 1.34;
      blockSizesRef.current = { fs, lh };

      const pick = <T,>(rr: () => number, arr: T[]): T => arr[(rr() * arr.length) | 0];

      for (const col of g.narrow ? [0] : [0, 1]) {
        const rr = mulberry32(11 + col * 97);
        const types = col
          ? ['table', 'grid', 'bars', 'table', 'tag']
          : ['code', 'table', 'bars', 'code', 'tag', 'code'];
        let th = rr() * 0.05;
        while (th < TAU - 0.06) {
          const type = pick(rr, types);
          let lines: string[] = [];
          if (type === 'code') {
            const realLines = realCodeRef.current?.lines;
            const fileName = realCodeRef.current?.file || 'workspace/runtime';
            lines = ['// ' + fileName];
            if (realLines && realLines.length > 0) {
              const startIdx = (rr() * Math.max(1, realLines.length - 6)) | 0;
              const count = Math.min(6, realLines.length);
              for (let i = 0; i < count; i++) {
                const l = realLines[(startIdx + i) % realLines.length] || '';
                lines.push(l.length > 32 ? l.slice(0, 30) + '..' : l || ' ');
              }
            } else {
              const n = 5 + ((rr() * 6) | 0);
              for (let i = 0; i < n; i++) lines.push(pick(rr, CODEBITS));
            }
          } else if (type === 'table') {
            const feedItems = feedRef.current;
            if (feedItems && feedItems.length > 0) {
              const count = Math.min(6, feedItems.length);
              for (let i = 0; i < count; i++) {
                const f = feedItems[i];
                const cleanTxt = f.text.length > 18 ? f.text.slice(0, 16) + '..' : f.text;
                lines.push(
                  `${String(f.n).padStart(3, '0')}  ${f.verb.padEnd(5, ' ')}  ${cleanTxt}`
                );
              }
            } else {
              const n = 6 + ((rr() * 4) | 0);
              for (let i = 0; i < n; i++) {
                lines.push(
                  `${String((rr() * 99) | 0).padStart(3, '0')}  ${(rr() * 0.09).toFixed(4)}  ${rr() < 0.8 ? 'ok ' : 'chk'}  ${(100 + rr() * 900) | 0}ms`
                );
              }
            }
          } else if (type === 'grid') {
            const n = 5 + ((rr() * 3) | 0);
            for (let i = 0; i < n; i++) {
              let s = '';
              for (let j = 0; j < 8; j++) s += String((rr() * 99) | 0).padStart(2, '0') + ' ';
              lines.push(s.trim());
            }
          } else if (type === 'bars') {
            lines = Array(4 + ((rr() * 3) | 0)).fill('');
          } else {
            const hubs = realStageDataRef.current?.hubs;
            if (hubs && hubs.length > 0) {
              const h = pick(rr, hubs);
              lines = [`${h.id} — ${h.name.slice(0, 16)}`, `q ${h.q.toFixed(2)} · ${h.status}`];
            } else {
              lines = [
                `${pick(rr, CONFIG.workflows)} — ${pick(rr, ['drift', 'scope', 'route', 'spec'])}`
              ];
            }
          }

          const h = lines.length * lh + 4;
          const dth = h / g.R1;
          if (th + dth > TAU - 0.03) break;
          blk.push({
            type,
            lines,
            h,
            th: th + dth / 2,
            col,
            ind: rr(),
            seed: (rr() * 100000) | 0
          });
          th += dth + (10 + rr() * 18) / g.R1;
        }
      }
      blocksRef.current = blk;
    },
    []
  );

  const realCodeRef = useRef(realCode);
  useEffect(() => {
    realCodeRef.current = realCode;
    if (geoRef.current.R1 > 0) {
      buildBlocks(geoRef.current);
    }
  }, [realCode, buildBlocks]);

  const feedRef = useRef(feed);
  useEffect(() => {
    feedRef.current = feed;
  }, [feed]);

  // Build threads and hubs
  const buildThreads = useCallback(
    (g: Geometry, w: number, h: number, dpr: number) => {
      const P = getPalette();
      const [cv, c] = mkLayer(w, h, dpr);
      const rr = mulberry32(101);
      const { cx, cy, R1, narrow } = g;
      const k = narrow ? 0.6 : 1;
      const A = P.dark ? 1.4 : 1;
      const inner = (y: number) => ax(R1, y, cx, cy);

      c.save();
      c.beginPath();
      c.arc(cx, cy, R1 - 1, 0, TAU);
      c.clip();

      // Subtle Technical Circuit Grid Substrate
      c.strokeStyle = P.line;
      c.lineWidth = 0.5;
      c.globalAlpha = (P.dark ? 0.06 : 0.04) * A;
      const stepGrid = narrow ? 42 : 32;
      for (let y = stepGrid; y < h; y += stepGrid) {
        const xMax = inner(y);
        c.beginPath();
        c.moveTo(0, y);
        c.lineTo(xMax, y);
        c.stroke();
      }
      for (let x = 20; x < w * 0.45; x += stepGrid) {
        c.beginPath();
        c.moveTo(x, 0);
        c.lineTo(x, h);
        c.stroke();
      }

      // Alignment Crosshairs (+) and Pads
      for (let i = 0; i < Math.round(26 * k); i++) {
        const y = rr() * h;
        const x = 110 + rr() * Math.max(10, inner(y) - 150);
        c.strokeStyle = P.line;
        c.fillStyle = P.line;
        c.globalAlpha = (0.2 + rr() * 0.3) * A;
        if (rr() < 0.4) {
          c.beginPath();
          c.arc(x, y, 1.4, 0, TAU);
          c.fill();
        } else if (rr() < 0.7) {
          const s = 3;
          c.strokeRect(x - s / 2, y - s / 2, s, s);
        } else {
          c.lineWidth = 0.8;
          c.beginPath();
          c.moveTo(x - 3, y);
          c.lineTo(x + 3, y);
          c.moveTo(x, y - 3);
          c.lineTo(x, y + 3);
          c.stroke();
        }
      }

      c.restore();
      c.globalAlpha = 1;
      layThreadsRef.current = cv;

      // Setup Convergence Hubs
      const hubList: HubNode[] = [];
      const hubOffs = narrow ? [-0.22, 0.05, 0.32] : [-0.33, 0.01, 0.34];
      hubOffs.forEach((off, idx) => {
        const y = cy + h * off;
        const x = inner(y) - 4;
        hubList.push({
          x,
          y,
          curves: [],
          wf: [4, 0, 8][idx],
          id: 'CORE-' + String(idx + 1).padStart(2, '0')
        });
      });
      hubsRef.current = hubList;

      // Dynamic Optical Fiber Array (100% active)
      const fibers: ActiveFiber[] = [];
      const gwX = narrow ? 8 : 18;
      const gwW = narrow ? 60 : 92;
      const nFibPerHub = narrow ? 26 : 48;

      hubList.forEach((hub, idx) => {
        for (let i = 0; i < nFibPerHub; i++) {
          const sy = hub.y + (rr() - 0.5) * h * 1.15;
          const sx = gwX + gwW + 12 + rr() * Math.max(20, hub.x - gwX - gwW - 65);
          const q: BezierCurve = {
            x1: sx,
            y1: sy,
            cx1: sx + (hub.x - sx) * (0.28 + rr() * 0.2),
            cy1: sy + (hub.y - sy) * (0.04 + rr() * 0.16),
            cx2: sx + (hub.x - sx) * (0.68 + rr() * 0.18),
            cy2: hub.y + (rr() - 0.5) * 4,
            x2: hub.x,
            y2: hub.y + (rr() - 0.5) * 2.5,
            hubIdx: idx
          };
          hub.curves.push(q);
          fibers.push({
            q,
            speed: 26 + rr() * 46,
            dash: 7 + rr() * 14,
            gap: 14 + rr() * 22,
            phase: rr() * TAU,
            width: 0.5 + rr() * 0.8,
            hubIdx: idx,
            hot: rr() < 0.25
          });
        }
      });
      activeFibersRef.current = fibers;

      // Initialize Dynamic Packets
      const pkts: DynamicPacket[] = [];
      const nPackets = narrow ? 36 : 72;
      for (let i = 0; i < nPackets; i++) {
        const p = newPacket(true);
        if (p) pkts.push(p);
      }
      packetsRef.current = pkts;
    },
    [getPalette, newPacket]
  );

  // Resize and Stage Layout calculation
  const layoutStage = useCallback(() => {
    if (!canvasRef.current || !containerRef.current) return;
    const r = containerRef.current.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.floor(r.width));
    const h = Math.max(1, Math.floor(r.height));

    const targetW = Math.round(w * dpr);
    const targetH = Math.round(h * dpr);

    // CRITICAL: Prevent screen flash by only updating canvas dimensions if size actually changed!
    // Changing canvas.width or canvas.height clears the buffer and produces an instant flash.
    const sizeChanged = canvasRef.current.width !== targetW || canvasRef.current.height !== targetH;
    if (sizeChanged) {
      canvasRef.current.width = targetW;
      canvasRef.current.height = targetH;
    }

    if (!sizeChanged && dimsRef.current.w === w && dimsRef.current.h === h && layThreadsRef.current && layRingRef.current) {
      return;
    }

    dimsRef.current = { w, h, dpr };

    const narrow = w < 700;
    const R1 = narrow ? Math.max(h * 0.8, w * 0.85) : Math.max(h * 0.72, w * 0.24);
    const cx = w * (narrow ? 0.36 : 0.4) - R1;
    const cy = h * 0.5 + (narrow ? 70 : 22);
    const R2 = R1 + w * (narrow ? 0.26 : 0.22);
    const geo: Geometry = { cx, cy, R1, R2, narrow };
    geoRef.current = geo;

    buildStreaks(geo, w, h);
    buildThreads(geo, w, h, dpr);
    buildRing(geo, w, h, dpr);
    buildBlocks(geo);
  }, [buildBlocks, buildRing, buildStreaks, buildThreads]);

  useEffect(() => {
    layoutStage();
    const ro = new ResizeObserver(() => {
      layoutStage();
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [layoutStage, theme]);

  // Stable references for high-frequency animation loop to prevent continuous re-mounting
  const animSpeedRef = useRef(animSpeed);
  animSpeedRef.current = animSpeed;
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;
  const simTRef = useRef(0);
  const hubChRef = useRef(hubCh);
  hubChRef.current = hubCh;
  const hubWfRef = useRef(hubWf);
  hubWfRef.current = hubWf;
  const hubImpactsRef = useRef(hubImpacts);
  hubImpactsRef.current = hubImpacts;
  const hoverHubRef = useRef(hoverHub);
  hoverHubRef.current = hoverHub;
  const wfsRef = useRef(wfs);
  wfsRef.current = wfs;
  const tvNoiseEffectRef = useRef(tvNoiseEffect);
  tvNoiseEffectRef.current = tvNoiseEffect;

  // Main Canvas Render Pipeline
  useEffect(() => {
    let animId: number;

    const render = (now: number) => {
      animId = requestAnimationFrame(render);
      const cv = canvasRef.current;
      if (!cv) return;
      const c = cv.getContext('2d');
      if (!c) return;

      if (!lastTimeRef.current) lastTimeRef.current = now;
      const realDt = Math.min(0.05, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;
      const dt = isPausedRef.current ? 0 : realDt * animSpeedRef.current;

      const { w, h, dpr } = dimsRef.current;
      const G = geoRef.current;
      if (w <= 1 || h <= 1 || G.R1 <= 0) return;

      const P = getPalette();
      if (dt > 0) simTRef.current += dt;
      const t = simTRef.current;

      // Clear & Background
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalAlpha = 1;
      c.globalCompositeOperation = 'source-over';
      c.fillStyle = P.bg;
      c.fillRect(0, 0, cv.width, cv.height);

      if (layThreadsRef.current) c.drawImage(layThreadsRef.current, 0, 0);
      if (layRingRef.current) c.drawImage(layRingRef.current, 0, 0);

      c.setTransform(dpr, 0, 0, dpr, 0, 0);

      // 1. Draw Output Spectrum Streaks
      const rot = t * SPIN;
      const thVis = visAng(G.R2, 30, G.cy, h);
      const basePaths = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];
      const hotPath = new Path2D();
      const dashPath = new Path2D();
      const hotDash = new Path2D();

      for (const s of streaksRef.current) {
        const th = wrapPI(s.th + rot);
        if (th > thVis || th < -thVis) continue;
        const cp = Math.cos(th);
        const sp = Math.sin(th);
        const r0 = G.R2 + s.off;
        const x0 = G.cx + cp * r0;
        const y0 = G.cy + sp * r0;
        const reach = Math.max(40, (w + 20 - x0) / Math.max(0.2, cp));
        const L = Math.min(reach, s.f * reach);
        const p = s.hot ? hotPath : basePaths[s.b];
        p.moveTo(x0, y0);
        p.lineTo(x0 + cp * L, y0 + sp * L);

        const q = s.hot ? hotDash : dashPath;
        for (const d of s.d) {
          if (d.v && dt > 0) d.p = (d.p + d.v * dt) % 1;
          const a0 = d.p * L;
          const a1 = Math.min(L, a0 + d.len);
          q.moveTo(x0 + cp * a0, y0 + sp * a0);
          q.lineTo(x0 + cp * a1, y0 + sp * a1);
        }
      }

      c.lineCap = 'butt';
      c.strokeStyle = P.line;
      c.lineWidth = 0.7;
      const A = P.dark ? 1.3 : 1;
      const BA = [0.09, 0.17, 0.27, 0.4];
      basePaths.forEach((bp, i) => {
        c.globalAlpha = Math.min(0.9, BA[i] * A);
        c.stroke(bp);
      });

      if (P.dark) {
        c.globalCompositeOperation = 'lighter';
        c.strokeStyle = P.hot;
        c.globalAlpha = 0.1;
        c.lineWidth = 4.5;
        c.stroke(hotPath);
        c.globalAlpha = 0.6;
        c.lineWidth = 0.9;
        c.stroke(hotPath);

        c.globalAlpha = 0.12;
        c.strokeStyle = P.hi;
        c.lineWidth = 5;
        c.stroke(dashPath);
        c.globalAlpha = 0.9;
        c.lineWidth = 1.6;
        c.stroke(dashPath);

        c.strokeStyle = P.hot;
        c.globalAlpha = 0.3;
        c.lineWidth = 7;
        c.stroke(hotDash);
        c.strokeStyle = P.hi;
        c.globalAlpha = 1;
        c.lineWidth = 2;
        c.stroke(hotDash);
        c.globalCompositeOperation = 'source-over';
      } else {
        c.strokeStyle = P.hot;
        c.globalAlpha = 0.5;
        c.lineWidth = 0.8;
        c.stroke(hotPath);
        c.strokeStyle = P.line;
        c.globalAlpha = 0.8;
        c.lineWidth = 1.5;
        c.stroke(dashPath);
        c.strokeStyle = P.hot;
        c.globalAlpha = 0.95;
        c.lineWidth = 2;
        c.stroke(hotDash);
      }
      c.globalAlpha = 1;

      // 2. Draw Sweeping Radar Beam
      const beamA = wrapPI(t * 0.85);
      const beamW = 0.24;
      const tv = visAng(G.R1, 40, G.cy, h);
      if (beamA >= -tv && beamA - beamW <= tv) {
        const far = w * 2;
        const col = P.dark ? P.hot : P.line;
        c.save();
        c.beginPath();
        c.moveTo(G.cx + Math.cos(beamA - beamW) * G.R1, G.cy + Math.sin(beamA - beamW) * G.R1);
        c.arc(G.cx, G.cy, far, beamA - beamW, beamA);
        c.arc(G.cx, G.cy, G.R1, beamA, beamA - beamW, true);
        c.closePath();

        if (c.createConicGradient) {
          const grad = c.createConicGradient(beamA - beamW, G.cx, G.cy);
          const f = beamW / TAU;
          grad.addColorStop(0, P.dark ? 'rgba(61,255,166,0)' : 'rgba(21,21,21,0)');
          grad.addColorStop(f * 0.97, P.dark ? 'rgba(61,255,166,0.2)' : 'rgba(21,21,21,0.07)');
          grad.addColorStop(f, P.dark ? 'rgba(61,255,166,0)' : 'rgba(21,21,21,0)');
          grad.addColorStop(1, P.dark ? 'rgba(61,255,166,0)' : 'rgba(21,21,21,0)');
          c.fillStyle = grad;
        } else {
          c.fillStyle = P.dark ? 'rgba(61,255,166,0.08)' : 'rgba(21,21,21,0.03)';
        }
        if (P.dark) c.globalCompositeOperation = 'lighter';
        c.fill();
        c.beginPath();
        c.moveTo(G.cx + Math.cos(beamA) * G.R1, G.cy + Math.sin(beamA) * G.R1);
        c.lineTo(G.cx + Math.cos(beamA) * far, G.cy + Math.sin(beamA) * far);
        c.strokeStyle = col;
        c.globalAlpha = P.dark ? 0.55 : 0.35;
        c.lineWidth = 1;
        c.stroke();
        c.restore();
      }

      // 3. Draw Gear Teeth Rings
      const ro = -t * SPIN * 2.6;
      const r0 = G.R2 + 5;
      const r1 = G.R2 + 12;
      const nGears = Math.round((TAU * G.R2) / 9);
      const st = TAU / nGears;
      const tvG = visAng(G.R2, 30, G.cy, h);
      const pGears = new Path2D();
      for (let k = Math.ceil((-tvG - ro) / st), e = Math.floor((tvG - ro) / st); k <= e; k++) {
        const m = ((k % 7) + 7) % 7;
        if (m === 3 || m === 6) continue;
        const a = k * st + ro;
        const a2 = a + st * (m === 0 ? 0.85 : 0.45);
        pGears.moveTo(G.cx + Math.cos(a) * r0, G.cy + Math.sin(a) * r0);
        pGears.arc(G.cx, G.cy, r0, a, a2);
        pGears.arc(G.cx, G.cy, r1, a2, a, true);
        pGears.closePath();
      }
      const ri = G.R1 - 9;
      const si = TAU / Math.round((TAU * G.R1) / 7);
      const ti = visAng(G.R1, 30, G.cy, h);
      const roi = -t * SPIN * 1.6;
      const qGears = new Path2D();
      for (let k = Math.ceil((-ti - roi) / si), e = Math.floor((ti - roi) / si); k <= e; k++) {
        if (((k % 9) + 9) % 9 > 5) continue;
        const a = k * si + roi;
        qGears.moveTo(G.cx + Math.cos(a) * ri, G.cy + Math.sin(a) * ri);
        qGears.arc(G.cx, G.cy, ri, a, a + si * 0.55);
      }

      if (P.dark) {
        c.globalCompositeOperation = 'lighter';
        c.fillStyle = P.hot;
        c.globalAlpha = 0.85;
        c.fill(pGears);
        c.strokeStyle = P.hot;
        c.globalAlpha = 0.18;
        c.lineWidth = 6;
        c.stroke(pGears);
        c.globalCompositeOperation = 'source-over';
        c.strokeStyle = P.line;
        c.globalAlpha = 0.8;
        c.lineWidth = 2;
        c.stroke(qGears);
      } else {
        c.fillStyle = P.line;
        c.globalAlpha = 0.8;
        c.fill(pGears);
        c.strokeStyle = P.line;
        c.globalAlpha = 0.6;
        c.lineWidth = 2;
        c.stroke(qGears);
      }
      c.globalAlpha = 1;

      // 4. Draw Wheel Marks & Byte Labels
      const pMarks = new Path2D();
      const s1 = 6 / G.R1;
      const t1 = visAng(G.R1, 12, G.cy, h);
      for (let k = Math.ceil((-t1 - rot) / s1), e = Math.floor((t1 - rot) / s1); k <= e; k++) {
        const a = k * s1 + rot;
        const l = k % 5 === 0 ? 9 : 4;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        pMarks.moveTo(G.cx + ca * (G.R1 + 2), G.cy + sa * (G.R1 + 2));
        pMarks.lineTo(G.cx + ca * (G.R1 + 2 + l), G.cy + sa * (G.R1 + 2 + l));
      }
      c.strokeStyle = P.line;
      c.globalAlpha = 0.7;
      c.lineWidth = 0.8;
      c.stroke(pMarks);

      const qMarks = new Path2D();
      const s2 = 3.2 / G.R2;
      const t2 = visAng(G.R2, 12, G.cy, h);
      for (let k = Math.ceil((-t2 - rot) / s2), e = Math.floor((t2 - rot) / s2); k <= e; k++) {
        const a = k * s2 + rot;
        const l = k % 10 === 0 ? 8 : 3;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        qMarks.moveTo(G.cx + ca * (G.R2 - 1), G.cy + sa * (G.R2 - 1));
        qMarks.lineTo(G.cx + ca * (G.R2 - 1 - l), G.cy + sa * (G.R2 - 1 - l));
      }
      c.globalAlpha = 0.55;
      c.lineWidth = 0.7;
      c.stroke(qMarks);

      const s3 = (G.narrow ? 34 : 46) / G.R2;
      c.globalAlpha = 1;
      c.fillStyle = P.dim;
      c.font = `${G.narrow ? 6 : 8}px ${FONT}`;
      c.textAlign = 'right';
      c.textBaseline = 'middle';
      for (let k = Math.ceil((-t2 - rot) / s3), e = Math.floor((t2 - rot) / s3); k <= e; k++) {
        c.save();
        c.translate(G.cx, G.cy);
        c.rotate(k * s3 + rot);
        const labelVal = (((k * 2654435761) >>> 0) % 360) + 20;
        c.fillText(`${labelVal} b`, G.R2 - 13, 0);
        c.restore();
      }
      c.textAlign = 'left';

      // 5. Draw Left Flow: Rolling SRC-### Gateways + Dynamic Conduits + Active Fibers + Packets
      c.save();
      c.beginPath();
      c.arc(G.cx, G.cy, G.R1 - 1, 0, TAU);
      c.clip();

      const gwX = G.narrow ? 8 : 18;
      const gwW = G.narrow ? 60 : 92;
      const slotH = G.narrow ? 26 : 34;
      const slotGap = G.narrow ? 8 : 12;
      const stride = slotH + slotGap;
      const scrollSpeed = 22;
      const totalScroll = t * scrollSpeed;
      const baseIndex = Math.floor(totalScroll / stride);
      const offset = totalScroll % stride;
      const count = Math.ceil(h / stride) + 2;

      activeGatewayConduitsRef.current = [];
      c.textAlign = 'left';
      c.textBaseline = 'top';

      const stageData = realStageDataRef.current;
      const liveSources = stageData?.sources && stageData.sources.length > 0 ? stageData.sources : null;

      for (let k = 0; k < count; k++) {
        const globalIdx = baseIndex + k;
        const y = k * stride - offset;
        const edgeFade = Math.max(0, Math.min(1, Math.min(y + slotH, h - y) / 36));
        if (edgeFade <= 0.02) continue;

        let srcId: string;
        let srcTitle: string;
        let srcBus: string;
        let srcTag: string;
        let srcRate: string;
        let srcActive: boolean;
        let targetHubIdx: number;

        if (liveSources) {
          const item = liveSources[globalIdx % liveSources.length];
          srcId = item.id;
          srcTitle = item.name;
          srcBus = item.bus;
          srcTag = item.tag;
          srcRate = item.byteRate || '2.10G';
          srcActive = item.active;
          targetHubIdx = item.hubIndex ?? (globalIdx % hubsRef.current.length);
        } else {
          const cat = SOURCE_CATALOG[globalIdx % SOURCE_CATALOG.length];
          srcId = 'SRC-' + String((globalIdx % 999) + 1).padStart(3, '0');
          srcTitle = cat.tag;
          srcBus = cat.bus;
          srcTag = cat.tag;
          srcRate = (1.1 + ((globalIdx * 23) % 40) * 0.07).toFixed(2) + 'G';
          srcActive = false;
          targetHubIdx = globalIdx % hubsRef.current.length;
        }

        c.fillStyle = P.panel;
        c.globalAlpha = 0.88 * edgeFade;
        c.fillRect(gwX, y, gwW, slotH);

        c.strokeStyle = srcActive ? (P.dark ? P.hot : P.line) : P.hair;
        c.lineWidth = srcActive ? 1.2 : 0.9;
        c.globalAlpha = 0.95 * edgeFade;
        c.strokeRect(gwX, y, gwW, slotH);

        const ledPulse = srcActive
          ? 0.8 + 0.2 * Math.sin(t * 8 + globalIdx)
          : 0.5 + 0.3 * Math.sin(t * 4 + globalIdx);
        c.fillStyle = srcActive ? P.hot : (P.dark ? P.hi : P.line);
        c.globalAlpha = ledPulse * edgeFade;
        c.fillRect(gwX, y, 3, slotH);

        c.beginPath();
        c.arc(gwX + 9, y + slotH / 2, 2.2, 0, TAU);
        c.fill();

        c.font = `700 ${G.narrow ? 7 : 8.5}px ${FONT}`;
        c.fillStyle = srcActive ? (P.dark ? P.hot : P.line) : P.text;
        c.globalAlpha = 1.0 * edgeFade;
        c.fillText(srcId, gwX + 16, y + (G.narrow ? 4 : 5));

        c.font = `600 6px ${FONT}`;
        c.fillStyle = P.dim;
        c.fillText(srcBus, gwX + gwW - (G.narrow ? 18 : 28), y + (G.narrow ? 5 : 6));

        if (!G.narrow) {
          c.font = `500 6.2px ${FONT}`;
          c.fillStyle = srcActive ? P.text : P.dim;
          const labelText = srcTag ? `${srcTitle} [${srcTag}]` : srcTitle;
          const dispName = labelText.length > 15 ? labelText.slice(0, 14) + '..' : labelText;
          c.fillText(dispName, gwX + 16, y + 19);
          c.fillText(srcRate, gwX + gwW - 24, y + 19);
        }

        const pinY = y + slotH / 2;
        c.strokeStyle = srcActive ? P.hot : (P.dark ? P.hi : P.line);
        c.lineWidth = srcActive ? 1.6 : 1.2;
        c.globalAlpha = 0.9 * edgeFade;
        c.beginPath();
        c.moveTo(gwX + gwW, pinY);
        c.lineTo(gwX + gwW + 7, pinY);
        c.stroke();
        c.beginPath();
        c.arc(gwX + gwW + 7, pinY, 2, 0, TAU);
        c.fillStyle = srcActive ? P.hot : (P.dark ? P.hi : P.line);
        c.fill();

        const hubs = hubsRef.current;
        const hub = hubs[targetHubIdx % hubs.length];
        if (hub) {
          const x1 = gwX + gwW + 7;
          const y1 = pinY;
          const x2 = hub.x;
          const y2 = hub.y;
          const dx = x2 - x1;
          const q: BezierCurve = {
            x1,
            y1,
            cx1: x1 + dx * 0.38,
            cy1: y1,
            cx2: x1 + dx * 0.65,
            cy2: y2,
            x2,
            y2,
            hubIdx: targetHubIdx % hubs.length
          };
          activeGatewayConduitsRef.current.push({ q, edgeFade, globalIdx });
        }
      }

      // Render Active Gateway Conduits
      for (const item of activeGatewayConduitsRef.current) {
        const { q, edgeFade, globalIdx } = item;
        c.strokeStyle = P.hot;
        c.lineWidth = G.narrow ? 1.6 : 2.5;
        c.globalAlpha = (P.dark ? 0.2 : 0.1) * edgeFade;
        qd(c, q);

        c.strokeStyle = P.dark ? P.hi : P.line;
        c.lineWidth = 1.1;
        c.globalAlpha = (P.dark ? 0.85 : 0.7) * edgeFade;
        c.setLineDash([9, 18]);
        c.lineDashOffset = -t * 60 - globalIdx * 8;
        qd(c, q);
      }

      // Render Active Optical Fibers
      for (const f of activeFibersRef.current) {
        const wave = 0.65 + 0.35 * Math.sin(t * 3.5 + f.phase);
        const isHot = f.hot;
        c.strokeStyle = P.dark ? (isHot ? P.hot : P.hi) : isHot ? P.hot : P.line;
        c.lineWidth = f.width;
        c.globalAlpha = (isHot ? 0.75 : 0.38) * wave * (P.dark ? 1.2 : 0.85);
        c.setLineDash([f.dash, f.gap]);
        c.lineDashOffset = -t * f.speed;
        qd(c, f.q);
      }
      c.setLineDash([]);

      // Render Dynamic Packets
      const pkPath = new Path2D();
      const hotPkPath = new Path2D();
      const tagsToDraw: { x: number; y: number; tag: string }[] = [];
      const steps = 7;
      const pkts = packetsRef.current;

      for (let i = 0; i < pkts.length; i++) {
        const m = pkts[i];
        if (!m) continue;
        if (dt > 0) m.u += m.v * dt;
        if (m.u >= 1) {
          triggerHubImpact(m.hubIdx);
          const nextP = newPacket(false);
          if (nextP) pkts[i] = nextP;
          continue;
        }
        const u0 = Math.max(0, m.u - m.len);
        const path = m.hot ? hotPkPath : pkPath;
        for (let k = 0; k <= steps; k++) {
          const [px, py] = bez(m.q, u0 + (m.u - u0) * (k / steps));
          if (k === 0) {
            path.moveTo(px, py);
          } else {
            path.lineTo(px, py);
          }
        }
        if (m.tag && m.u > 0.25 && m.u < 0.75) {
          const [hx, hy] = bez(m.q, m.u);
          tagsToDraw.push({ x: hx, y: hy, tag: m.tag });
        }
      }

      c.lineCap = 'round';
      if (P.dark) {
        c.globalCompositeOperation = 'lighter';
        c.strokeStyle = P.hot;
        c.globalAlpha = 0.16;
        c.lineWidth = 4.5;
        c.stroke(hotPkPath);
        c.strokeStyle = P.hot;
        c.globalAlpha = 0.95;
        c.lineWidth = 1.6;
        c.stroke(hotPkPath);
        c.strokeStyle = P.hi;
        c.globalAlpha = 0.12;
        c.lineWidth = 3.5;
        c.stroke(pkPath);
        c.strokeStyle = P.hi;
        c.globalAlpha = 0.85;
        c.lineWidth = 1.3;
        c.stroke(pkPath);
        c.globalCompositeOperation = 'source-over';
      } else {
        c.strokeStyle = P.line;
        c.globalAlpha = 0.85;
        c.lineWidth = 1.35;
        c.stroke(pkPath);
        c.strokeStyle = P.hot;
        c.globalAlpha = 0.95;
        c.lineWidth = 1.6;
        c.stroke(hotPkPath);
      }

      // Photon Heads
      for (const m of pkts) {
        if (!m || m.u <= 0.02 || m.u >= 0.98) continue;
        const [px, py] = bez(m.q, m.u);
        c.beginPath();
        c.arc(px, py, m.size, 0, TAU);
        c.fillStyle = P.dark ? (m.hot ? P.hot : P.hi) : P.line;
        c.globalAlpha = P.dark ? 1 : 0.9;
        c.fill();
      }

      // Floating Micro Badges
      if (tagsToDraw.length) {
        c.font = `600 ${G.narrow ? 6 : 7}px ${FONT}`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        for (const tg of tagsToDraw) {
          const tw = c.measureText(tg.tag).width;
          const bx = tg.x;
          const by = tg.y - 10;
          c.fillStyle = P.bg;
          c.globalAlpha = 0.88;
          c.fillRect(bx - tw / 2 - 3, by - 5, tw + 6, 10);
          c.strokeStyle = P.mute;
          c.lineWidth = 0.6;
          c.strokeRect(bx - tw / 2 - 3, by - 5, tw + 6, 10);
          c.fillStyle = P.text;
          c.globalAlpha = 1;
          c.fillText(tg.tag, bx, by);
          c.beginPath();
          c.moveTo(bx, by + 5);
          c.lineTo(tg.x, tg.y);
          c.strokeStyle = P.mute;
          c.stroke();
        }
      }

      c.restore();
      c.globalAlpha = 1;

      // 6. Draw Spinning Flywheel Radial Data Blocks
      const band = G.R2 - G.R1;
      const thVisB = visAng(G.R1, 50, G.cy, h);
      const { fs: bFS, lh: bLH } = blockSizesRef.current;
      c.font = `500 ${bFS}px ${FONT}`;
      c.textBaseline = 'top';

      for (const b of blocksRef.current) {
        const th = wrapPI(b.th + rot);
        if (th > thVisB || th < -thVisB) continue;
        const x0 = G.R1 + 14 + (b.col ? band * 0.5 : 0) + b.ind * band * 0.04;
        const maxW =
          b.col || G.narrow ? Math.max(12, G.R2 - (G.narrow ? 34 : 54) - x0) : band * 0.45;
        const y = -b.h / 2;
        c.save();
        c.translate(G.cx, G.cy);
        c.rotate(th);

        if (b.type === 'bars') {
          const rr = mulberry32(b.seed);
          c.fillStyle = P.text;
          c.globalAlpha = 0.9;
          for (let i = 0; i < b.lines.length; i++) {
            let x = x0;
            const lim = x0 + Math.min(maxW, G.narrow ? 34 : 64);
            while (x < lim) {
              const bw = 2 + rr() * 9;
              if (rr() < 0.62) {
                c.fillRect(x, y + 2 + i * bLH, Math.min(bw, lim - x), bLH * 0.55);
              }
              x += bw + 1.5;
            }
          }
        } else {
          const hi =
            b.type === 'code' ? 1 + (((t * 0.6) | 0) + b.seed) % (b.lines.length - 1) : -1;
          for (let i = 0; i < b.lines.length; i++) {
            const ly = y + 2 + i * bLH;
            if (i === hi) {
              const tw = Math.min(maxW, c.measureText(b.lines[i]).width) + 4;
              c.globalAlpha = 1;
              c.fillStyle = P.text;
              c.fillRect(x0 - 2, ly - 1, tw, bLH);
              c.fillStyle = P.band;
            } else {
              c.fillStyle = P.text;
              c.globalAlpha =
                i === 0 && b.type !== 'table' && b.type !== 'grid'
                  ? 1
                  : b.type === 'code'
                    ? 0.8
                    : 0.62;
            }
            c.fillText(b.lines[i], x0, ly, maxW);
          }
        }
        c.restore();
      }
      c.globalAlpha = 1;

      // 7. Draw Convergence Hub Marks (Rotating Reticles & Reactor Ripples)
      hubsRef.current.forEach((hub, i) => {
        const on = i === hoverHub;
        const r = on ? 18 : 12;
        const dtImpact = t - (hubImpacts[i] || 0);
        const impact = dtImpact >= 0 && dtImpact <= 0.45 ? 1 - dtImpact / 0.45 : 0;

        c.save();
        c.translate(hub.x - 6, hub.y);

        // Rotating Segmented Reticle
        c.rotate(t * 1.6 + i * 2);
        c.strokeStyle = P.dark ? (on ? P.hot : P.hi) : P.line;
        c.lineWidth = on ? 1.6 : 1.0;
        c.globalAlpha = on ? 1 : 0.65;
        for (let k = 0; k < 3; k++) {
          c.beginPath();
          c.arc(0, 0, r + 3, (k * TAU) / 3 + 0.15, ((k + 1) * TAU) / 3 - 0.15);
          c.stroke();
        }

        // Counter-rotating inner tick ring
        c.rotate(-t * 3.2);
        c.lineWidth = 0.7;
        c.globalAlpha = 0.5;
        for (let k = 0; k < 8; k++) {
          const a = (k * TAU) / 8;
          c.beginPath();
          c.moveTo(Math.cos(a) * (r - 4), Math.sin(a) * (r - 4));
          c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          c.stroke();
        }

        // Central pulsing reactor core
        c.beginPath();
        c.arc(0, 0, Math.max(1, 3 + Math.sin(t * 4 + i) * 1.2 + impact * 2.5), 0, TAU);
        c.fillStyle = P.dark ? P.hot : P.line;
        c.globalAlpha = on ? 1 : 0.85;
        c.fill();
        c.restore();

        // Expanding shockwave ripple
        if (impact > 0) {
          const ripR = r + (1 - impact) * 34;
          if (ripR > 0) {
            c.beginPath();
            c.arc(hub.x - 6, hub.y, ripR, 0, TAU);
            c.strokeStyle = P.dark ? P.hot : P.line;
            c.lineWidth = Math.max(0.1, 1.4 * impact);
            c.globalAlpha = Math.max(0, Math.min(1, impact * (P.dark ? 0.9 : 0.6)));
            c.stroke();
          }
        }

        // Hardware lock bracket
        c.strokeStyle = P.dark ? P.hi : P.line;
        c.lineWidth = 2.0;
        c.globalAlpha = on ? 1 : 0.7;
        c.beginPath();
        c.moveTo(hub.x - 24, hub.y - 11);
        c.lineTo(hub.x + 1, hub.y - 11);
        c.lineTo(hub.x + 5, hub.y);
        c.lineTo(hub.x + 1, hub.y + 11);
        c.lineTo(hub.x - 24, hub.y + 11);
        c.stroke();

        if (on) {
          c.beginPath();
          c.moveTo(hub.x - 34, hub.y);
          c.lineTo(hub.x - 26, hub.y);
          c.moveTo(hub.x - 6, hub.y - 26);
          c.lineTo(hub.x - 6, hub.y - 18);
          c.moveTo(hub.x - 6, hub.y + 18);
          c.lineTo(hub.x - 6, hub.y + 26);
          c.stroke();
        }
      });
      c.globalAlpha = 1;

      // 8. Draw Hub Workflow Labels with Glyph Scramble
      const fsHub = G.narrow ? 6.5 : 9;
      c.textAlign = 'right';
      c.textBaseline = 'middle';

      hubsRef.current.forEach((hub, i) => {
        const stageData = realStageDataRef.current;
        const hubsData = stageData?.hubs;
        let hubId: string;
        let hubName: string;
        let hubStatus: string;
        let hubQ: number;

        if (hubsData && hubsData[i]) {
          const hd = hubsData[i];
          hubId = hd.id;
          hubName = hd.name;
          hubStatus = hd.status || 'ONLINE';
          hubQ = hd.q ?? 0.96;
        } else {
          const defaultHubs = [
            { id: 'HUB-01', name: 'AGENT REASONING & DISPATCH', status: 'DISPATCHING', q: 0.98 },
            { id: 'HUB-02', name: 'AI SYNTHESIS & EXECUTION', status: 'SYNCED', q: 0.95 },
            { id: 'HUB-03', name: 'WORKSPACE & RUNTIME KERNEL', status: 'MONITORING', q: 0.99 }
          ];
          const hd = defaultHubs[i] || defaultHubs[0];
          hubId = hd.id;
          hubName = hd.name;
          hubStatus = hd.status;
          hubQ = hd.q;
        }

        const full = `${hubId} — ${hubName}`;
        const elapsed = t - (hubCh[i] ?? -10);

        let s = full;
        if (elapsed >= 0 && elapsed < 0.6) {
          const nChars = Math.floor((elapsed / 0.6) * full.length);
          s =
            full.slice(0, nChars) +
            Array.from(full.slice(nChars), ch =>
              ch === ' ' ? ' ' : GLYPH[(Math.random() * GLYPH.length) | 0]
            ).join('');
        }

        const fresh = elapsed >= 0 && elapsed < 0.9;
        const jump = elapsed >= 0 && elapsed < 0.4 ? -5 * Math.sin((elapsed / 0.4) * Math.PI) : 0;
        const x = hub.x - 30;
        const y = hub.y - 16 + jump;

        c.font = `700 ${fsHub}px ${FONT}`;
        const tw = c.measureText(s).width;
        c.globalAlpha = 1;
        c.fillStyle = P.bg;
        c.fillRect(x - tw - 6, y - fsHub * 0.8, tw + 12, fsHub * 1.6);
        c.strokeStyle = fresh ? (P.dark ? P.hot : P.line) : P.text;
        c.globalAlpha = fresh ? 0.85 : 0.4;
        c.lineWidth = fresh ? 1.4 : 0.8;
        c.strokeRect(x - tw - 6 + 0.5, y - fsHub * 0.8 + 0.5, tw + 11, fsHub * 1.6 - 1);
        c.globalAlpha = 1;
        c.fillStyle = fresh ? (P.dark ? P.hot : P.line) : P.text;
        c.fillText(s, x, y);

        const sub = `${hub.curves.length} conduits · q ${hubQ.toFixed(2)} · ${hubStatus}`;
        c.font = `500 ${fsHub - 1.5}px ${FONT}`;
        const sw = c.measureText(sub).width;
        c.fillStyle = P.bg;
        c.fillRect(x - sw - 4, y + fsHub * 0.85, sw + 8, fsHub * 1.25);
        c.fillStyle = P.dim;
        c.fillText(sub, x, y + fsHub * 1.45);

        if (elapsed >= 0 && elapsed < 0.7) {
          const kWave = elapsed / 0.7;
          c.strokeStyle = P.dark ? P.hot : P.line;
          c.globalAlpha = 1 - kWave;
          c.lineWidth = 1.4;
          c.beginPath();
          c.arc(hub.x - 6, hub.y, 10 + kWave * 70, 0, TAU);
          c.stroke();
          c.globalAlpha = 1;
        }
      });
      c.textAlign = 'left';

      // 9. Dark Mode Scanline Glitch (strictly gated on tvNoiseEffect)
      if (tvNoiseEffectRef.current === true && P.dark && dt > 0) {
        if (t > glitchRef.current.next) {
          glitchRef.current.until = t + 0.1;
          glitchRef.current.next = t + 5 + Math.random() * 5;
        }
        if (t < glitchRef.current.until) {
          c.setTransform(1, 0, 0, 1, 0, 0);
          for (let k = 0; k < 3; k++) {
            const gy = Math.random() * cv.height;
            const gh = (4 + Math.random() * 24) * dpr;
            const gdx = (Math.random() - 0.5) * 36 * dpr;
            c.drawImage(cv, 0, gy, cv.width, gh, gdx, gy, cv.width, gh);
          }
        }
      }
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [getPalette, newPacket, triggerHubImpact]);

  // Pointer interactions for hoverHub and Tooltip
  const handlePointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const r = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;

    let foundHub = -1;
    hubsRef.current.forEach((hb, i) => {
      if (Math.hypot(x - (hb.x - 6), y - hb.y) < 34) {
        foundHub = i;
      }
    });

    if (foundHub !== hoverHub) {
      setHoverHub(foundHub);
    }

    if (foundHub >= 0) {
      const h = hubsRef.current[foundHub];
      const stageData = realStageDataRef.current;
      const hd = stageData?.hubs?.[foundHub];
      const hubId = hd ? hd.id : `HUB-0${foundHub + 1}`;
      const hubName = hd ? hd.name : `CLUSTER-${foundHub + 1}`;
      const hubSub = hd ? hd.subtitle : 'Real-time AI telemetry pipeline';
      const q = hd ? hd.q : 0.96;
      const events = hd ? hd.eventsCount : (stageData?.totalEvents || 0);

      setTipData({
        visible: true,
        x: Math.max(8, Math.min(dimsRef.current.w - 260, h.x + 14)),
        y: Math.max(8, Math.min(dimsRef.current.h - 90, h.y + 16)),
        id: hubId,
        name: hubName,
        subtitle: hubSub,
        sources: h.curves.length,
        live: events,
        q
      });
    } else {
      setTipData(prev => ({ ...prev, visible: false }));
    }
  };

  const handlePointerLeave = () => {
    setHoverHub(-1);
    setTipData(prev => ({ ...prev, visible: false }));
  };

  const isCflWarn = cfl > 1;

  return (
    <main className="stage" id="stage" ref={containerRef}>
      <canvas
        id="sc"
        ref={canvasRef}
        aria-label="Main Dispatch View: Input cybernetic conduits converging into workflow hubs, center rotating flywheel with execution data, and radiating spectrum output"
        onPointerMove={handlePointer}
        onPointerDown={handlePointer}
        onPointerLeave={handlePointerLeave}
      />

      <div className="hud">
        <span>STABILITY CHECK · DYNAMICS</span>
        <span>
          CFL = |u|·Δt/Δx = <b id="cfl">{cfl.toFixed(2)}</b>{' '}
          <span id="cflst" className={isCflWarn ? 'warn' : ''}>
            {isCflWarn ? 'OVER · DT HALVED' : 'OK'}
          </span>
        </span>
      </div>

      <div className="note">
        <span className="nh">AI AGENT TELEMETRY / PIPELINE STATE</span>
        <b id="noteMain">
          {realStageData?.doneOutputs || 0} / {realStageData?.totalEvents || 0} EVENTS DISPATCHED · {realStageData?.activeAgents || 0} ACTIVE AGENTS
        </b>
        <span className="ns">— Full real-time provenance tracing verified</span>
      </div>

      {tipData.visible && (
        <div className="tip" id="tip" style={{ left: `${tipData.x}px`, top: `${tipData.y}px` }}>
          <b>{tipData.id}</b> {tipData.name}
          <span>
            {tipData.subtitle} · Conduits: {tipData.sources} · Events: {tipData.live} · Quality: {Math.round(tipData.q * 100)}%
          </span>
        </div>
      )}
    </main>
  );
};

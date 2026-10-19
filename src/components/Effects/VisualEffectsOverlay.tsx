import React, { useEffect, useRef, useState } from 'react';
import { useDashboard } from '../../context/DashboardContext';

/**
 * VisualEffectsOverlay handles retro visual filters:
 * 1. CRT TV Snow Static (老电视雪花噪波与随机偶尔闪动)
 * 2. Mosaic Pixelation SVG Filter (全局马赛克像素化)
 * 3. CRT Scanline & Phosphor Vignette (扫描线与显像管暗角)
 */
export const VisualEffectsOverlay: React.FC = () => {
  const { tvNoiseEffect, scanlineEffect, tvFlickerCount } = useDashboard();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Burst / Flicker state (模拟老电视的偶尔闪动雪花)
  const [isFlickering, setIsFlickering] = useState(false);
  const flickerTimerRef = useRef<number | null>(null);

  // Manual flicker trigger from console or hotkey
  useEffect(() => {
    if (tvFlickerCount > 0 && tvNoiseEffect) {
      triggerBurst();
    }
  }, [tvFlickerCount, tvNoiseEffect]);

  // Occasional automatic random flicker burst (every 4~8 seconds)
  useEffect(() => {
    if (!tvNoiseEffect) return;

    let timeoutId: any;
    const scheduleNextFlicker = () => {
      // Random delay between 4000ms and 8500ms
      const delay = 4000 + Math.random() * 4500;
      timeoutId = setTimeout(() => {
        triggerBurst();
        scheduleNextFlicker();
      }, delay);
    };

    scheduleNextFlicker();

    return () => {
      clearTimeout(timeoutId);
      if (flickerTimerRef.current) {
        clearTimeout(flickerTimerRef.current);
      }
    };
  }, [tvNoiseEffect]);

  const triggerBurst = () => {
    setIsFlickering(true);
    if (flickerTimerRef.current) {
      clearTimeout(flickerTimerRef.current);
    }
    // Glitch burst lasts 220ms - 380ms
    const burstDuration = 220 + Math.random() * 160;
    flickerTimerRef.current = window.setTimeout(() => {
      setIsFlickering(false);
    }, burstDuration);
  };

  // High-performance Canvas Noise generation (~24fps at 320x180 resolution)
  useEffect(() => {
    if (!tvNoiseEffect) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Fixed low-res buffer scaled via CSS image-rendering: pixelated
    const width = 320;
    const height = 180;
    canvas.width = width;
    canvas.height = height;

    const imgData = ctx.createImageData(width, height);
    const buf = new Uint32Array(imgData.data.buffer);

    let animId: number;
    let lastTime = 0;
    const targetFpsInterval = 1000 / 24; // 24 FPS is authentic retro CRT rate and low-CPU

    let rollOffset = 0;

    const render = (now: number) => {
      animId = requestAnimationFrame(render);

      const elapsed = now - lastTime;
      if (elapsed < targetFpsInterval) return;
      lastTime = now - (elapsed % targetFpsInterval);

      rollOffset = (rollOffset + 2) % height;

      // Fill canvas noise
      const currentBurst = isFlickering;
      const barY = rollOffset;
      const barHeight = Math.floor(height * 0.16);

      for (let y = 0; y < height; y++) {
        const isBar = currentBurst && Math.abs(y - barY) < barHeight;
        const rowOffset = y * width;

        for (let x = 0; x < width; x++) {
          // Base white/grey noise
          let v = (Math.random() * 255) | 0;

          // Horizontal streak during flicker burst
          if (isBar && Math.random() > 0.3) {
            v = Math.min(255, v + 120);
          }

          // 32-bit packed color: A (alpha), B, G, R
          const alpha = isBar ? 240 : 180;
          buf[rowOffset + x] = (alpha << 24) | (v << 16) | (v << 8) | v;
        }
      }

      ctx.putImageData(imgData, 0, 0);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [tvNoiseEffect, isFlickering]);

  return (
    <>
      {/* SVG Pixelation Filter Definition for Mosaic Effect */}
      <svg style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }} aria-hidden="true">
        <defs>
          <filter id="mosaic-filter" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feFlood x="2" y="2" height="2" width="2" />
            <feComposite width="8" height="8" />
            <feTile result="tile" />
            <feComposite in="SourceGraphic" in2="tile" operator="in" />
            <feMorphology operator="dilate" radius="4" />
          </filter>
        </defs>
      </svg>

      {/* 1. CRT TV Snow Canvas (老电视雪花与偶尔闪动) */}
      {tvNoiseEffect && (
        <div className={`tv-noise-container ${isFlickering ? 'tv-flicker-active' : ''}`}>
          <canvas
            ref={canvasRef}
            className="tv-noise-canvas"
            style={{
              opacity: isFlickering ? 0.48 : 0.09,
              transition: isFlickering ? 'none' : 'opacity 0.28s ease-out'
            }}
          />
          {/* Glitch roll bar overlay during flicker */}
          {isFlickering && <div className="tv-flicker-bar" />}
        </div>
      )}

      {/* 2. CRT Scanlines & Phosphor Vignette Overlay */}
      {scanlineEffect && <div className="fx-scanlines-overlay" />}
    </>
  );
};

import { useEffect } from 'react';
import { useDashboard } from '../context/DashboardContext';

export const useKeybindings = () => {
  const {
    isLocked,
    togglePause,
    animSpeed,
    setAnimSpeed,
    isConsoleOpen,
    openConsole,
    closeConsole
  } = useDashboard();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape closes the console if open
      if (e.key === 'Escape' && isConsoleOpen) {
        closeConsole();
        return;
      }

      if (isLocked) return;

      // Don't trigger if user is typing in an input
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePause();
      } else if (e.key === '`' || e.key === '~' || e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        if (isConsoleOpen) closeConsole();
        else openConsole();
      } else if (e.code === 'Digit1') {
        setAnimSpeed(0.5);
      } else if (e.code === 'Digit2') {
        setAnimSpeed(1.0);
      } else if (e.code === 'Digit3') {
        setAnimSpeed(2.0);
      } else if (e.code === 'Digit4') {
        setAnimSpeed(4.0);
      } else if (e.key === '[') {
        const speeds = [0.5, 1, 2, 4];
        const idx = speeds.findIndex(s => Math.abs(s - animSpeed) < 0.01);
        if (idx > 0) setAnimSpeed(speeds[idx - 1]);
      } else if (e.key === ']') {
        const speeds = [0.5, 1, 2, 4];
        const idx = speeds.findIndex(s => Math.abs(s - animSpeed) < 0.01);
        if (idx >= 0 && idx < speeds.length - 1) setAnimSpeed(speeds[idx + 1]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [animSpeed, closeConsole, isConsoleOpen, isLocked, openConsole, setAnimSpeed, togglePause]);
};

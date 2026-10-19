import { useEffect } from 'react';
import { useDashboard } from '../context/DashboardContext';

export const useTouchGuard = () => {
  const { isLocked, mode, openLockModal, togglePause } = useDashboard();

  useEffect(() => {
    if (!isLocked || mode === 'wallpaper') return;

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Allow interactions within the lock modal and with the lock button, or console modal/btn
      if (
        target.closest('#lockModal') ||
        target.closest('#lockBtn') ||
        target.closest('#consoleModal') ||
        target.closest('#consoleBtn')
      ) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      openLockModal();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      if (target.closest('#lockModal') || target.closest('#consoleModal')) {
        return;
      }

      // Space key toggles pause directly without triggering lock modal
      if (e.code === 'Space') {
        e.preventDefault();
        e.stopPropagation();
        togglePause();
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      openLockModal();
    };

    // Attach in capture phase to intercept before any component gets the event
    window.addEventListener('pointerdown', handlePointerDown, true);
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, true);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isLocked, mode, openLockModal, togglePause]);
};

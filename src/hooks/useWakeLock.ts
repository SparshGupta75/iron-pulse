import { useEffect, useRef, useCallback } from 'react';

export function useWakeLock(active: boolean) {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const acquire = useCallback(async () => {
    if (!('wakeLock' in navigator)) return;
    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen');
    } catch {
      // Silently fail if wake lock is not available (e.g., page not visible)
    }
  }, []);

  const release = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch {
        // ignore
      }
      wakeLockRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (active) {
      acquire();
    } else {
      release();
    }
    return () => {
      release();
    };
  }, [active, acquire, release]);
}

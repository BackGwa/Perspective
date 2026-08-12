import { useEffect } from 'react';

// The browser drops the lock whenever the document is hidden, so it has to be
// re-acquired on every return to visibility rather than requested once.
export function useWakeLock(isActive: boolean): void {
  useEffect(() => {
    if (!isActive) return;

    const wakeLock = 'wakeLock' in navigator ? navigator.wakeLock : null;
    if (!wakeLock) return;

    let sentinel: WakeLockSentinel | null = null;
    let isRequesting = false;
    let isCancelled = false;

    const release = (target: WakeLockSentinel) => {
      target.release().catch(error => {
        console.warn('[WakeLock] Failed to release the screen wake lock:', error);
      });
    };

    const acquire = async () => {
      if (sentinel || isRequesting || document.visibilityState !== 'visible') return;

      isRequesting = true;
      try {
        const next = await wakeLock.request('screen');

        if (isCancelled) {
          release(next);
          return;
        }

        next.addEventListener('release', () => {
          if (sentinel === next) sentinel = null;
        });
        sentinel = next;
      } catch (error) {
        console.warn('[WakeLock] Screen wake lock unavailable:', error);
      } finally {
        isRequesting = false;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        acquire();
      }
    };

    acquire();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isCancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (sentinel) {
        release(sentinel);
        sentinel = null;
      }
    };
  }, [isActive]);
}

import { useEffect } from 'react';
import { HOSTED_WEB } from '../config/hosted-web';
import { useAppData } from '../data/DataProvider';

export function HostedWebSync() {
  const { ready, syncPersonalAndRefresh, syncSharedAndRefresh } = useAppData();

  useEffect(() => {
    if (!HOSTED_WEB || !ready) return;
    let running = false;
    const sync = async () => {
      if (running || navigator.onLine === false || document.visibilityState !== 'visible') return;
      running = true;
      try {
        await syncPersonalAndRefresh();
        await syncSharedAndRefresh();
      } catch {
        // The sync engine persists errors for display in Settings.
      } finally {
        running = false;
      }
    };
    const onVisible = () => { void sync(); };
    window.addEventListener('online', onVisible);
    window.addEventListener('focus', onVisible);
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(onVisible, 20_000);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('online', onVisible);
      window.removeEventListener('focus', onVisible);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [ready, syncPersonalAndRefresh, syncSharedAndRefresh]);

  return null;
}

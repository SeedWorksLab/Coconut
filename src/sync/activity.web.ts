export function observeSyncActivity(onChange: (active: boolean) => void): () => void {
  const changed = () => onChange(navigator.onLine !== false && document.visibilityState === 'visible');
  changed();
  window.addEventListener('online', changed);
  window.addEventListener('offline', changed);
  window.addEventListener('focus', changed);
  document.addEventListener('visibilitychange', changed);
  return () => {
    window.removeEventListener('online', changed);
    window.removeEventListener('offline', changed);
    window.removeEventListener('focus', changed);
    document.removeEventListener('visibilitychange', changed);
  };
}

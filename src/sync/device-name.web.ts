export function getSyncDeviceName(): string {
  return typeof window !== 'undefined' && window.coconutUpdater
    ? 'Coconut (desktop)'
    : 'Coconut (web)';
}

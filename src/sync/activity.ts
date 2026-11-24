import { AppState } from 'react-native';

export function observeSyncActivity(onChange: (active: boolean) => void): () => void {
  onChange(AppState.currentState === 'active');
  const subscription = AppState.addEventListener('change', (state) => onChange(state === 'active'));
  return () => subscription.remove();
}

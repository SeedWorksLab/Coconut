import { Platform } from 'react-native';

export function getSyncDeviceName(): string {
  return `Coconut (${Platform.OS})`;
}

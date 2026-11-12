import { Linking } from 'react-native';
import type { ReleaseInfo } from './update-service';

export async function installUpdate(release: ReleaseInfo): Promise<void> {
  await Linking.openURL(release.url);
}

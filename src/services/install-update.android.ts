import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import type { ReleaseInfo } from './update-service';

export async function installUpdate(release: ReleaseInfo): Promise<void> {
  const apk = release.assets?.find((asset) => asset.name.toLowerCase().endsWith('.apk'));
  if (!apk) {
    throw new Error('No APK is attached to this GitHub release.');
  }
  const destination = `${FileSystem.cacheDirectory}coconut-${release.version.replace(/^v/, '')}.apk`;
  const download = await FileSystem.downloadAsync(apk.url, destination);
  if (download.status < 200 || download.status >= 300) {
    throw new Error(`APK download failed (${download.status}).`);
  }
  const contentUri = await FileSystem.getContentUriAsync(download.uri);
  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    data: contentUri,
    type: 'application/vnd.android.package-archive',
    flags: 1,
  });
}

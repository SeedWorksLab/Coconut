import { requireNativeModule } from 'expo';
import * as IntentLauncher from 'expo-intent-launcher';
import type { ReleaseInfo } from './update-service';

export async function installUpdate(release: ReleaseInfo): Promise<void> {
  const apk = release.assets?.find((asset) => asset.name.toLowerCase().endsWith('.apk'));
  if (!apk) {
    throw new Error('No APK is attached to this GitHub release.');
  }
  const downloader = requireNativeModule<{
    downloadApk(url: string, version: string): Promise<string>;
  }>('CoconutUpdate');
  const contentUri = await downloader.downloadApk(apk.url, release.version);
  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    data: contentUri,
    type: 'application/vnd.android.package-archive',
    flags: 1,
  });
}

import type { ReleaseInfo } from './update-service';

interface DesktopUpdater {
  check(): Promise<string | null>;
  download(): Promise<unknown>;
  install(): Promise<void>;
}

declare global {
  interface Window {
    coconutUpdater?: DesktopUpdater;
  }
}

export async function installUpdate(release: ReleaseInfo): Promise<void> {
  const updater = window.coconutUpdater;
  if (!updater) {
    window.location.assign(release.url);
    return;
  }
  const version = await updater.check();
  if (!version) {
    throw new Error('No desktop update is available.');
  }
  await updater.download();
  await updater.install();
}

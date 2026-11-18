import { requireNativeModule } from 'expo';
import * as IntentLauncher from 'expo-intent-launcher';
import { installUpdate } from '../../src/services/install-update.android';

jest.mock('expo', () => ({ requireNativeModule: jest.fn() }));
jest.mock('expo-intent-launcher', () => ({ startActivityAsync: jest.fn() }));

const downloadApk = jest.fn();
const release = {
  version: '1.3.1',
  url: 'https://github.com/henrikkerezsi/Coconut/releases/tag/v1.3.1',
  assets: [{ name: 'Coconut.apk', url: 'https://example.com/Coconut.apk' }],
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(requireNativeModule).mockReturnValue({ downloadApk });
  downloadApk.mockResolvedValue('content://downloads/123');
});

test('uses the notification-backed downloader before opening the APK installer', async () => {
  await installUpdate(release);
  expect(requireNativeModule).toHaveBeenCalledWith('CoconutUpdate');
  expect(downloadApk).toHaveBeenCalledWith(release.assets[0].url, '1.3.1');
  expect(IntentLauncher.startActivityAsync).toHaveBeenCalledWith('android.intent.action.VIEW', {
    data: 'content://downloads/123', type: 'application/vnd.android.package-archive', flags: 1,
  });
});

test('does not launch the installer after a failed or cancelled download', async () => {
  downloadApk.mockRejectedValueOnce(new Error('Download cancelled'));
  await expect(installUpdate(release)).rejects.toThrow('Download cancelled');
  expect(IntentLauncher.startActivityAsync).not.toHaveBeenCalled();
});

test('rejects a release without an APK before starting any download', async () => {
  await expect(installUpdate({ ...release, assets: [] })).rejects.toThrow('No APK');
  expect(downloadApk).not.toHaveBeenCalled();
});

import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useReleaseNotes } from '../../src/updates/use-release-notes';
import { readReleaseNotesCache, writeReleaseNotesCache } from '../../src/database/release-notes-cache';

jest.mock('../../src/database/release-notes-cache', () => ({
  readReleaseNotesCache: jest.fn(), writeReleaseNotesCache: jest.fn(),
}));

const readCache = jest.mocked(readReleaseNotesCache);
const writeCache = jest.mocked(writeReleaseNotesCache);
const payload = (text: string) => [{
  tag_name: 'v1.3.0', published_at: '2026-11-18T00:00:00Z',
  html_url: 'https://github.com/SeedWorksLab/Coconut/releases/tag/v1.3.0',
  body: `<!-- seedworks:release-notes:start -->\n${text}\n<!-- seedworks:release-notes:end -->`,
}];
const originalFetch = global.fetch;

beforeEach(() => {
  jest.resetAllMocks();
  readCache.mockResolvedValue([]);
  writeCache.mockResolvedValue(undefined);
});
afterEach(() => { global.fetch = originalFetch; });

test('offline keeps cached notes and an explicit refresh applies public corrections', async () => {
  readCache.mockResolvedValue(payload('Saved notes'));
  const network = jest.fn().mockRejectedValueOnce(new Error('Offline'))
    .mockResolvedValueOnce({ ok: true, json: async () => payload('Corrected notes') });
  global.fetch = network;
  const { result } = await renderHook(() => useReleaseNotes('Coconut', '1.3.0'));
  await waitFor(() => expect(result.current.failed).toBe(true));
  expect(result.current.entries[0].notes).toBe('Saved notes');
  expect(writeCache).not.toHaveBeenCalled();
  await act(async () => result.current.refresh());
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.failed).toBe(false);
  expect(result.current.entries[0].notes).toBe('Corrected notes');
  expect(writeCache).toHaveBeenCalledWith('Coconut', payload('Corrected notes'));
});

test('corrupt cache and unavailable cache writes do not break fresh notes', async () => {
  readCache.mockRejectedValue(new Error('Invalid JSON'));
  writeCache.mockRejectedValue(new Error('Storage unavailable'));
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => payload('Fresh notes') });
  const { result } = await renderHook(() => useReleaseNotes('Coconut', '1.3.0'));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.entries[0].notes).toBe('Fresh notes');
  expect(result.current.failed).toBe(false);
});

test('unmount aborts an in-flight refresh without writing a late response', async () => {
  let resolve: (value: unknown) => void = () => undefined;
  const network = jest.fn().mockImplementation(() => new Promise((done) => { resolve = done; }));
  global.fetch = network;
  const { unmount } = await renderHook(() => useReleaseNotes('Coconut', '1.3.0'));
  await waitFor(() => expect(network).toHaveBeenCalled());
  const signal = network.mock.calls[0][1].signal as AbortSignal;
  await unmount();
  expect(signal.aborted).toBe(true);
  await act(async () => resolve({ ok: true, json: async () => payload('Late notes') }));
  expect(writeCache).not.toHaveBeenCalled();
});

test('slow requests time out and leave cached notes available', async () => {
  jest.useFakeTimers();
  try {
    readCache.mockResolvedValue(payload('Saved notes'));
    global.fetch = jest.fn().mockImplementation((_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(new Error('Timed out')));
    }));
    const { result } = await renderHook(() => useReleaseNotes('Coconut', '1.3.0'));
    await act(async () => { await jest.advanceTimersByTimeAsync(15000); });
    expect(result.current.failed).toBe(true);
    expect(result.current.loading).toBe(false);
    expect(result.current.entries[0].notes).toBe('Saved notes');
    expect(writeCache).not.toHaveBeenCalled();
  } finally {
    jest.useRealTimers();
  }
});

test('localized notes use the chosen language while the cache retains all original text', async () => {
  const raw = payload('English notes');
  raw[0].body += '\n<!-- seedworks:release-notes:de:start -->\nDeutsche Hinweise\n<!-- seedworks:release-notes:de:end -->';
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => raw });
  const { result } = await renderHook(() => useReleaseNotes('Coconut', '1.3.0', 'de'));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.entries[0].notes).toBe('Deutsche Hinweise');
  expect(writeCache).toHaveBeenCalledWith('Coconut', raw);
});

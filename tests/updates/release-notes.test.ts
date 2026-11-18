import {
  compareStableVersions, extractReleaseNotes, fetchReleaseNotePayload,
  mergeReleaseNotes, normalizeReleaseNotes, visibleNotes,
} from '../../src/updates/release-notes';

const marked = (text: string) => `## Release Notes\n<!-- seedworks:release-notes:start -->\n${text}\n<!-- seedworks:release-notes:end -->\n## Downloads\nDo not show this`;
const release = (version: string) => ({
  tag_name: `v${version}`, body: marked('- Fixed a bug.'),
  published_at: '2026-11-18T00:00:00Z',
  html_url: `https://github.com/SeedWorksLab/Coconut/releases/tag/v${version}`,
});

test('only marked content is extracted; malformed or duplicate markers are rejected', () => {
  expect(extractReleaseNotes(marked('### Fixed\n\n- A bug.'))).toBe('### Fixed\n\n- A bug.');
  expect(extractReleaseNotes('## Release Notes\nNo markers')).toBe('');
  expect(extractReleaseNotes(null)).toBe('');
  expect(extractReleaseNotes(marked('x').replace('release-notes:end', 'broken'))).toBe('');
  expect(extractReleaseNotes(marked('x') + '<!-- seedworks:release-notes:start -->')).toBe('');
  expect(extractReleaseNotes(marked('x') + '<!-- seedworks:release-notes:end -->')).toBe('');
});

test('only official published stable releases with marked notes are accepted', () => {
  const good = release('1.3.1');
  expect(normalizeReleaseNotes([
    good, { ...good, draft: true }, { ...good, prerelease: true },
    { ...good, tag_name: 'v1.3.2-beta' }, { ...good, published_at: null },
    { ...good, html_url: 'https://evil.test/release' },
    { ...good, body: 'old generated log' }, null,
  ], 'Coconut')).toEqual([{ version: '1.3.1', releasedAt: good.published_at, notes: '- Fixed a bug.' }]);
});

test('semantic ordering, installed version cap and remote corrections override fallback', () => {
  const entries = normalizeReleaseNotes(['1.9.0', '1.10.0', '2.0.0', '1.2.0'].map(release), 'Coconut');
  expect(visibleNotes(entries, '1.10.0').map((entry) => entry.version)).toEqual(['1.10.0', '1.9.0', '1.2.0']);
  expect(visibleNotes(entries, '1.10.0-beta.1').map((entry) => entry.version)).toEqual(['1.9.0', '1.2.0']);
  expect(visibleNotes(entries, 'invalid')).toEqual([]);
  expect(compareStableVersions('v1.10.0', '1.9.9')).toBeGreaterThan(0);
  const fallback = [{ version: '1.2.0', releasedAt: '', notes: 'Old text' }];
  expect(mergeReleaseNotes(entries, fallback, '1.2.0')[0].notes).toBe('- Fixed a bug.');
  expect(mergeReleaseNotes([], fallback, '1.2.0')).toEqual(fallback);
});

describe('public feed transport', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => { globalThis.fetch = originalFetch; });

  test('paginates rather than losing older installed versions', async () => {
    const mock = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => Array(100).fill(release('2.0.0')) })
      .mockResolvedValueOnce({ ok: true, json: async () => [release('1.0.0')] });
    globalThis.fetch = mock;
    const result = await fetchReleaseNotePayload('Coconut', new AbortController().signal);
    expect(result).toHaveLength(101);
    expect(mock.mock.calls[1][0]).toContain('page=2');
  });

  test('rate limits, malformed feeds and aborted requests fail without returning partial data', async () => {
    for (const response of [
      { ok: false, json: async () => [] }, { ok: true, json: async () => ({ error: 'bad' }) },
    ]) {
      globalThis.fetch = jest.fn().mockResolvedValue(response);
      await expect(fetchReleaseNotePayload('Coconut', new AbortController().signal)).rejects.toThrow();
    }
    globalThis.fetch = jest.fn().mockRejectedValue(new Error('Aborted'));
    await expect(fetchReleaseNotePayload('Coconut', new AbortController().signal)).rejects.toThrow('Aborted');
  });
});

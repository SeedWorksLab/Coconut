export type ReleaseRepository = 'Coconut' | 'Banana' | 'Cherry' | 'Grape';

export interface PublishedNote {
  version: string;
  releasedAt: string;
  notes: string;
}

const START = '<!-- seedworks:release-notes:start -->';
const END = '<!-- seedworks:release-notes:end -->';
const VERSION = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

export function extractReleaseNotes(body: unknown): string {
  if (typeof body !== 'string' || body.length > 60000) return '';
  const start = body.indexOf(START);
  const end = body.indexOf(END);
  if (start < 0 || end < start + START.length ||
      body.indexOf(START, start + START.length) !== -1 ||
      body.indexOf(END, end + END.length) !== -1) return '';
  return body.slice(start + START.length, end).trim();
}

export function compareStableVersions(left: string, right: string): number {
  const a = VERSION.exec(left);
  const b = VERSION.exec(right);
  if (!a || !b) throw new Error('Expected a stable semantic version');
  for (let index = 1; index <= 3; index++) {
    const difference = a[index].length - b[index].length ||
      (a[index] < b[index] ? -1 : a[index] > b[index] ? 1 : 0);
    if (difference) return difference;
  }
  return 0;
}

export function visibleNotes(entries: PublishedNote[], currentVersion: string): PublishedNote[] {
  const base = currentVersion.split(/[+-]/)[0];
  if (!VERSION.test(base)) return [];
  return entries.filter((entry) => {
    if (!VERSION.test(entry.version)) return false;
    const order = compareStableVersions(entry.version, base);
    return order < 0 || (order === 0 && !currentVersion.includes('-'));
  }).sort((a, b) => compareStableVersions(b.version, a.version));
}

export function normalizeReleaseNotes(payload: unknown, repo: ReleaseRepository): PublishedNote[] {
  if (!Array.isArray(payload)) return [];
  const entries = new Map<string, PublishedNote>();
  for (const raw of payload.slice(0, 1000)) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as Record<string, unknown>;
    if (item.draft === true || item.prerelease === true ||
        typeof item.tag_name !== 'string' || !VERSION.test(item.tag_name) ||
        typeof item.published_at !== 'string' || !Number.isFinite(Date.parse(item.published_at)) ||
        item.html_url !== `https://github.com/SeedWorksLab/${repo}/releases/tag/${item.tag_name}`) continue;
    const notes = extractReleaseNotes(item.body);
    const version = item.tag_name.replace(/^v/, '');
    if (notes) entries.set(version, { version, releasedAt: item.published_at, notes });
  }
  return [...entries.values()].sort((a, b) => compareStableVersions(b.version, a.version));
}

export function mergeReleaseNotes(
  published: PublishedNote[], fallback: PublishedNote[], currentVersion: string,
): PublishedNote[] {
  const entries = new Map(fallback.map((entry) => [entry.version, entry]));
  for (const entry of published) entries.set(entry.version, entry);
  return visibleNotes([...entries.values()], currentVersion);
}

export async function fetchReleaseNotePayload(
  repo: ReleaseRepository, signal: AbortSignal,
): Promise<unknown[]> {
  if (!['Coconut', 'Banana', 'Cherry', 'Grape'].includes(repo)) throw new Error('Unknown repository');
  const result: unknown[] = [];
  for (let page = 1; page <= 10; page++) {
    const response = await fetch(
      `https://api.github.com/repos/SeedWorksLab/${repo}/releases?per_page=100&page=${page}`,
      { signal, headers: { Accept: 'application/vnd.github+json' } },
    );
    if (!response.ok) throw new Error('GitHub release notes are unavailable');
    const payload: unknown = await response.json();
    if (!Array.isArray(payload)) throw new Error('Invalid release feed');
    result.push(...payload.slice(0, 100).map((raw: unknown) => {
      if (!raw || typeof raw !== 'object') return null;
      const item = raw as Record<string, unknown>;
      return {
        tag_name: item.tag_name, published_at: item.published_at, html_url: item.html_url,
        draft: item.draft, prerelease: item.prerelease,
        body: typeof item.body === 'string' && item.body.length <= 60000 ? item.body : '',
      };
    }));
    if (payload.length < 100) break;
  }
  return result;
}

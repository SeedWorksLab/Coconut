import { EPOCH, PULL_OVERLAP_MS, pullSince } from '../../src/sync/time';

describe('pullSince', () => {
  it('starts at the epoch when there is no watermark yet', () => {
    expect(pullSince(null)).toBe(EPOCH);
    expect(pullSince(undefined)).toBe(EPOCH);
    expect(pullSince('not-a-date')).toBe(EPOCH);
  });

  it('re-reads an overlap window before the watermark', () => {
    const watermark = '2026-09-18T10:00:00.000Z';
    expect(pullSince(watermark)).toBe(
      new Date(Date.parse(watermark) - PULL_OVERLAP_MS).toISOString()
    );
  });

  it('never seeks before the epoch', () => {
    expect(pullSince('1970-01-01T00:01:00.000Z')).toBe(EPOCH);
  });
});

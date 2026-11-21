/// <reference types="node" />

import dayjs from 'dayjs';

import { whatsNew, whatsNewByLanguage } from '../../src/config/whats-new';

describe('the what\u2019s new list', () => {
  it('lists the newest version first, so it is the one badged as latest', () => {
    expect(whatsNew[0].version).toBe('1.3.0');
    const versions = whatsNew.map((entry) => entry.version);
    const sorted = [...versions].sort((a, b) => compareVersions(b, a));
    expect(versions).toEqual(sorted);
  });

  it('never lists the same version twice', () => {
    const versions = whatsNew.map((entry) => entry.version);
    expect(new Set(versions).size).toBe(versions.length);
  });

  it('dates every entry, and the newest entry carries the latest date', () => {
    const dates = whatsNew.map((entry) => dayjs(entry.releasedAt).valueOf());
    for (const date of dates) {
      expect(Number.isNaN(date)).toBe(false);
    }
    expect(Math.max(...dates)).toBe(dates[0]);
  });

  it('keeps every language in sync with the English release list', () => {
    expect(whatsNew[0].features).toHaveLength(3);
    for (const language of ['hu', 'de'] as const) {
      const localized = whatsNewByLanguage[language];
      expect(localized[0].features).toHaveLength(whatsNew[0].features.length);
      expect(localized.map((entry) => entry.version)).toEqual(
        whatsNew.map((entry) => entry.version)
      );
      for (const entry of localized) {
        expect(entry.features.length).toBeGreaterThan(0);
        for (const feature of entry.features) {
          expect(feature.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('gives every entry at least one feature, with no blank ones', () => {
    for (const entry of whatsNew) {
      expect(entry.features.length).toBeGreaterThan(0);
      for (const feature of entry.features) {
        expect(feature.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('announces the November 16 web release in every language', () => {
    for (const entries of Object.values(whatsNewByLanguage)) {
      expect(entries[0].version).toBe('1.3.0');
      expect(entries[0].releasedAt).toBe('2026-11-16T00:00:00.000Z');
      expect(entries[0].features.join(' ')).toContain(
        'https://seedworkslab.de/apps/coconut/web'
      );
    }
  });
});

function compareVersions(a: string, b: string): number {
  const left = a.split('.').map(Number);
  const right = b.split('.').map(Number);
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) {
      return difference;
    }
  }
  return 0;
}

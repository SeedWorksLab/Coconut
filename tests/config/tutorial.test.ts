/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { tutorialPages } from '../../src/config/tutorial';
import { en } from '../../src/i18n/en';

const GLYPHMAP = join(
  process.cwd(),
  'node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json'
);

const glyphs: Record<string, unknown> = JSON.parse(readFileSync(GLYPHMAP, 'utf8'));

describe('the tutorial tour', () => {
  it('gives every page an icon that the icon set actually has', () => {
    const missing = tutorialPages
      .map((page) => page.icon)
      .filter((icon) => !(icon in glyphs));
    expect(missing).toEqual([]);
  });

  it('gives every page a title and some body copy', () => {
    for (const page of tutorialPages) {
      expect(en[page.titleKey].length).toBeGreaterThan(0);
      expect(en[page.bodyKey].length).toBeGreaterThan(0);
    }
  });

  it('starts the month before it describes anything spent in it', () => {
    const titles = tutorialPages.map((page) => en[page.titleKey]);
    expect(titles.indexOf('Starting a Month')).toBeLessThan(titles.indexOf('Transactions'));
    expect(titles.indexOf('Closing a Month')).toBeLessThan(titles.indexOf('Statistics'));
    expect(titles.indexOf('Closing a Month')).toBeGreaterThan(titles.indexOf('Flexible Budgets'));
  });

  it('ends on the page that tells the user to get started', () => {
    expect(en[tutorialPages[tutorialPages.length - 1].titleKey]).toBe('Ready to start?');
  });
});

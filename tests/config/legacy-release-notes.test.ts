/// <reference types="node" />
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { whatsNewByLanguage } from '../../src/config/whats-new';

const { markdown, exportLegacyNotes } = require('../../scripts/export-legacy-release-notes');
const root = path.resolve(__dirname, '../..');

test('the immutable archive preserves all original data and each language has editable versioned notes', () => {
  const archive = JSON.parse(fs.readFileSync(path.join(root, 'release-notes/legacy-whats-new.json'), 'utf8'));
  expect(archive.languages).toEqual(whatsNewByLanguage);
  for (const language of ['en', 'de', 'hu'] as const) {
    for (const entry of whatsNewByLanguage[language]) {
      const relative = language === 'en' ? `${entry.version}.md` : `${language}/${entry.version}.md`;
      expect(fs.readFileSync(path.join(root, 'release-notes', relative), 'utf8').trim().length).toBeGreaterThan(0);
    }
  }
});

test('export is preview-first, repeatable, and refuses to overwrite edited notes before writing anything', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'coconut-notes-export-'));
  try {
    fs.mkdirSync(path.join(fixture, 'src/config'), { recursive: true });
    for (const name of ['whats-new.ts', 'whats-new.de.ts', 'whats-new.hu.ts']) {
      fs.copyFileSync(path.join(root, 'src/config', name), path.join(fixture, 'src/config', name));
    }
    expect(exportLegacyNotes(fixture).versions).toBe(whatsNewByLanguage.en.length);
    expect(fs.existsSync(path.join(fixture, 'release-notes'))).toBe(false);
    exportLegacyNotes(fixture, true);
    expect(() => exportLegacyNotes(fixture, true)).not.toThrow();
    const edited = path.join(fixture, 'release-notes', `${whatsNewByLanguage.en[0].version}.md`);
    expect(fs.readFileSync(edited, 'utf8')).toBe(markdown(whatsNewByLanguage.en[0]));
    fs.writeFileSync(edited, 'A deliberate edit');
    const missing = path.join(fixture, 'release-notes/legacy-whats-new.json');
    fs.unlinkSync(missing);
    expect(() => exportLegacyNotes(fixture, true)).toThrow('Refusing to overwrite');
    expect(fs.readFileSync(edited, 'utf8')).toBe('A deliberate edit');
    expect(fs.existsSync(missing)).toBe(false);
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

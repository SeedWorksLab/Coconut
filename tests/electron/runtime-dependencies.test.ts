/// <reference types="node" />

import fs from 'node:fs';
import path from 'node:path';
import { builtinModules } from 'node:module';

interface PackageManifest {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

it('ships every external module required by the desktop main process', () => {
  const root = path.resolve(__dirname, '../..');
  const manifest = JSON.parse(
    fs.readFileSync(path.join(root, 'package.json'), 'utf8')
  ) as PackageManifest;
  const electronDir = path.join(root, 'electron');
  const builtins = new Set([...builtinModules, 'electron']);
  const externalModules = new Set<string>();
  for (const file of fs.readdirSync(electronDir).filter((name) => name.endsWith('.js'))) {
    const source = fs.readFileSync(path.join(electronDir, file), 'utf8');
    for (const match of source.matchAll(/require\(['"]([^'"]+)['"]\)/g)) {
      const name = match[1];
      if (!name.startsWith('.') && !name.startsWith('node:') && !builtins.has(name)) {
        externalModules.add(name);
      }
    }
  }
  expect(externalModules.has('electron-updater')).toBe(true);
  for (const name of externalModules) {
    expect(manifest.dependencies[name]).toBeDefined();
    expect(manifest.devDependencies[name]).toBeUndefined();
  }
});

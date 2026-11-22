/** @jest-environment node */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { runInNewContext } from 'node:vm';

const { checkNativeDependencies } = require('../../scripts/check-native-dependencies');
const manifest = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf8'));
const lock = JSON.parse(readFileSync(resolve(__dirname, '../../package-lock.json'), 'utf8'));
const supported = require('expo/bundledNativeModules.json');

test('Worklets and Reanimated are explicitly pinned and installed at Expo-supported versions', () => {
  expect(() => checkNativeDependencies()).not.toThrow();
  for (const name of ['react-native-worklets', 'react-native-reanimated']) {
    expect(manifest.dependencies[name]).toBe(supported[name]);
    expect(lock.packages[''].dependencies[name]).toBe(supported[name]);
    expect(lock.packages[`node_modules/${name}`].version).toBe(supported[name]);
  }
});

test('release builds check native animation compatibility before rebuilding Android', () => {
  const release = readFileSync(resolve(__dirname, '../../.seedworks/release.toml'), 'utf8');
  const guard = release.indexOf('"check:native-deps"');
  expect(guard).toBeGreaterThan(-1);
  expect(guard).toBeLessThan(release.indexOf('"prebuild"'));
});

test.each(['unsupported-pin', 'unsupported-install', 'missing-pin'])(
  'the release guard rejects %s instead of silently building incompatible native libraries',
  (failure) => {
    const dependencies = {
      'react-native-reanimated': supported['react-native-reanimated'],
      'react-native-worklets': failure === 'unsupported-pin' ? '0.12.2'
        : failure === 'missing-pin' ? undefined : supported['react-native-worklets'],
    };
    const files: Record<string, string> = {
      '/isolated/package.json': JSON.stringify({ dependencies }),
      'expo/bundledNativeModules.json': JSON.stringify(supported),
      'react-native-reanimated/package.json': JSON.stringify({ version: supported['react-native-reanimated'] }),
      'react-native-worklets/package.json': JSON.stringify({
        version: failure === 'unsupported-install' ? '0.12.2' : supported['react-native-worklets'],
      }),
    };
    const isolatedModule: { exports: { checkNativeDependencies?: (root: string) => void } } = { exports: {} };
    const fakeRequire = Object.assign((name: string) => {
      if (name === 'node:fs') return { readFileSync: (file: string) => files[file] };
      if (name === 'node:path') return { join, resolve };
      throw new Error(`Unexpected module: ${name}`);
    }, { resolve: (name: string) => name });
    runInNewContext(readFileSync(resolve(__dirname, '../../scripts/check-native-dependencies.js'), 'utf8'), {
      module: isolatedModule, require: fakeRequire,
    });
    expect(() => isolatedModule.exports.checkNativeDependencies!('/isolated')).toThrow('react-native-worklets');
  },
);

#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const NATIVE_ANIMATION_PACKAGES = ['react-native-reanimated', 'react-native-worklets'];

function checkNativeDependencies(root = path.resolve(__dirname, '..')) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const expoFile = require.resolve('expo/bundledNativeModules.json', { paths: [root] });
  const supported = JSON.parse(fs.readFileSync(expoFile, 'utf8'));
  for (const name of NATIVE_ANIMATION_PACKAGES) {
    const packageFile = require.resolve(`${name}/package.json`, { paths: [root] });
    const installed = JSON.parse(fs.readFileSync(packageFile, 'utf8')).version;
    const expected = supported[name];
    if (!expected || manifest.dependencies?.[name] !== expected || installed !== expected) {
      throw new Error(
        `${name}: pin and install Expo's supported version ${expected}; found pin ${manifest.dependencies?.[name]} and installed ${installed}. Rebuild Android after changing native dependencies.`,
      );
    }
  }
}

if (require.main === module) {
  try {
    checkNativeDependencies();
    console.log('Native animation dependencies match the installed Expo SDK.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { checkNativeDependencies };

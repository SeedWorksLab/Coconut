#!/usr/bin/env node
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const source = path.resolve(__dirname, '../build/hosted-web');
const site = path.resolve(__dirname, '../../seedworkslab.github.io');
const target = path.join(site, 'apps/coconut/web');
if (!fs.existsSync(path.join(source, 'index.html'))) {
  throw new Error('Build the hosted web bundle before staging it.');
}
if (!fs.existsSync(path.join(site, '.git'))) {
  throw new Error('SeedWorks website repository not found.');
}
if (execFileSync('git', ['status', '--porcelain'], { cwd: site, encoding: 'utf8' }).trim()) {
  throw new Error('Website has changes. Review them before staging a new Coconut web build.');
}
function removeObsoleteBundles(folder) {
  if (!fs.existsSync(folder)) return;
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    const file = path.join(folder, entry.name);
    if (entry.isDirectory()) {
      removeObsoleteBundles(file);
    } else if (entry.isFile() && !fs.existsSync(path.join(source, path.relative(target, file)))) {
      const generated = /^(entry|worker)-[0-9a-f]+\.js$/.test(entry.name)
        || /\.[0-9a-f]{20,}\./.test(entry.name);
      if (generated) fs.unlinkSync(file);
    }
  }
}
fs.mkdirSync(target, { recursive: true });
removeObsoleteBundles(target);
fs.cpSync(source, target, { recursive: true, force: true });
console.log(`Staged Coconut web at ${target}. Review and deploy the website separately.`);

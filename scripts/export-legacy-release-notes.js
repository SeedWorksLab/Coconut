const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ts = require('typescript');

function loadLegacyNotes(root) {
  const cache = new Map();
  function load(name) {
    if (!['whats-new', 'whats-new.de', 'whats-new.hu'].includes(name)) {
      throw new Error(`Unexpected legacy module: ${name}`);
    }
    if (cache.has(name)) return cache.get(name);
    const filename = path.join(root, 'src/config', `${name}.ts`);
    const source = fs.readFileSync(filename, 'utf8');
    const output = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const exports = {};
    cache.set(name, exports);
    vm.runInNewContext(output, {
      exports,
      require: (request) => load(request.replace(/^\.\//, '')),
    }, { filename, timeout: 1000 });
    return exports;
  }
  return load('whats-new').whatsNewByLanguage;
}

function markdown(entry) {
  return [entry.intro, entry.features.map((feature) => `- ${feature}`).join('\n')]
    .filter(Boolean).join('\n\n') + '\n';
}

function exportLegacyNotes(root, write = false) {
  const languages = loadLegacyNotes(root);
  const files = new Map();
  for (const language of ['en', 'de', 'hu']) {
    const entries = languages[language];
    if (!Array.isArray(entries)) throw new Error(`Missing ${language} history`);
    const versions = new Set();
    for (const entry of entries) {
      if (!/^\d+\.\d+\.\d+$/.test(entry.version) || versions.has(entry.version) ||
          !entry.releasedAt || !Array.isArray(entry.features) ||
          !entry.features.every((feature) => typeof feature === 'string' && feature.trim())) {
        throw new Error(`Invalid or duplicate historical entry: ${language}/${entry.version}`);
      }
      versions.add(entry.version);
      const relative = language === 'en'
        ? `release-notes/${entry.version}.md` : `release-notes/${language}/${entry.version}.md`;
      files.set(relative, markdown(entry));
    }
    if (JSON.stringify(entries.map((entry) => entry.version)) !==
        JSON.stringify(languages.en.map((entry) => entry.version))) {
      throw new Error(`Historical versions differ for ${language}`);
    }
  }
  files.set('release-notes/legacy-whats-new.json', JSON.stringify({
    schema: 1,
    source: 'src/config/whats-new{,.de,.hu}.ts',
    languages,
  }, null, 2) + '\n');

  // Validate every destination before writing any file; never replace edited notes.
  for (const [relative, content] of files) {
    const destination = path.join(root, relative);
    if (fs.existsSync(destination) && fs.readFileSync(destination, 'utf8') !== content) {
      throw new Error(`Refusing to overwrite different content: ${relative}`);
    }
  }
  if (write) {
    for (const [relative, content] of files) {
      const destination = path.join(root, relative);
      if (fs.existsSync(destination)) continue;
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.writeFileSync(destination, content, { flag: 'wx' });
    }
  }
  return { versions: languages.en.length, languages: 3, files: [...files.keys()] };
}

if (require.main === module) {
  if (process.argv.slice(2).some((arg) => arg !== '--write')) {
    throw new Error('usage: node scripts/export-legacy-release-notes.js [--write]');
  }
  const result = exportLegacyNotes(path.join(__dirname, '..'), process.argv.includes('--write'));
  console.log(`${process.argv.includes('--write') ? 'Preserved' : 'Preview:'} ${result.versions} versions, ${result.languages} languages, ${result.files.length} files.`);
  if (!process.argv.includes('--write')) console.log('No files changed. Add --write to export.');
}

module.exports = { loadLegacyNotes, markdown, exportLegacyNotes };

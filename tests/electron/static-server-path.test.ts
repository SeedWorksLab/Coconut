/// <reference types="node" />

const { safeJoin } = require('../../electron/static-server-path') as {
  safeJoin: (root: string, requestPath: string) => string | null;
};

describe('desktop static file paths', () => {
  const root = '/app/dist';

  it('resolves files inside the bundled web build', () => {
    expect(safeJoin(root, '/index.html')).toBe('/app/dist/index.html');
    expect(safeJoin(root, '/assets/app.js?v=1')).toBe('/app/dist/assets/app.js');
  });

  it('rejects paths outside the bundled web build, including sibling prefixes', () => {
    expect(safeJoin(root, '/../dist-private/secret')).toBeNull();
    expect(safeJoin(root, '/%2e%2e/secret')).toBeNull();
  });

  it('rejects malformed URL encodings without throwing', () => {
    expect(safeJoin(root, '/%ZZ')).toBeNull();
  });
});

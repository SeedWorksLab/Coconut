/// <reference types="node" />

const { availableVersion } = require('../../electron/update-result') as {
  availableVersion: (result: { isUpdateAvailable: boolean; updateInfo: { version: string } } | null) => string | null;
};

describe('desktop updater results', () => {
  it('does not offer a download when already current', () => {
    expect(availableVersion({ isUpdateAvailable: false, updateInfo: { version: '1.2.2' } })).toBeNull();
    expect(availableVersion(null)).toBeNull();
  });

  it('offers only an available version', () => {
    expect(availableVersion({ isUpdateAvailable: true, updateInfo: { version: '1.2.3' } })).toBe('1.2.3');
  });
});

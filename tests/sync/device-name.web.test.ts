import { getSyncDeviceName } from '../../src/sync/device-name.web';

afterEach(() => {
  delete window.coconutUpdater;
});

test('identifies a browser as web', () => {
  expect(getSyncDeviceName()).toBe('Coconut (web)');
});

test('identifies the Electron bridge as desktop, not web', () => {
  window.coconutUpdater = {
    check: jest.fn(), download: jest.fn(), install: jest.fn(),
  };
  expect(getSyncDeviceName()).toBe('Coconut (desktop)');
});

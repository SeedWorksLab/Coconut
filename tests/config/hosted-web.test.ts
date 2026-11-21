describe('official hosted web detection', () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const originalFlag = process.env.EXPO_PUBLIC_COCONUT_HOSTED_WEB;

  afterEach(() => {
    if (originalWindow) {
      Object.defineProperty(globalThis, 'window', originalWindow);
    } else {
      Reflect.deleteProperty(globalThis, 'window');
    }
    if (originalFlag === undefined) {
      delete process.env.EXPO_PUBLIC_COCONUT_HOSTED_WEB;
    } else {
      process.env.EXPO_PUBLIC_COCONUT_HOSTED_WEB = originalFlag;
    }
    jest.resetModules();
  });

  function detect(hostname: string, pathname: string, flag?: string): boolean {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { location: { hostname, pathname } },
    });
    if (flag === undefined) {
      delete process.env.EXPO_PUBLIC_COCONUT_HOSTED_WEB;
    } else {
      process.env.EXPO_PUBLIC_COCONUT_HOSTED_WEB = flag;
    }
    jest.resetModules();
    return require('../../src/config/hosted-web.web').HOSTED_WEB;
  }

  it.each(['/', '/settings', '/shared/expense'])(
    'recognizes the official app subdomain at %s',
    (pathname) => {
      expect(detect('coconut.seedworkslab.de', pathname)).toBe(true);
    }
  );

  it.each(['/apps/coconut/web', '/apps/coconut/web/', '/apps/coconut/web/settings'])(
    'recognizes the official hosted path %s',
    (pathname) => {
      expect(detect('seedworkslab.de', pathname)).toBe(true);
    }
  );

  it.each([
    ['localhost', '/apps/coconut/web/'],
    ['seedworkslab.de.example.com', '/apps/coconut/web/'],
    ['coconut.seedworkslab.de.example.com', '/'],
    ['cherry.seedworkslab.de', '/'],
    ['seedworkslab.de', '/apps/coconut/'],
    ['seedworkslab.de', '/apps/coconut/website'],
  ])('does not infer hosted mode for %s%s', (hostname, pathname) => {
    expect(detect(hostname, pathname)).toBe(false);
  });

  it('supports explicitly built hosted deployments', () => {
    expect(detect('localhost', '/', '1')).toBe(true);
  });
});

/** @jest-environment node */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';

describe('local and Electron web export isolation', () => {
  it.each([0, null])('overrides hosted mode and clears Metro even after hosted builds (status %s)', (status) => {
    const spawn = jest.fn().mockReturnValue({ status });
    const exit = jest.fn().mockImplementation(() => {
      throw new Error('test-exit');
    });
    const script = readFileSync(resolve(__dirname, '../../scripts/build-local-web.js'), 'utf8');
    expect(() => runInNewContext(script, {
      __dirname: resolve(__dirname, '../../scripts'),
      process: { env: { EXPO_PUBLIC_COCONUT_HOSTED_WEB: '1' }, exit },
      require(name: string) {
        if (name === 'node:child_process') return { spawnSync: spawn };
        if (name === 'node:path') return { resolve };
        throw new Error(`Unexpected module: ${name}`);
      },
    })).toThrow('test-exit');
    expect(spawn).toHaveBeenCalledWith('npx', ['expo', 'export', '--platform', 'web', '--clear'], expect.objectContaining({
      env: expect.objectContaining({ EXPO_PUBLIC_COCONUT_HOSTED_WEB: '0' }),
    }));
    expect(exit).toHaveBeenCalledWith(status ?? 1);
  });

  it('makes Electron use the isolated local export rather than a cached plain Expo command', () => {
    const script = readFileSync(resolve(__dirname, '../../scripts/build-electron.js'), 'utf8');
    expect(script).toContain("run('npm run export:web')");
    expect(script).not.toContain("run('npx expo export --platform web')");
  });
});

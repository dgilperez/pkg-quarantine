/**
 * Platform path resolution tests.
 *
 * `src/lib/platform.ts` computes its `paths` object at import time, so the
 * value captured in `paths.pnpmrc` reflects whatever OS vitest is running
 * on. That's fine as a smoke test for the current platform, but the
 * per-OS branches need to be asserted independently — we do that by
 * `vi.resetModules()` + stubbing `node:os` + re-importing.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadPathsWithEnv(opts: {
  platform: NodeJS.Platform;
  home?: string;
  xdg?: string;
  localAppData?: string;
}) {
  const home = opts.home ?? '/home/user';
  vi.resetModules();
  vi.doMock('node:os', () => ({
    homedir: () => home,
    platform: () => opts.platform,
  }));
  const originalXdg = process.env['XDG_CONFIG_HOME'];
  const originalLocalAppData = process.env['LOCALAPPDATA'];
  if (opts.xdg === undefined) delete process.env['XDG_CONFIG_HOME'];
  else process.env['XDG_CONFIG_HOME'] = opts.xdg;
  if (opts.localAppData === undefined) delete process.env['LOCALAPPDATA'];
  else process.env['LOCALAPPDATA'] = opts.localAppData;
  try {
    const mod = await import('../../src/lib/platform.js');
    return mod.paths;
  } finally {
    if (originalXdg === undefined) delete process.env['XDG_CONFIG_HOME'];
    else process.env['XDG_CONFIG_HOME'] = originalXdg;
    if (originalLocalAppData === undefined) delete process.env['LOCALAPPDATA'];
    else process.env['LOCALAPPDATA'] = originalLocalAppData;
    vi.doUnmock('node:os');
  }
}

describe('paths.pnpmrc — platform-specific resolution', () => {
  afterEach(() => {
    vi.resetModules();
  });

  it('uses ~/Library/Preferences/pnpm/rc on macOS', async () => {
    const paths = await loadPathsWithEnv({ platform: 'darwin', home: '/Users/alice' });
    expect(paths.pnpmrc).toBe('/Users/alice/Library/Preferences/pnpm/rc');
  });

  it('uses ~/.config/pnpm/rc on Linux (no XDG)', async () => {
    const paths = await loadPathsWithEnv({ platform: 'linux', home: '/home/alice' });
    expect(paths.pnpmrc).toBe('/home/alice/.config/pnpm/rc');
  });

  it('respects XDG_CONFIG_HOME over macOS default', async () => {
    const paths = await loadPathsWithEnv({
      platform: 'darwin',
      home: '/Users/alice',
      xdg: '/Users/alice/custom-xdg',
    });
    expect(paths.pnpmrc).toBe('/Users/alice/custom-xdg/pnpm/rc');
  });

  it('respects XDG_CONFIG_HOME on Linux', async () => {
    const paths = await loadPathsWithEnv({
      platform: 'linux',
      home: '/home/alice',
      xdg: '/home/alice/xdg',
    });
    expect(paths.pnpmrc).toBe('/home/alice/xdg/pnpm/rc');
  });

  it('uses %LOCALAPPDATA%\\pnpm\\config on Windows', async () => {
    const paths = await loadPathsWithEnv({
      platform: 'win32',
      home: 'C:\\Users\\alice',
      localAppData: 'C:\\Users\\alice\\AppData\\Local',
    });
    // `path.join` on POSIX Node produces forward slashes even for
    // Windows-shaped inputs, so we only assert the trailing segments.
    expect(paths.pnpmrc.endsWith('pnpm/config/rc') || paths.pnpmrc.endsWith('pnpm\\config\\rc')).toBe(true);
    expect(paths.pnpmrc).toContain('AppData');
  });

  it('falls back to ~/.config/pnpm/rc on Windows without LOCALAPPDATA', async () => {
    const paths = await loadPathsWithEnv({ platform: 'win32', home: 'C:\\Users\\alice' });
    // Again, `path.join` doesn't rewrite separators on POSIX runners.
    expect(paths.pnpmrc.endsWith('.config/pnpm/rc') || paths.pnpmrc.endsWith('.config\\pnpm\\rc')).toBe(true);
  });
});

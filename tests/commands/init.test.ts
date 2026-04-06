import { describe, it, expect, vi } from 'vitest';
import { initCommand } from '../../src/commands/init.js';
import { mockFs, mockShell } from '../helpers.js';
import { paths } from '../../src/lib/platform.js';

describe('init command', () => {
  it('writes quarantine config for installed managers', async () => {
    const fs = mockFs();
    const shell = mockShell({ installed: ['npm'] });
    vi.spyOn(console, 'log').mockImplementation(() => {});

    await initCommand(fs, shell, {
      dryRun: false,
      managers: ['npm'],
      config: { quarantine_days: 4, managers: ['npm'] },
    });

    const written = fs.store.get(paths.npmrc);
    expect(written).toBeDefined();
    expect(written).toContain('min-release-age=4');
    expect(written).toContain('ignore-scripts=true');
    expect(written).toContain('audit-level=high');

    vi.restoreAllMocks();
  });

  it('preserves existing auth tokens in npmrc', async () => {
    const fs = mockFs({
      [paths.npmrc]: '//registry.npmjs.org/:_authToken=secret123\nfund=false\n',
    });
    const shell = mockShell({ installed: ['npm'] });
    vi.spyOn(console, 'log').mockImplementation(() => {});

    await initCommand(fs, shell, {
      dryRun: false,
      managers: ['npm'],
      config: { quarantine_days: 4, managers: ['npm'] },
    });

    const written = fs.store.get(paths.npmrc)!;
    expect(written).toContain('//registry.npmjs.org/:_authToken=secret123');
    expect(written).toContain('fund=false');
    expect(written).toContain('min-release-age=4');

    vi.restoreAllMocks();
  });

  it('skips missing managers', async () => {
    const fs = mockFs();
    const shell = mockShell({ installed: [] });
    const logs: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...args) => logs.push(args.join(' ')));

    await initCommand(fs, shell, {
      dryRun: false,
      managers: ['npm'],
      config: { quarantine_days: 4, managers: ['npm'] },
    });

    expect(fs.store.size).toBe(0);
    expect(logs.join('\n')).toContain('not installed');

    vi.restoreAllMocks();
  });

  it('dry run does not write files', async () => {
    const fs = mockFs();
    const shell = mockShell({ installed: ['npm'] });
    vi.spyOn(console, 'log').mockImplementation(() => {});

    await initCommand(fs, shell, {
      dryRun: true,
      managers: ['npm'],
      config: { quarantine_days: 4, managers: ['npm'] },
    });

    expect(fs.store.size).toBe(0);

    vi.restoreAllMocks();
  });

  it('prints instructions for per-project-only managers', async () => {
    const fs = mockFs();
    const shell = mockShell({ installed: ['yarn'] });
    const logs: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...args) => logs.push(args.join(' ')));

    await initCommand(fs, shell, {
      dryRun: false,
      managers: ['yarn'],
      config: { quarantine_days: 4, managers: ['yarn'] },
    });

    const output = logs.join('\n');
    expect(output).toContain('Per-project only');
    expect(fs.store.size).toBe(0);

    vi.restoreAllMocks();
  });
});

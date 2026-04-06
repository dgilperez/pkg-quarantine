import { describe, it, expect, vi, afterEach } from 'vitest';
import { updateCommand } from '../../src/commands/update.js';
import { mockFs, mockShell } from '../helpers.js';
import type { ShellResult } from '../../src/types.js';

describe('update command', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('age-checks outdated npm packages and skips recent ones', async () => {
    const outdatedJson = JSON.stringify({
      'new-pkg': { current: '1.0.0', latest: '2.0.0' },
    });

    // Mock registry: package published 1 day ago (should be quarantined)
    const oneDayAgo = new Date(Date.now() - 86_400_000).toISOString();
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ time: { '2.0.0': oneDayAgo } }),
    } as Response);

    const shell = mockShell({
      installed: ['npm'],
      exec: (_cmd: string, args: string[]): ShellResult => {
        if (args.includes('outdated')) return { stdout: outdatedJson, stderr: '', exitCode: 1 };
        return { stdout: '', stderr: '', exitCode: 0 };
      },
    });

    const logs: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...args) => logs.push(args.join(' ')));

    await updateCommand(mockFs(), shell, {
      dryRun: true,
      force: false,
      managers: ['npm'],
      config: { quarantine_days: 4, managers: ['npm'] },
    });

    const output = logs.join('\n');
    // Should skip the package (1 day old, quarantine is 4 days)
    expect(output).toContain('new-pkg');
    expect(output).toMatch(/0d old|1d old/); // recently published
    expect(output).not.toContain('Would install');
  });

  it('allows old packages through quarantine', async () => {
    const outdatedJson = JSON.stringify({
      'old-pkg': { current: '1.0.0', latest: '2.0.0' },
    });

    const tenDaysAgo = new Date(Date.now() - 10 * 86_400_000).toISOString();
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ time: { '2.0.0': tenDaysAgo } }),
    } as Response);

    const shell = mockShell({
      installed: ['npm'],
      exec: (_cmd: string, args: string[]): ShellResult => {
        if (args.includes('outdated')) return { stdout: outdatedJson, stderr: '', exitCode: 1 };
        return { stdout: '', stderr: '', exitCode: 0 };
      },
    });

    const logs: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...args) => logs.push(args.join(' ')));

    await updateCommand(mockFs(), shell, {
      dryRun: true,
      force: false,
      managers: ['npm'],
      config: { quarantine_days: 4, managers: ['npm'] },
    });

    const output = logs.join('\n');
    expect(output).toContain('old-pkg');
    expect(output).toContain('Would install');
  });

  it('force mode bypasses quarantine', async () => {
    const outdatedJson = JSON.stringify({
      'any-pkg': { current: '1.0.0', latest: '2.0.0' },
    });

    const shell = mockShell({
      installed: ['npm'],
      exec: (_cmd: string, args: string[]): ShellResult => {
        if (args.includes('outdated')) return { stdout: outdatedJson, stderr: '', exitCode: 1 };
        return { stdout: '', stderr: '', exitCode: 0 };
      },
    });

    const logs: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...args) => logs.push(args.join(' ')));

    await updateCommand(mockFs(), shell, {
      dryRun: true,
      force: true,
      managers: ['npm'],
      config: { quarantine_days: 4, managers: ['npm'] },
    });

    const output = logs.join('\n');
    expect(output).toContain('FORCE');
    expect(output).toContain('Would install');
  });

  it('skips missing managers', async () => {
    const shell = mockShell({ installed: [] });
    const logs: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...args) => logs.push(args.join(' ')));

    await updateCommand(mockFs(), shell, {
      dryRun: true,
      force: false,
      managers: ['npm'],
      config: { quarantine_days: 4, managers: ['npm'] },
    });

    const output = logs.join('\n');
    expect(output).toContain('not installed');
  });
});

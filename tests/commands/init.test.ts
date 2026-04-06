import { describe, it, expect, vi } from 'vitest';
import { initCommand } from '../../src/commands/init.js';
import type { FileSystem, Shell, ShellResult } from '../../src/types.js';

function mockFs(): FileSystem & { written: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    written: store,
    async readFile(path: string) { return store.get(path) ?? null; },
    async writeFile(path: string, content: string) { store.set(path, content); },
    async exists(path: string) { return store.has(path); },
    async mkdir() {},
  };
}

function mockShell(installed: string[]): Shell {
  return {
    exec(): ShellResult { return { stdout: '', stderr: '', exitCode: 0 }; },
    which(cmd: string) { return installed.includes(cmd) ? `/usr/bin/${cmd}` : null; },
  };
}

describe('init command', () => {
  it('writes config for installed managers', async () => {
    const fs = mockFs();
    const shell = mockShell(['npm']);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await initCommand(fs, shell, {
      dryRun: false,
      managers: ['npm'],
      config: { quarantine_days: 4, managers: ['npm'] },
    });

    // npm's configPath should have been written
    const npmrcContent = Array.from(fs.written.values()).find((v) => v.includes('min-release-age'));
    expect(npmrcContent).toBeDefined();
    expect(npmrcContent).toContain('min-release-age=4');

    consoleSpy.mockRestore();
  });

  it('skips missing managers', async () => {
    const fs = mockFs();
    const shell = mockShell([]);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await initCommand(fs, shell, {
      dryRun: false,
      managers: ['npm'],
      config: { quarantine_days: 4, managers: ['npm'] },
    });

    expect(fs.written.size).toBe(0);

    consoleSpy.mockRestore();
  });

  it('dry run does not write files', async () => {
    const fs = mockFs();
    const shell = mockShell(['npm']);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await initCommand(fs, shell, {
      dryRun: true,
      managers: ['npm'],
      config: { quarantine_days: 4, managers: ['npm'] },
    });

    expect(fs.written.size).toBe(0);

    consoleSpy.mockRestore();
  });
});

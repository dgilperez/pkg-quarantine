import { describe, it, expect, vi } from 'vitest';
import { auditCommand } from '../../src/commands/audit.js';
import type { FileSystem, Shell, ShellResult } from '../../src/types.js';
import { paths } from '../../src/lib/platform.js';

function mockFs(files: Record<string, string> = {}): FileSystem {
  const store = new Map(Object.entries(files));
  return {
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

describe('audit command', () => {
  it('reports ok for correctly configured npm', async () => {
    const fs = mockFs({
      [paths.npmrc]: 'min-release-age=4\nignore-scripts=true\naudit-level=high\n',
    });
    const shell = mockShell(['npm']);
    const logs: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...args) => logs.push(args.join(' ')));

    await auditCommand(fs, shell, {
      managers: ['npm'],
      config: { quarantine_days: 4, managers: ['npm'] },
    });

    const output = logs.join('\n');
    expect(output).toContain('3 passed');

    vi.restoreAllMocks();
  });

  it('reports missing for unconfigured npm', async () => {
    const fs = mockFs();
    const shell = mockShell(['npm']);
    const logs: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...args) => logs.push(args.join(' ')));

    await auditCommand(fs, shell, {
      managers: ['npm'],
      config: { quarantine_days: 4, managers: ['npm'] },
    });

    const output = logs.join('\n');
    expect(output).toContain('missing');

    vi.restoreAllMocks();
  });
});

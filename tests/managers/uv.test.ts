import { describe, it, expect } from 'vitest';
import { UvHandler } from '../../src/managers/uv.js';
import type { FileSystem, Shell, ShellResult } from '../../src/types.js';

function mockFs(files: Record<string, string> = {}): FileSystem {
  const store = new Map(Object.entries(files));
  return {
    async readFile(path: string) { return store.get(path) ?? null; },
    async writeFile(path: string, content: string) { store.set(path, content); },
    async exists(path: string) { return store.has(path); },
    async mkdir() {},
  };
}

function mockShell(): Shell {
  return {
    exec(): ShellResult { return { stdout: '', stderr: '', exitCode: 0 }; },
    which() { return '/usr/bin/uv'; },
  };
}

describe('UvHandler', () => {
  it('writes correct exclude-newer setting', async () => {
    const handler = new UvHandler(mockFs(), mockShell(), 4);
    const result = await handler.mergeConfig(true);
    expect(result.content).toContain('exclude-newer');
    expect(result.content).toContain('4 days');
  });

  it('detects and flags incorrect exclude-newer-days setting', async () => {
    const toml = 'exclude-newer-days = 4\n';
    const fs = mockFs({ [new UvHandler(mockFs(), mockShell(), 4).configPath]: toml });
    const handler = new UvHandler(fs, mockShell(), 4);
    const result = await handler.audit();

    const warnCheck = result.checks.find((c) => c.key === 'exclude-newer-days');
    expect(warnCheck).toBeDefined();
    expect(warnCheck!.status).toBe('warn');
    expect(warnCheck!.message).toContain('Invalid setting');
  });

  it('removes incorrect setting during mergeConfig', async () => {
    const toml = 'exclude-newer-days = 4\n';
    const fs = mockFs({ [new UvHandler(mockFs(), mockShell(), 4).configPath]: toml });
    const handler = new UvHandler(fs, mockShell(), 4);

    const result = await handler.mergeConfig(true);
    expect(result.content).not.toContain('exclude-newer-days');
    expect(result.content).toContain('exclude-newer');
  });
});

import { describe, it, expect } from 'vitest';
import { NpmHandler } from '../../src/managers/npm.js';
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

function mockShell(outdatedJson = '{}'): Shell {
  return {
    exec(_cmd: string, args: string[]): ShellResult {
      if (args.includes('outdated')) {
        return { stdout: outdatedJson, stderr: '', exitCode: outdatedJson === '{}' ? 0 : 1 };
      }
      return { stdout: '', stderr: '', exitCode: 0 };
    },
    which() { return '/usr/bin/npm'; },
  };
}

describe('NpmHandler', () => {
  it('returns correct desired settings', () => {
    const handler = new NpmHandler(mockFs(), mockShell(), 4);
    const settings = handler.getDesiredSettings();
    expect(settings).toHaveLength(3);
    expect(settings[0].key).toBe('min-release-age');
    expect(settings[0].value).toBe('4');
  });

  it('merges config preserving auth tokens', async () => {
    const npmrc = '//registry.npmjs.org/:_authToken=secret\nfund=false\n';
    const fs = mockFs({ [new NpmHandler(mockFs(), mockShell(), 4).configPath]: npmrc });
    const handler = new NpmHandler(fs, mockShell(), 4);

    const result = await handler.mergeConfig(true);
    expect(result.content).toContain('//registry.npmjs.org/:_authToken=secret');
    expect(result.content).toContain('min-release-age=4');
    expect(result.content).toContain('ignore-scripts=true');
    expect(result.content).toContain('fund=false');
  });

  it('reports no changes when already configured', async () => {
    const npmrc = 'min-release-age=4\nignore-scripts=true\naudit-level=high\n';
    const fs = mockFs({ [new NpmHandler(mockFs(), mockShell(), 4).configPath]: npmrc });
    const handler = new NpmHandler(fs, mockShell(), 4);

    const result = await handler.mergeConfig(true);
    expect(result.changed).toBe(false);
  });

  it('parses outdated JSON', () => {
    const outdated = JSON.stringify({
      'eslint': { current: '8.0.0', latest: '9.0.0' },
      'typescript': { current: '5.0.0', latest: '5.0.0' },
    });
    const handler = new NpmHandler(mockFs(), mockShell(outdated), 4);
    const pkgs = handler.getOutdated();
    expect(pkgs).toHaveLength(1);
    expect(pkgs[0].name).toBe('eslint');
    expect(pkgs[0].latest).toBe('9.0.0');
  });

  it('audits missing config', async () => {
    const handler = new NpmHandler(mockFs(), mockShell(), 4);
    const result = await handler.audit();
    expect(result.checks.every((c) => c.status === 'missing')).toBe(true);
  });

  it('audits correct config', async () => {
    const npmrc = 'min-release-age=4\nignore-scripts=true\naudit-level=high\n';
    const fs = mockFs({ [new NpmHandler(mockFs(), mockShell(), 4).configPath]: npmrc });
    const handler = new NpmHandler(fs, mockShell(), 4);
    const result = await handler.audit();
    expect(result.checks.every((c) => c.status === 'ok')).toBe(true);
  });

  it('audits incorrect values', async () => {
    const npmrc = 'min-release-age=1\nignore-scripts=false\n';
    const fs = mockFs({ [new NpmHandler(mockFs(), mockShell(), 4).configPath]: npmrc });
    const handler = new NpmHandler(fs, mockShell(), 4);
    const result = await handler.audit();
    expect(result.checks.filter((c) => c.status === 'warn')).toHaveLength(2);
    expect(result.checks.filter((c) => c.status === 'missing')).toHaveLength(1);
  });
});

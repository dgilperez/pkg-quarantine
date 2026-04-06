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

function mockShell(outdatedJson = '{}', npmVersion = '10.2.3'): Shell {
  return {
    exec(_cmd: string, args: string[]): ShellResult {
      if (args.includes('outdated')) {
        return { stdout: outdatedJson, stderr: '', exitCode: outdatedJson === '{}' ? 0 : 1 };
      }
      if (args.includes('--version')) {
        return { stdout: npmVersion, stderr: '', exitCode: 0 };
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
    // config checks are missing; compat check may be ok or warn
    const configChecks = result.checks.filter((c) => c.key !== 'npm-version-compat');
    expect(configChecks.every((c) => c.status === 'missing')).toBe(true);
  });

  it('audits correct config', async () => {
    const npmrc = 'min-release-age=4\nignore-scripts=true\naudit-level=high\n';
    const fs = mockFs({ [new NpmHandler(mockFs(), mockShell(), 4).configPath]: npmrc });
    const handler = new NpmHandler(fs, mockShell(), 4);
    const result = await handler.audit();
    const configChecks = result.checks.filter((c) => c.key !== 'npm-version-compat');
    expect(configChecks.every((c) => c.status === 'ok')).toBe(true);
  });

  it('audits incorrect values', async () => {
    const npmrc = 'min-release-age=1\nignore-scripts=false\n';
    const fs = mockFs({ [new NpmHandler(mockFs(), mockShell(), 4).configPath]: npmrc });
    const handler = new NpmHandler(fs, mockShell(), 4);
    const result = await handler.audit();
    const configChecks = result.checks.filter((c) => c.key !== 'npm-version-compat');
    expect(configChecks.filter((c) => c.status === 'warn')).toHaveLength(2);
    expect(configChecks.filter((c) => c.status === 'missing')).toHaveLength(1);
  });

  describe('npm version compatibility check', () => {
    it('passes for npm 10+', async () => {
      const handler = new NpmHandler(mockFs(), mockShell('{}', '10.2.3'), 4);
      const result = await handler.audit();
      const compat = result.checks.find((c) => c.key === 'npm-version-compat');
      expect(compat).toBeDefined();
      expect(compat!.status).toBe('ok');
    });

    it('warns for npm 9.x', async () => {
      const handler = new NpmHandler(mockFs(), mockShell('{}', '9.8.1'), 4);
      const result = await handler.audit();
      const compat = result.checks.find((c) => c.key === 'npm-version-compat');
      expect(compat).toBeDefined();
      expect(compat!.status).toBe('warn');
      expect(compat!.message).toContain('10');
    });

    it('warns for npm 8.x', async () => {
      const handler = new NpmHandler(mockFs(), mockShell('{}', '8.19.4'), 4);
      const result = await handler.audit();
      const compat = result.checks.find((c) => c.key === 'npm-version-compat');
      expect(compat!.status).toBe('warn');
    });

    it('warns about --before conflicts when npm version is old', async () => {
      const handler = new NpmHandler(mockFs(), mockShell('{}', '9.5.0'), 4);
      const result = await handler.audit();
      const compat = result.checks.find((c) => c.key === 'npm-version-compat');
      expect(compat!.message).toMatch(/--before|before/i);
    });

    it('handles version parse failure gracefully', async () => {
      const badShell: Shell = {
        exec(_cmd, args): ShellResult {
          if (args.includes('--version')) return { stdout: 'not-semver', stderr: '', exitCode: 0 };
          return { stdout: '{}', stderr: '', exitCode: 0 };
        },
        which() { return '/usr/bin/npm'; },
      };
      const handler = new NpmHandler(mockFs(), badShell, 4);
      const result = await handler.audit();
      const compat = result.checks.find((c) => c.key === 'npm-version-compat');
      // Unknown version — should warn, not crash
      expect(compat).toBeDefined();
      expect(compat!.status).toBe('warn');
    });

    it('skips version check when npm is not installed', async () => {
      const noNpmShell: Shell = {
        exec(): ShellResult { return { stdout: '', stderr: '', exitCode: 1 }; },
        which() { return null; },
      };
      const handler = new NpmHandler(mockFs(), noNpmShell, 4);
      const result = await handler.audit();
      const compat = result.checks.find((c) => c.key === 'npm-version-compat');
      expect(compat).toBeUndefined();
    });
  });
});

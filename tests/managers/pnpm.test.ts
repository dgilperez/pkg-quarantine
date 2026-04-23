import { describe, it, expect } from 'vitest';
import { PnpmHandler } from '../../src/managers/pnpm.js';
import { mockFs, mockShell } from '../helpers.js';
import { paths } from '../../src/lib/platform.js';

describe('PnpmHandler', () => {
  it('uses kebab-case minimum-release-age key in minutes', () => {
    const handler = new PnpmHandler(mockFs(), mockShell({ installed: ['pnpm'] }), 4);
    const settings = handler.getDesiredSettings();
    expect(settings[0].key).toBe('minimum-release-age');
    expect(settings[0].value).toBe(String(4 * 24 * 60)); // 5760
  });

  it('preserves comments in rc file during merge', async () => {
    const existing = '# my pnpm config\nminimum-release-age=1440\n';
    const fs = mockFs({ [paths.pnpmrc]: existing });
    const handler = new PnpmHandler(fs, mockShell({ installed: ['pnpm'] }), 4);
    const result = await handler.mergeConfig(true);
    expect(result.content).toContain('# my pnpm config');
    expect(result.content).toContain('minimum-release-age=5760');
  });

  it('reports no changes when already configured', async () => {
    const existing = 'minimum-release-age=5760\nignore-scripts=true\n';
    const fs = mockFs({ [paths.pnpmrc]: existing });
    const handler = new PnpmHandler(fs, mockShell({ installed: ['pnpm'] }), 4);
    const result = await handler.mergeConfig(true);
    expect(result.changed).toBe(false);
  });

  it('audits missing config', async () => {
    const handler = new PnpmHandler(mockFs(), mockShell({ installed: ['pnpm'] }), 4);
    const result = await handler.audit();
    expect(result.checks.every((c) => c.status === 'missing')).toBe(true);
  });

  it('audits correct config', async () => {
    const fs = mockFs({ [paths.pnpmrc]: 'minimum-release-age=5760\nignore-scripts=true\n' });
    const handler = new PnpmHandler(fs, mockShell({ installed: ['pnpm'] }), 4);
    const result = await handler.audit();
    expect(result.checks.every((c) => c.status === 'ok')).toBe(true);
  });

  it('flags legacy camelCase minimumReleaseAge as wrong value', async () => {
    // v0.1.3 and earlier wrote `minimumReleaseAge` — which pnpm silently
    // ignores at resolution time. Users on that path had *no* quarantine.
    // Audit must surface the mismatch so they know to re-run `init`.
    const fs = mockFs({ [paths.pnpmrc]: 'minimumReleaseAge=5760\nignore-scripts=true\n' });
    const handler = new PnpmHandler(fs, mockShell({ installed: ['pnpm'] }), 4);
    const result = await handler.audit();
    const ageCheck = result.checks.find((c) => c.key === 'minimum-release-age');
    expect(ageCheck?.status).toBe('missing');
  });

  it('parses pnpm outdated JSON (object format)', () => {
    const json = JSON.stringify({ 'typescript': { current: '5.0.0', latest: '5.5.0' } });
    const handler = new PnpmHandler(mockFs(), mockShell({
      installed: ['pnpm'],
      exec: (_cmd, args) => args.includes('outdated')
        ? { stdout: json, stderr: '', exitCode: 0 }
        : { stdout: '', stderr: '', exitCode: 0 },
    }), 4);
    const pkgs = handler.getOutdated();
    expect(pkgs).toHaveLength(1);
    expect(pkgs[0].name).toBe('typescript');
  });
});

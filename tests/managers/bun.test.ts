import { describe, it, expect } from 'vitest';
import { BunHandler } from '../../src/managers/bun.js';
import { mockFs, mockShell } from '../helpers.js';
import { paths } from '../../src/lib/platform.js';

describe('BunHandler', () => {
  it('uses seconds for minimumReleaseAge', () => {
    const handler = new BunHandler(mockFs(), mockShell({ installed: ['bun'] }), 4);
    const settings = handler.getDesiredSettings();
    expect(settings[0].value).toBe(String(4 * 86400));
  });

  it('merges into existing bunfig.toml preserving other settings', async () => {
    const existing = '[install]\nfrozenLockfile = true\n';
    const fs = mockFs({ [paths.bunfig]: existing });
    const handler = new BunHandler(fs, mockShell({ installed: ['bun'] }), 4);
    const result = await handler.mergeConfig(true);
    expect(result.content).toContain('minimumReleaseAge');
    expect(result.content).toContain('frozenLockfile');
    expect(result.changed).toBe(true);
  });

  it('audits correct config', async () => {
    const toml = '[install]\nminimumReleaseAge = 345600\nfrozenLockfile = true\n';
    const fs = mockFs({ [paths.bunfig]: toml });
    const handler = new BunHandler(fs, mockShell({ installed: ['bun'] }), 4);
    const result = await handler.audit();
    expect(result.checks.every((c) => c.status === 'ok')).toBe(true);
  });

  it('audits missing config', async () => {
    const handler = new BunHandler(mockFs(), mockShell({ installed: ['bun'] }), 4);
    const result = await handler.audit();
    expect(result.checks.every((c) => c.status === 'missing')).toBe(true);
  });

  it('flags insufficient quarantine period', async () => {
    const toml = '[install]\nminimumReleaseAge = 86400\nfrozenLockfile = true\n';
    const fs = mockFs({ [paths.bunfig]: toml });
    const handler = new BunHandler(fs, mockShell({ installed: ['bun'] }), 4);
    const result = await handler.audit();
    const ageCheck = result.checks.find((c) => c.key === 'install.minimumReleaseAge');
    expect(ageCheck?.status).toBe('warn');
  });

  it('returns empty outdated', () => {
    const handler = new BunHandler(mockFs(), mockShell({ installed: ['bun'] }), 4);
    expect(handler.getOutdated()).toEqual([]);
  });
});

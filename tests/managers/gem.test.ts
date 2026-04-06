import { describe, it, expect } from 'vitest';
import { GemHandler } from '../../src/managers/gem.js';
import { mockFs, mockShell } from '../helpers.js';
import { paths } from '../../src/lib/platform.js';

describe('GemHandler', () => {
  it('configPath points to bundleConfig, not gemrc', () => {
    const handler = new GemHandler(mockFs(), mockShell({ installed: ['gem'] }), 4);
    expect(handler.configPath).toBe(paths.bundleConfig);
  });

  it('appends trust policy to existing bundle config', async () => {
    const existing = '---\nBUNDLE_GITHUB__HTTPS: "true"\n';
    const fs = mockFs({ [paths.bundleConfig]: existing });
    const handler = new GemHandler(fs, mockShell({ installed: ['gem'] }), 4);
    const result = await handler.mergeConfig(false);
    expect(result.changed).toBe(true);
    expect(result.content).toContain('BUNDLE_GITHUB__HTTPS');
    expect(result.content).toContain('BUNDLE_TRUST___POLICY: "MediumSecurity"');
  });

  it('does not duplicate trust policy', async () => {
    const existing = '---\nBUNDLE_TRUST___POLICY: "MediumSecurity"\n';
    const fs = mockFs({ [paths.bundleConfig]: existing });
    const handler = new GemHandler(fs, mockShell({ installed: ['gem'] }), 4);
    const result = await handler.mergeConfig(false);
    expect(result.changed).toBe(false);
  });

  it('audits correct config', async () => {
    const fs = mockFs({ [paths.bundleConfig]: '---\nBUNDLE_TRUST___POLICY: "MediumSecurity"\n' });
    const handler = new GemHandler(fs, mockShell({ installed: ['gem'] }), 4);
    const result = await handler.audit();
    expect(result.checks[0].status).toBe('ok');
  });

  it('audits missing config', async () => {
    const handler = new GemHandler(mockFs(), mockShell({ installed: ['gem'] }), 4);
    const result = await handler.audit();
    expect(result.checks[0].status).toBe('missing');
  });

  it('parses gem outdated output', () => {
    const output = 'minitest (5.18.0 < 5.20.0)\nrake (13.0.6 < 13.1.0)\n';
    const handler = new GemHandler(mockFs(), mockShell({
      installed: ['gem'],
      exec: (_cmd, args) => args.includes('outdated')
        ? { stdout: output, stderr: '', exitCode: 0 }
        : { stdout: '', stderr: '', exitCode: 0 },
    }), 4);
    const pkgs = handler.getOutdated();
    expect(pkgs).toHaveLength(2);
    expect(pkgs[0].name).toBe('minitest');
    expect(pkgs[0].latest).toBe('5.20.0');
  });
});

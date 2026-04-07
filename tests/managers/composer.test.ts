import { describe, it, expect } from 'vitest';
import { ComposerHandler } from '../../src/managers/composer.js';
import { mockFs, mockShell } from '../helpers.js';
import { paths } from '../../src/lib/platform.js';

describe('ComposerHandler', () => {
  it('deep merges config preserving existing plugins', async () => {
    const existing = JSON.stringify({
      config: {
        'allow-plugins': { 'some/plugin': true },
        'process-timeout': 300,
      },
    }, null, 2) + '\n';
    const fs = mockFs({ [paths.composerConfig]: existing });
    const handler = new ComposerHandler(fs, mockShell({ installed: ['composer'] }), 4);
    const result = await handler.mergeConfig(false);
    const parsed = JSON.parse(result.content);
    // Existing plugin preserved by deep merge
    expect(parsed.config['allow-plugins']['some/plugin']).toBe(true);
    // New settings added
    expect(parsed.config['no-scripts']).toBe(true);
    expect(parsed.config['secure-http']).toBe(true);
    // Existing settings preserved
    expect(parsed.config['process-timeout']).toBe(300);
  });

  it('does NOT write audit.block-insecure (Composer 2.9+ default)', async () => {
    const handler = new ComposerHandler(mockFs(), mockShell({ installed: ['composer'] }), 4);
    const result = await handler.mergeConfig(false);
    const parsed = JSON.parse(result.content);
    // We deliberately do not touch audit.block-insecure — Composer 2.9+ has it on by default,
    // and global config.json does not reliably propagate it. See composer/composer#12611.
    expect(parsed.config.audit).toBeUndefined();
  });

  it('creates config from scratch', async () => {
    const handler = new ComposerHandler(mockFs(), mockShell({ installed: ['composer'] }), 4);
    const result = await handler.mergeConfig(false);
    const parsed = JSON.parse(result.content);
    expect(parsed.config['no-scripts']).toBe(true);
    expect(parsed.config['allow-plugins']).toEqual({});
  });

  it('audits correct config', async () => {
    const config = JSON.stringify({
      config: {
        'secure-http': true,
        'allow-plugins': {},
        'no-scripts': true,
      },
    });
    const fs = mockFs({ [paths.composerConfig]: config });
    const handler = new ComposerHandler(fs, mockShell({ installed: ['composer'] }), 4);
    const result = await handler.audit();
    expect(result.checks.every((c) => c.status === 'ok')).toBe(true);
  });

  it('audits missing config', async () => {
    const handler = new ComposerHandler(mockFs(), mockShell({ installed: ['composer'] }), 4);
    const result = await handler.audit();
    expect(result.checks.every((c) => c.status === 'missing')).toBe(true);
  });
});

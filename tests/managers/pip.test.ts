import { describe, it, expect } from 'vitest';
import { PipHandler } from '../../src/managers/pip.js';
import { mockFs, mockShell } from '../helpers.js';
import { paths } from '../../src/lib/platform.js';

describe('PipHandler', () => {
  it('preserves comments in pip.conf during merge', async () => {
    const existing = '# pip config\n[global]\n# safety\nonly-binary = :none:\n';
    const fs = mockFs({ [paths.pipConf]: existing });
    const handler = new PipHandler(fs, mockShell({ installed: ['pip3'] }), 4);
    const result = await handler.mergeConfig(true);
    expect(result.content).toContain('# pip config');
    expect(result.content).toContain('# safety');
    expect(result.content).toContain('only-binary = :all:');
  });

  it('creates [global] section when missing', async () => {
    const handler = new PipHandler(mockFs(), mockShell({ installed: ['pip3'] }), 4);
    const result = await handler.mergeConfig(true);
    expect(result.content).toContain('[global]');
    expect(result.content).toContain('only-binary = :all:');
  });

  it('audits correct config', async () => {
    const fs = mockFs({ [paths.pipConf]: '[global]\nonly-binary = :all:\n' });
    const handler = new PipHandler(fs, mockShell({ installed: ['pip3'] }), 4);
    const result = await handler.audit();
    expect(result.checks[0].status).toBe('ok');
  });

  it('audits missing config', async () => {
    const handler = new PipHandler(mockFs(), mockShell({ installed: ['pip3'] }), 4);
    const result = await handler.audit();
    expect(result.checks[0].status).toBe('missing');
  });

  it('parses pip outdated JSON', () => {
    const json = JSON.stringify([
      { name: 'requests', version: '2.28.0', latest_version: '2.31.0' },
    ]);
    const handler = new PipHandler(mockFs(), mockShell({
      installed: ['pip3'],
      exec: (_cmd, args) => args.includes('--outdated')
        ? { stdout: json, stderr: '', exitCode: 0 }
        : { stdout: '', stderr: '', exitCode: 0 },
    }), 4);
    const pkgs = handler.getOutdated();
    expect(pkgs).toHaveLength(1);
    expect(pkgs[0].name).toBe('requests');
    expect(pkgs[0].latest).toBe('2.31.0');
  });
});

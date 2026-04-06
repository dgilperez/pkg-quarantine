import { describe, it, expect } from 'vitest';
import { BrewHandler } from '../../src/managers/brew.js';
import { mockFs, mockShell } from '../helpers.js';

describe('BrewHandler', () => {
  it('mergeConfig returns info only', async () => {
    const handler = new BrewHandler(mockFs(), mockShell({ installed: ['brew'] }), 4);
    const result = await handler.mergeConfig(false);
    expect(result.changed).toBe(false);
    expect(result.content).toContain('no native quarantine');
  });

  it('audit reports ok when no third-party taps', async () => {
    const handler = new BrewHandler(mockFs(), mockShell({
      installed: ['brew'],
      exec: (_cmd, args) => {
        if (args.includes('tap')) return { stdout: 'homebrew/core\nhomebrew/cask', stderr: '', exitCode: 0 };
        return { stdout: '', stderr: '', exitCode: 0 };
      },
    }), 4);
    const result = await handler.audit();
    expect(result.checks[0].status).toBe('ok');
  });

  it('audit warns on third-party taps', async () => {
    const handler = new BrewHandler(mockFs(), mockShell({
      installed: ['brew'],
      exec: (_cmd, args) => {
        if (args.includes('tap')) return { stdout: 'homebrew/core\nsomeone/sketchy', stderr: '', exitCode: 0 };
        return { stdout: '', stderr: '', exitCode: 0 };
      },
    }), 4);
    const result = await handler.audit();
    expect(result.checks[0].status).toBe('warn');
    expect(result.checks[0].actual).toContain('someone/sketchy');
  });

  it('parses brew outdated JSON', () => {
    const json = JSON.stringify({
      formulae: [
        { name: 'git', installed_versions: ['2.43.0'], current_version: '2.44.0' },
      ],
    });
    const handler = new BrewHandler(mockFs(), mockShell({
      installed: ['brew'],
      exec: (_cmd, args) => args.includes('--json=v2')
        ? { stdout: json, stderr: '', exitCode: 0 }
        : { stdout: '', stderr: '', exitCode: 0 },
    }), 4);
    const pkgs = handler.getOutdated();
    expect(pkgs).toHaveLength(1);
    expect(pkgs[0].name).toBe('git');
    expect(pkgs[0].latest).toBe('2.44.0');
  });
});

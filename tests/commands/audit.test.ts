import { describe, it, expect, vi } from 'vitest';
import { auditCommand } from '../../src/commands/audit.js';
import { mockFs, mockShell } from '../helpers.js';
import { paths } from '../../src/lib/platform.js';

describe('audit command', () => {
  it('reports all checks as passed for correctly configured npm', async () => {
    const fs = mockFs({
      [paths.npmrc]: 'min-release-age=4\nignore-scripts=true\naudit-level=high\n',
    });
    const shell = mockShell({ installed: ['npm'] });
    const logs: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...args) => logs.push(args.join(' ')));

    await auditCommand(fs, shell, {
      managers: ['npm'],
      config: { quarantine_days: 4, managers: ['npm'] },
    });

    const output = logs.join('\n');
    expect(output).toContain('4 passed');
    // Verify specific keys are checked
    expect(output).toContain('min-release-age');
    expect(output).toContain('ignore-scripts');
    expect(output).toContain('audit-level');
    // No warnings or missing
    expect(output).not.toContain('warning');
    expect(output).not.toContain('missing');

    vi.restoreAllMocks();
  });

  it('reports missing checks for unconfigured npm', async () => {
    const fs = mockFs();
    const shell = mockShell({ installed: ['npm'] });
    const logs: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...args) => logs.push(args.join(' ')));

    await auditCommand(fs, shell, {
      managers: ['npm'],
      config: { quarantine_days: 4, managers: ['npm'] },
    });

    const output = logs.join('\n');
    expect(output).toContain('3 missing');
    expect(output).toContain('quarantine init');

    vi.restoreAllMocks();
  });

  it('reports warnings for incorrect values', async () => {
    const fs = mockFs({
      [paths.npmrc]: 'min-release-age=1\nignore-scripts=false\n',
    });
    const shell = mockShell({ installed: ['npm'] });
    const logs: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...args) => logs.push(args.join(' ')));

    await auditCommand(fs, shell, {
      managers: ['npm'],
      config: { quarantine_days: 4, managers: ['npm'] },
    });

    const output = logs.join('\n');
    expect(output).toContain('warning');

    vi.restoreAllMocks();
  });

  describe('return value (for --exit-code)', () => {
    it('returns zero counts when fully configured', async () => {
      const fs = mockFs({
        [paths.npmrc]: 'min-release-age=4\nignore-scripts=true\naudit-level=high\n',
      });
      const shell = mockShell({ installed: ['npm'] });
      vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await auditCommand(fs, shell, {
        managers: ['npm'],
        config: { quarantine_days: 4, managers: ['npm'] },
      });

      expect(result.warn).toBe(0);
      expect(result.missing).toBe(0);
      expect(result.ok).toBeGreaterThan(0);

      vi.restoreAllMocks();
    });

    it('reports missing > 0 when no .npmrc exists', async () => {
      const fs = mockFs();
      const shell = mockShell({ installed: ['npm'] });
      vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await auditCommand(fs, shell, {
        managers: ['npm'],
        config: { quarantine_days: 4, managers: ['npm'] },
      });

      expect(result.missing).toBeGreaterThan(0);

      vi.restoreAllMocks();
    });

    it('reports warn > 0 when values are wrong', async () => {
      const fs = mockFs({
        [paths.npmrc]: 'min-release-age=1\nignore-scripts=false\n',
      });
      const shell = mockShell({ installed: ['npm'] });
      vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await auditCommand(fs, shell, {
        managers: ['npm'],
        config: { quarantine_days: 4, managers: ['npm'] },
      });

      expect(result.warn).toBeGreaterThan(0);

      vi.restoreAllMocks();
    });

    it('flags warn when npm is older than 11.10.0 even if config looks right', async () => {
      const fs = mockFs({
        [paths.npmrc]: 'min-release-age=4\nignore-scripts=true\naudit-level=high\n',
      });
      const shell = mockShell({ installed: ['npm'], npmVersion: '11.5.1' });
      vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await auditCommand(fs, shell, {
        managers: ['npm'],
        config: { quarantine_days: 4, managers: ['npm'] },
      });

      // The config keys are all "ok", but the version compat check warns —
      // so a CI gate using --exit-code should still fail.
      expect(result.warn).toBeGreaterThan(0);

      vi.restoreAllMocks();
    });
  });

  it('skips managers that are not installed', async () => {
    const fs = mockFs();
    const shell = mockShell({ installed: [] });
    const logs: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...args) => logs.push(args.join(' ')));

    await auditCommand(fs, shell, {
      managers: ['npm', 'pip'],
      config: { quarantine_days: 4, managers: ['npm', 'pip'] },
    });

    const output = logs.join('\n');
    expect(output).toContain('not installed');

    vi.restoreAllMocks();
  });
});

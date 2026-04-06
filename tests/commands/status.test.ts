import { describe, it, expect, vi } from 'vitest';
import { statusCommand } from '../../src/commands/status.js';
import { mockFs, mockShell } from '../helpers.js';
import { paths } from '../../src/lib/platform.js';

describe('status command', () => {
  it('shows policy and detected managers', async () => {
    const fs = mockFs({
      [paths.npmrc]: 'min-release-age=4\nignore-scripts=true\naudit-level=high\n',
    });
    const shell = mockShell({ installed: ['npm'] });
    const logs: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...args) => logs.push(args.join(' ')));

    await statusCommand(fs, shell, { quarantine_days: 4, managers: ['npm'] });

    const output = logs.join('\n');
    expect(output).toContain('4-day');
    expect(output).toContain('npm');

    vi.restoreAllMocks();
  });

  it('shows ok status for correctly configured manager', async () => {
    const fs = mockFs({
      [paths.npmrc]: 'min-release-age=4\nignore-scripts=true\naudit-level=high\n',
    });
    const shell = mockShell({ installed: ['npm'] });
    const logs: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...args) => logs.push(args.join(' ')));

    await statusCommand(fs, shell, { quarantine_days: 4, managers: ['npm'] });

    const output = logs.join('\n');
    // Should show green check for npm
    expect(output).toContain('npm');
    expect(output).toContain('min-release-age');

    vi.restoreAllMocks();
  });
});

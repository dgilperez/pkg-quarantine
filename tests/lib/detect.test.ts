import { describe, it, expect } from 'vitest';
import { detectManagers, resolveManagers } from '../../src/lib/detect.js';
import type { Shell, ShellResult } from '../../src/types.js';

function mockShell(installed: string[]): Shell {
  return {
    exec(): ShellResult {
      return { stdout: '', stderr: '', exitCode: 0 };
    },
    which(cmd: string): string | null {
      return installed.includes(cmd) ? `/usr/bin/${cmd}` : null;
    },
  };
}

describe('detectManagers', () => {
  it('detects installed managers', () => {
    const shell = mockShell(['npm', 'pip3', 'go']);
    const result = detectManagers(shell);
    expect(result).toContain('npm');
    expect(result).toContain('pip');
    expect(result).toContain('go');
    expect(result).not.toContain('pnpm');
  });

  it('returns empty array when nothing installed', () => {
    const shell = mockShell([]);
    expect(detectManagers(shell)).toEqual([]);
  });
});

describe('resolveManagers', () => {
  it('splits requested into resolved and missing', () => {
    const shell = mockShell(['npm', 'pip3']);
    const { resolved, missing } = resolveManagers(['npm', 'pip', 'gem'], shell);
    expect(resolved).toEqual(['npm', 'pip']);
    expect(missing).toEqual(['gem']);
  });
});

import { describe, it, expect } from 'vitest';
import { HexHandler } from '../../src/managers/hex.js';
import type { FileSystem, Shell, ShellResult } from '../../src/types.js';

function mockFs(): FileSystem {
  return {
    async readFile() { return null; },
    async writeFile() {},
    async exists() { return false; },
    async mkdir() {},
  };
}

function mockShell(hasMix = true, hasMixAudit = false): Shell {
  return {
    exec(_cmd: string, args: string[]): ShellResult {
      if (args.includes('deps.audit')) {
        return hasMixAudit
          ? { stdout: '', stderr: '', exitCode: 0 }
          : { stdout: '', stderr: '** (Mix) The task "deps.audit" could not be found', exitCode: 1 };
      }
      return { stdout: '', stderr: '', exitCode: 0 };
    },
    which(cmd: string) {
      if (cmd === 'mix' && hasMix) return '/usr/bin/mix';
      return null;
    },
  };
}

describe('HexHandler', () => {
  it('reports mix_audit as missing when not installed', async () => {
    const handler = new HexHandler(mockFs(), mockShell(true, false), 4);
    const result = await handler.audit();
    expect(result.checks[0].status).toBe('warn');
    expect(result.checks[0].message).toContain('mix archive.install hex mix_audit');
  });

  it('reports mix_audit as ok when installed', async () => {
    const handler = new HexHandler(mockFs(), mockShell(true, true), 4);
    const result = await handler.audit();
    expect(result.checks[0].status).toBe('ok');
  });

  it('mergeConfig returns info only', async () => {
    const handler = new HexHandler(mockFs(), mockShell(), 4);
    const result = await handler.mergeConfig(false);
    expect(result.changed).toBe(false);
    expect(result.path).toBe('(Hex)');
  });

  it('uses mix as binary name', () => {
    const handler = new HexHandler(mockFs(), mockShell(true), 4);
    expect(handler.isInstalled()).toBe(true);
  });
});

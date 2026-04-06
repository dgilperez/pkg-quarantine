import { describe, it, expect } from 'vitest';
import { CargoHandler } from '../../src/managers/cargo.js';
import type { FileSystem, Shell, ShellResult } from '../../src/types.js';

function mockFs(): FileSystem {
  return {
    async readFile() { return null; },
    async writeFile() {},
    async exists() { return false; },
    async mkdir() {},
  };
}

function mockShell(hasCargo = true, hasCargoAudit = false): Shell {
  return {
    exec(): ShellResult { return { stdout: '', stderr: '', exitCode: 0 }; },
    which(cmd: string) {
      if (cmd === 'cargo' && hasCargo) return '/usr/bin/cargo';
      if (cmd === 'cargo-audit' && hasCargoAudit) return '/usr/bin/cargo-audit';
      return null;
    },
  };
}

describe('CargoHandler', () => {
  it('reports cargo-audit as missing when not installed', async () => {
    const handler = new CargoHandler(mockFs(), mockShell(true, false), 4);
    const result = await handler.audit();
    expect(result.checks[0].status).toBe('warn');
    expect(result.checks[0].message).toContain('cargo install cargo-audit');
  });

  it('reports cargo-audit as ok when installed', async () => {
    const handler = new CargoHandler(mockFs(), mockShell(true, true), 4);
    const result = await handler.audit();
    expect(result.checks[0].status).toBe('ok');
  });

  it('mergeConfig returns info only (no file to write)', async () => {
    const handler = new CargoHandler(mockFs(), mockShell(), 4);
    const result = await handler.mergeConfig(false);
    expect(result.changed).toBe(false);
    expect(result.path).toBe('(Cargo)');
  });

  it('is detected when cargo binary exists', () => {
    const handler = new CargoHandler(mockFs(), mockShell(true), 4);
    expect(handler.isInstalled()).toBe(true);
  });
});

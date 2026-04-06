import { describe, it, expect } from 'vitest';
import { GoHandler } from '../../src/managers/go.js';
import { mockFs, mockShell } from '../helpers.js';

describe('GoHandler', () => {
  it('mergeConfig returns info only (no file to write)', async () => {
    const handler = new GoHandler(mockFs(), mockShell({ installed: ['go'] }), 4);
    const result = await handler.mergeConfig(false);
    expect(result.changed).toBe(false);
    expect(result.content).toContain('sum.golang.org');
  });

  it('audits sumdb settings and govulncheck', async () => {
    const handler = new GoHandler(mockFs(), mockShell({
      installed: ['go'],
      exec: (_cmd, args) => {
        if (args.includes('GONOSUMDB')) return { stdout: '', stderr: '', exitCode: 0 };
        if (args.includes('GONOSUMCHECK')) return { stdout: '', stderr: '', exitCode: 0 };
        return { stdout: '', stderr: '', exitCode: 0 };
      },
    }), 4);
    const result = await handler.audit();
    const nosumdb = result.checks.find((c) => c.key === 'GONOSUMDB');
    expect(nosumdb?.status).toBe('ok');
  });

  it('warns when GONOSUMDB is set', async () => {
    const handler = new GoHandler(mockFs(), mockShell({
      installed: ['go'],
      exec: (_cmd, args) => {
        if (args.includes('GONOSUMDB')) return { stdout: 'private.corp/*', stderr: '', exitCode: 0 };
        if (args.includes('GONOSUMCHECK')) return { stdout: '', stderr: '', exitCode: 0 };
        return { stdout: '', stderr: '', exitCode: 0 };
      },
    }), 4);
    const result = await handler.audit();
    const nosumdb = result.checks.find((c) => c.key === 'GONOSUMDB');
    expect(nosumdb?.status).toBe('warn');
  });

  it('returns empty outdated', () => {
    const handler = new GoHandler(mockFs(), mockShell({ installed: ['go'] }), 4);
    expect(handler.getOutdated()).toEqual([]);
  });
});

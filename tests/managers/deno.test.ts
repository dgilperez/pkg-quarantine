import { describe, it, expect } from 'vitest';
import { DenoHandler } from '../../src/managers/deno.js';
import { mockFs, mockShell } from '../helpers.js';

describe('DenoHandler', () => {
  it('is marked as project-only', () => {
    const handler = new DenoHandler(mockFs(), mockShell({ installed: ['deno'] }), 4);
    expect(handler.projectOnly).toBe(true);
  });

  it('mergeConfig returns instructions without writing', async () => {
    const handler = new DenoHandler(mockFs(), mockShell({ installed: ['deno'] }), 4);
    const result = await handler.mergeConfig(false);
    expect(result.changed).toBe(false);
    expect(result.content).toContain('minimumDependencyAge');
    expect(result.path).toContain('per-project');
  });

  it('audit returns warn for per-project setting', async () => {
    const handler = new DenoHandler(mockFs(), mockShell({ installed: ['deno'] }), 4);
    const result = await handler.audit();
    expect(result.checks[0].status).toBe('warn');
  });
});

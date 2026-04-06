import { describe, it, expect } from 'vitest';
import { YarnHandler } from '../../src/managers/yarn.js';
import { mockFs, mockShell } from '../helpers.js';

describe('YarnHandler', () => {
  it('is marked as project-only', () => {
    const handler = new YarnHandler(mockFs(), mockShell({ installed: ['yarn'] }), 4);
    expect(handler.projectOnly).toBe(true);
  });

  it('mergeConfig returns instructions without writing', async () => {
    const handler = new YarnHandler(mockFs(), mockShell({ installed: ['yarn'] }), 4);
    const result = await handler.mergeConfig(false);
    expect(result.changed).toBe(false);
    expect(result.content).toContain('npmMinimalAgeGate');
    expect(result.path).toContain('per-project');
  });

  it('audit returns warn for per-project setting', async () => {
    const handler = new YarnHandler(mockFs(), mockShell({ installed: ['yarn'] }), 4);
    const result = await handler.audit();
    expect(result.checks[0].status).toBe('warn');
  });
});

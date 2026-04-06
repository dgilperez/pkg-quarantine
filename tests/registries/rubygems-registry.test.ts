import { describe, it, expect, vi, afterEach } from 'vitest';
import { getGemPublishDate } from '../../src/registries/rubygems-registry.js';

describe('RubyGems registry client', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns publish date for matching version', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ([
        { number: '1.0.0', created_at: '2025-01-01T00:00:00.000Z' },
        { number: '2.0.0', created_at: '2026-03-01T00:00:00.000Z' },
      ]),
    } as Response);

    const date = await getGemPublishDate('rails', '2.0.0');
    expect(date).toBeInstanceOf(Date);
    expect(date!.toISOString()).toBe('2026-03-01T00:00:00.000Z');
  });

  it('returns null for non-existent version', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ([{ number: '1.0.0', created_at: '2025-01-01T00:00:00.000Z' }]),
    } as Response);

    expect(await getGemPublishDate('rails', '9.9.9')).toBeNull();
  });

  it('returns null on HTTP error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: false, status: 404 } as Response);
    expect(await getGemPublishDate('nonexistent', '1.0.0')).toBeNull();
  });
});

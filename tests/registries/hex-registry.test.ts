import { describe, it, expect, vi, afterEach } from 'vitest';
import { getHexPublishDate } from '../../src/registries/hex-registry.js';

describe('hex.pm registry client', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns publish date for matching version', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        releases: [
          { version: '1.0.0', inserted_at: '2025-06-01T00:00:00.000Z' },
          { version: '2.0.0', inserted_at: '2026-03-01T12:00:00.000Z' },
        ],
      }),
    } as Response);

    const date = await getHexPublishDate('phoenix', '2.0.0');
    expect(date).toBeInstanceOf(Date);
    expect(date!.toISOString()).toBe('2026-03-01T12:00:00.000Z');
  });

  it('returns null for non-existent version', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ releases: [{ version: '1.0.0', inserted_at: '2025-01-01T00:00:00.000Z' }] }),
    } as Response);

    expect(await getHexPublishDate('phoenix', '9.9.9')).toBeNull();
  });

  it('returns null on 404', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: false, status: 404 } as Response);
    expect(await getHexPublishDate('nonexistent', '1.0.0')).toBeNull();
  });
});

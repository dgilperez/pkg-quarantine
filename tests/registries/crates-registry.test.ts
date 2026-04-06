import { describe, it, expect, vi, afterEach } from 'vitest';
import { getCratePublishDate } from '../../src/registries/crates-registry.js';

describe('crates.io registry client', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns publish date for valid crate version', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        version: { created_at: '2026-02-15T08:00:00.000Z' },
      }),
    } as Response);

    const date = await getCratePublishDate('serde', '1.0.200');
    expect(date).toBeInstanceOf(Date);
    expect(date!.toISOString()).toBe('2026-02-15T08:00:00.000Z');
  });

  it('returns null on missing version data', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    } as Response);

    expect(await getCratePublishDate('serde', '1.0.0')).toBeNull();
  });

  it('returns null on network error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('timeout'));
    expect(await getCratePublishDate('serde', '1.0.0')).toBeNull();
  });
});

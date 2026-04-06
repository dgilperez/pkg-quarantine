import { describe, it, expect, vi, afterEach } from 'vitest';
import { getPypiPublishDate } from '../../src/registries/pypi-registry.js';

describe('PyPI registry client', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns publish date for valid package', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        urls: [{ upload_time_iso_8601: '2026-03-01T10:00:00.000Z' }],
      }),
    } as Response);

    const date = await getPypiPublishDate('requests', '2.31.0');
    expect(date).toBeInstanceOf(Date);
    expect(date!.toISOString()).toBe('2026-03-01T10:00:00.000Z');
  });

  it('returns null when urls array is empty', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ urls: [] }),
    } as Response);

    const date = await getPypiPublishDate('test-pkg', '1.0.0');
    expect(date).toBeNull();
  });

  it('returns null on 404', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as Response);

    const date = await getPypiPublishDate('nonexistent', '1.0.0');
    expect(date).toBeNull();
  });

  it('returns null on network error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('timeout'));
    expect(await getPypiPublishDate('test', '1.0.0')).toBeNull();
  });
});

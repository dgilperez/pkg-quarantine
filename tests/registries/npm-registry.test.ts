import { describe, it, expect, vi, afterEach } from 'vitest';
import { getNpmPublishDate, getNpmVersionTimes } from '../../src/registries/npm-registry.js';

describe('npm registry client', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns publish date for valid package version', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        time: {
          '1.0.0': '2026-01-01T00:00:00.000Z',
          '1.1.0': '2026-03-15T12:00:00.000Z',
        },
      }),
    } as Response);

    const date = await getNpmPublishDate('test-pkg', '1.1.0');
    expect(date).toBeInstanceOf(Date);
    expect(date!.toISOString()).toBe('2026-03-15T12:00:00.000Z');
  });

  it('returns null for non-existent version', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ time: { '1.0.0': '2026-01-01T00:00:00.000Z' } }),
    } as Response);

    const date = await getNpmPublishDate('test-pkg', '9.9.9');
    expect(date).toBeNull();
  });

  it('returns null on HTTP error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as Response);

    const date = await getNpmPublishDate('nonexistent', '1.0.0');
    expect(date).toBeNull();
  });

  it('returns null on network error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('network error'));

    const date = await getNpmPublishDate('test-pkg', '1.0.0');
    expect(date).toBeNull();
  });

  it('getNpmVersionTimes returns map of all versions', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        time: {
          created: '2025-01-01T00:00:00.000Z',
          modified: '2026-04-01T00:00:00.000Z',
          '1.0.0': '2025-06-01T00:00:00.000Z',
          '2.0.0': '2026-01-01T00:00:00.000Z',
        },
      }),
    } as Response);

    const times = await getNpmVersionTimes('test-pkg');
    expect(times).toBeInstanceOf(Map);
    expect(times!.size).toBe(2); // excludes created/modified
    expect(times!.has('1.0.0')).toBe(true);
    expect(times!.has('2.0.0')).toBe(true);
  });
});

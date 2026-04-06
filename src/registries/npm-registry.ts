/**
 * npm registry API client.
 * Covers: npm, pnpm, bun, yarn, deno (all use the npm registry).
 */

const NPM_REGISTRY = 'https://registry.npmjs.org';

/** Get the publish date for a specific package version */
export async function getNpmPublishDate(
  packageName: string,
  version: string,
): Promise<Date | null> {
  try {
    const url = `${NPM_REGISTRY}/${encodeURIComponent(packageName)}`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) return null;

    const data = (await res.json()) as { time?: Record<string, string> };
    const timestamp = data.time?.[version];
    if (!timestamp) return null;

    return new Date(timestamp);
  } catch {
    return null;
  }
}

/** Get all version publish dates for a package (for bulk checks) */
export async function getNpmVersionTimes(
  packageName: string,
): Promise<Map<string, Date> | null> {
  try {
    // Use abbreviated metadata endpoint for speed
    const url = `${NPM_REGISTRY}/${encodeURIComponent(packageName)}`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) return null;

    const data = (await res.json()) as { time?: Record<string, string> };
    if (!data.time) return null;

    const times = new Map<string, Date>();
    for (const [version, timestamp] of Object.entries(data.time)) {
      if (version === 'created' || version === 'modified') continue;
      times.set(version, new Date(timestamp));
    }

    return times;
  } catch {
    return null;
  }
}

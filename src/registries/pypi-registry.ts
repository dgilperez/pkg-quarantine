/**
 * PyPI registry API client.
 * Covers: pip, uv.
 */

const PYPI_API = 'https://pypi.org';

/** Get the publish date for a specific package version */
export async function getPypiPublishDate(
  packageName: string,
  version: string,
): Promise<Date | null> {
  try {
    const url = `${PYPI_API}/pypi/${encodeURIComponent(packageName)}/${version}/json`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) return null;

    const data = (await res.json()) as {
      urls?: Array<{ upload_time_iso_8601?: string }>;
    };

    const uploadTime = data.urls?.[0]?.upload_time_iso_8601;
    if (!uploadTime) return null;

    return new Date(uploadTime);
  } catch {
    return null;
  }
}

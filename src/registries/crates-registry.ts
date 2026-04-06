/**
 * crates.io registry API client.
 * Covers: cargo (Rust).
 */

const CRATES_API = 'https://crates.io/api/v1';

/** Get the publish date for a specific crate version */
export async function getCratePublishDate(
  crateName: string,
  version: string,
): Promise<Date | null> {
  try {
    const url = `${CRATES_API}/crates/${encodeURIComponent(crateName)}/${version}`;
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'pkg-quarantine (https://github.com/dgilperez/pkg-quarantine)',
      },
    });

    if (!res.ok) return null;

    const data = (await res.json()) as {
      version?: { created_at?: string };
    };

    const createdAt = data.version?.created_at;
    if (!createdAt) return null;

    return new Date(createdAt);
  } catch {
    return null;
  }
}

/**
 * RubyGems registry API client.
 * Covers: gem.
 */

const RUBYGEMS_API = 'https://rubygems.org';

/** Get the publish date for a specific gem version */
export async function getGemPublishDate(
  gemName: string,
  version: string,
): Promise<Date | null> {
  try {
    const url = `${RUBYGEMS_API}/api/v1/versions/${encodeURIComponent(gemName)}.json`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) return null;

    const versions = (await res.json()) as Array<{
      number: string;
      created_at: string;
    }>;

    const match = versions.find((v) => v.number === version);
    if (!match) return null;

    return new Date(match.created_at);
  } catch {
    return null;
  }
}

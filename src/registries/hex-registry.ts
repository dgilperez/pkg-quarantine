/**
 * hex.pm registry API client.
 * Covers: hex (Elixir/Erlang).
 */

const HEX_API = 'https://hex.pm/api';

/** Get the publish date for a specific hex package version */
export async function getHexPublishDate(
  packageName: string,
  version: string,
): Promise<Date | null> {
  try {
    const url = `${HEX_API}/packages/${encodeURIComponent(packageName)}`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) return null;

    const data = (await res.json()) as {
      releases?: Array<{ version: string; inserted_at?: string }>;
    };

    const release = data.releases?.find((r) => r.version === version);
    if (!release?.inserted_at) return null;

    return new Date(release.inserted_at);
  } catch {
    return null;
  }
}

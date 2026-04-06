/**
 * Custom .npmrc parser.
 *
 * CRITICAL: Lines starting with `//` are scoped registry entries (NOT comments).
 * They contain auth tokens and must NEVER be modified or removed.
 * Only lines starting with `#` are actual comments.
 */

export interface ParsedNpmrc {
  /** All lines in order, for lossless roundtripping */
  lines: string[];
  /** Parsed key=value settings (excludes scoped registry lines and comments) */
  settings: Map<string, string>;
  /** Line indices that are settings (for in-place updates) */
  settingIndices: Map<string, number>;
}

/** Parse an .npmrc file content into structured data */
export function parseNpmrc(content: string): ParsedNpmrc {
  const lines = content.endsWith('\n')
    ? content.slice(0, -1).split('\n')
    : content.split('\n');

  const settings = new Map<string, string>();
  const settingIndices = new Map<string, number>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip blank lines
    if (line.trim() === '') continue;

    // Skip comments (# prefix)
    if (line.startsWith('#')) continue;

    // Skip scoped registry lines (// prefix) — these hold auth tokens
    if (line.startsWith('//')) continue;

    // Parse key=value
    const eqIdx = line.indexOf('=');
    if (eqIdx !== -1) {
      const key = line.slice(0, eqIdx);
      const value = line.slice(eqIdx + 1);
      settings.set(key, value);
      settingIndices.set(key, i);
    }
  }

  return { lines, settings, settingIndices };
}

/** Serialize a ParsedNpmrc back to string, preserving all original lines */
export function serializeNpmrc(parsed: ParsedNpmrc): string {
  return parsed.lines.join('\n') + '\n';
}

/** Merge new settings into existing .npmrc content, preserving everything else */
export function mergeNpmrc(
  existing: string,
  newSettings: Record<string, string>,
): string {
  const parsed = parseNpmrc(existing);

  for (const [key, value] of Object.entries(newSettings)) {
    const existingIdx = parsed.settingIndices.get(key);
    if (existingIdx !== undefined) {
      // Update in-place
      parsed.lines[existingIdx] = `${key}=${value}`;
    } else {
      // Append new setting
      parsed.lines.push(`${key}=${value}`);
    }
    parsed.settings.set(key, value);
  }

  return serializeNpmrc(parsed);
}

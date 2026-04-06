/**
 * Generic config file parsers — INI, JSON deep merge.
 * TOML is handled by @iarna/toml for read, manual for simple writes.
 *
 * All parsers are LINE-PRESERVING: comments, blank lines, and ordering
 * survive a parse → merge → serialize roundtrip.
 */

// ---------------------------------------------------------------------------
// Simple key=value INI (pnpm rc style)
// ---------------------------------------------------------------------------

export interface ParsedIni {
  /** All lines in order, for lossless roundtripping */
  lines: string[];
  /** Parsed key=value settings */
  settings: Map<string, string>;
  /** Line indices that are settings (for in-place updates) */
  settingIndices: Map<string, number>;
}

/** Parse a simple key=value INI file, preserving all lines */
export function parseIni(content: string): ParsedIni {
  if (!content) return { lines: [], settings: new Map(), settingIndices: new Map() };

  const lines = content.endsWith('\n')
    ? content.slice(0, -1).split('\n')
    : content.split('\n');

  const settings = new Map<string, string>();
  const settingIndices = new Map<string, number>();

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) continue;
    if (trimmed.startsWith('[')) continue;

    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      settings.set(key, value);
      settingIndices.set(key, i);
    }
  }

  return { lines, settings, settingIndices };
}

/** Serialize a ParsedIni back to string, preserving all original lines */
export function serializeIni(parsed: ParsedIni): string {
  if (parsed.lines.length === 0) return '';
  return parsed.lines.join('\n') + '\n';
}

/** Merge new settings into existing INI content, preserving comments and ordering */
export function mergeIni(
  existing: string,
  newSettings: Record<string, string>,
): string {
  const parsed = parseIni(existing);

  for (const [key, value] of Object.entries(newSettings)) {
    const existingIdx = parsed.settingIndices.get(key);
    if (existingIdx !== undefined) {
      parsed.lines[existingIdx] = `${key}=${value}`;
    } else {
      parsed.lines.push(`${key}=${value}`);
    }
    parsed.settings.set(key, value);
  }

  return serializeIni(parsed);
}

// ---------------------------------------------------------------------------
// Sectioned INI (pip.conf style)
// ---------------------------------------------------------------------------

export interface ParsedPipConf {
  /** All lines in order, for lossless roundtripping */
  lines: string[];
  /** section name → key → { value, lineIndex } */
  sections: Map<string, Map<string, { value: string; lineIndex: number }>>;
}

/** Parse a pip.conf-style sectioned INI file, preserving all lines */
export function parsePipConf(content: string): ParsedPipConf {
  if (!content) {
    return { lines: [], sections: new Map([['global', new Map()]]) };
  }

  const lines = content.endsWith('\n')
    ? content.slice(0, -1).split('\n')
    : content.split('\n');

  const sections = new Map<string, Map<string, { value: string; lineIndex: number }>>();
  let currentSection = 'global';
  sections.set(currentSection, new Map());

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) continue;

    const sectionMatch = trimmed.match(/^\[(.+)]$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      if (!sections.has(currentSection)) sections.set(currentSection, new Map());
      continue;
    }

    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      sections.get(currentSection)!.set(key, { value, lineIndex: i });
    }
  }

  return { lines, sections };
}

/** Serialize a ParsedPipConf back to string, preserving all original lines */
export function serializePipConf(parsed: ParsedPipConf): string {
  if (parsed.lines.length === 0) return '';
  return parsed.lines.join('\n') + '\n';
}

/** Merge settings into a specific section of a pip.conf, preserving everything */
export function mergePipConf(
  existing: string,
  section: string,
  newSettings: Record<string, string>,
): string {
  const parsed = parsePipConf(existing);

  const sectionHeaderExists = parsed.lines.some((l) => l.trim() === `[${section}]`);

  if (!parsed.sections.has(section) || !sectionHeaderExists) {
    // Append new section header (section may exist in map but not in lines for empty content)
    if (parsed.lines.length > 0) parsed.lines.push('');
    parsed.lines.push(`[${section}]`);
    if (!parsed.sections.has(section)) parsed.sections.set(section, new Map());
  }

  const sectionMap = parsed.sections.get(section)!;

  for (const [key, value] of Object.entries(newSettings)) {
    const entry = sectionMap.get(key);
    if (entry) {
      parsed.lines[entry.lineIndex] = `${key} = ${value}`;
    } else {
      // Find the last line of this section to append after
      const sectionLineIdx = parsed.lines.findIndex((l) => l.trim() === `[${section}]`);
      let insertAt: number;
      if (sectionLineIdx === -1) {
        insertAt = parsed.lines.length;
      } else {
        // Find next section header or end of file
        insertAt = sectionLineIdx + 1;
        while (insertAt < parsed.lines.length && !parsed.lines[insertAt].trim().startsWith('[')) {
          insertAt++;
        }
      }
      parsed.lines.splice(insertAt, 0, `${key} = ${value}`);
      // Re-index since we spliced — update all lineIndex values after insertAt
      for (const [, secMap] of parsed.sections) {
        for (const [, entry] of secMap) {
          if (entry.lineIndex >= insertAt) entry.lineIndex++;
        }
      }
      sectionMap.set(key, { value, lineIndex: insertAt });
    }
  }

  return serializePipConf(parsed);
}

// ---------------------------------------------------------------------------
// JSON deep merge
// ---------------------------------------------------------------------------

/** Deep merge two JSON-like objects. Does not mutate inputs. */
export function mergeJson<T extends Record<string, unknown>>(base: T, overlay: Partial<T>): T {
  const result = { ...base };

  for (const key of Object.keys(overlay) as (keyof T)[]) {
    const baseVal = base[key];
    const overlayVal = overlay[key];

    if (
      typeof baseVal === 'object' && baseVal !== null && !Array.isArray(baseVal) &&
      typeof overlayVal === 'object' && overlayVal !== null && !Array.isArray(overlayVal)
    ) {
      result[key] = mergeJson(
        baseVal as Record<string, unknown>,
        overlayVal as Record<string, unknown>,
      ) as T[keyof T];
    } else {
      result[key] = overlayVal as T[keyof T];
    }
  }

  return result;
}

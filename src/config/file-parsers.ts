/**
 * Generic config file parsers — INI, JSON deep merge.
 * TOML is handled by @iarna/toml for read, manual for simple writes.
 */

/** Parse simple key=value INI (pnpm rc, pip.conf flat sections) */
export function parseIni(content: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!content) return map;

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) continue;
    // Skip section headers like [global]
    if (trimmed.startsWith('[')) continue;

    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      map.set(trimmed.slice(0, eqIdx).trim(), trimmed.slice(eqIdx + 1).trim());
    }
  }

  return map;
}

/** Serialize a Map back to key=value INI format */
export function serializeIni(map: Map<string, string>): string {
  const lines: string[] = [];
  for (const [key, value] of map) {
    lines.push(`${key}=${value}`);
  }
  return lines.join('\n') + '\n';
}

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

/**
 * Parse a pip.conf style INI with sections.
 * Returns a map of section -> key -> value.
 */
export function parsePipConf(content: string): Map<string, Map<string, string>> {
  const sections = new Map<string, Map<string, string>>();
  let currentSection = 'global';
  sections.set(currentSection, new Map());

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
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
      sections.get(currentSection)!.set(key, value);
    }
  }

  return sections;
}

/** Serialize sectioned INI back to string */
export function serializePipConf(sections: Map<string, Map<string, string>>): string {
  const parts: string[] = [];
  for (const [section, entries] of sections) {
    parts.push(`[${section}]`);
    for (const [key, value] of entries) {
      parts.push(`${key} = ${value}`);
    }
    parts.push('');
  }
  return parts.join('\n');
}

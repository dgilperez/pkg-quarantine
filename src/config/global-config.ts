import TOML from '@iarna/toml';
import type { QuarantineConfig, ManagerName } from '../types.js';
import { DEFAULT_CONFIG } from '../types.js';

/** Parse the global quarantine config from TOML string */
export function parseQuarantineConfig(content: string | null): QuarantineConfig {
  if (!content?.trim()) return { ...DEFAULT_CONFIG };

  try {
    const parsed = TOML.parse(content);
    return {
      quarantine_days:
        typeof parsed['quarantine_days'] === 'number'
          ? parsed['quarantine_days']
          : DEFAULT_CONFIG.quarantine_days,
      managers:
        Array.isArray(parsed['managers'])
          ? (parsed['managers'] as ManagerName[])
          : [...DEFAULT_CONFIG.managers],
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

/** Serialize quarantine config to TOML string */
export function serializeQuarantineConfig(config: QuarantineConfig): string {
  const managersStr = config.managers.map((m) => `"${m}"`).join(',');
  return `quarantine_days = ${config.quarantine_days}\nmanagers = [${managersStr}]\n`;
}

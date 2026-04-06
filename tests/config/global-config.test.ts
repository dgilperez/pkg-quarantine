import { describe, it, expect } from 'vitest';
import { parseQuarantineConfig, serializeQuarantineConfig } from '../../src/config/global-config.js';
import { DEFAULT_CONFIG } from '../../src/types.js';

describe('global quarantine config', () => {
  it('parses valid TOML config', () => {
    const toml = 'quarantine_days = 7\nmanagers = ["npm", "pip"]\n';
    const result = parseQuarantineConfig(toml);
    expect(result.quarantine_days).toBe(7);
    expect(result.managers).toEqual(['npm', 'pip']);
  });

  it('returns defaults for empty/null input', () => {
    expect(parseQuarantineConfig(null)).toEqual(DEFAULT_CONFIG);
    expect(parseQuarantineConfig('')).toEqual(DEFAULT_CONFIG);
  });

  it('fills missing fields with defaults', () => {
    const toml = 'quarantine_days = 5\n';
    const result = parseQuarantineConfig(toml);
    expect(result.quarantine_days).toBe(5);
    expect(result.managers).toEqual(DEFAULT_CONFIG.managers);
  });

  it('serializes config to TOML', () => {
    const config = { quarantine_days: 4, managers: ['npm' as const, 'pip' as const] };
    const output = serializeQuarantineConfig(config);
    expect(output).toContain('quarantine_days = 4');
    expect(output).toContain('managers = ["npm","pip"]');
  });
});

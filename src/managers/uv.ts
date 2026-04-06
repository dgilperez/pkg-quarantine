import TOML from '@iarna/toml';
import { ManagerHandler } from './base.js';
import { paths } from '../lib/platform.js';
import type { DesiredSetting, AuditCheck, OutdatedPackage } from '../types.js';

/**
 * uv (Python) handler.
 * IMPORTANT: The correct setting is `exclude-newer = "N days"`, NOT `exclude-newer-days`.
 */
export class UvHandler extends ManagerHandler {
  readonly name = 'uv' as const;
  readonly displayName = 'uv';
  readonly configPath = paths.uvToml;

  getDesiredSettings(): DesiredSetting[] {
    return [
      {
        key: 'exclude-newer',
        value: `${this.quarantineDays} days`,
        description: `Exclude packages published in the last ${this.quarantineDays} days`,
      },
    ];
  }

  async mergeConfig(dryRun: boolean): Promise<{ path: string; content: string; changed: boolean }> {
    const existing = (await this.fs.readFile(this.configPath)) ?? '';
    let parsed: Record<string, unknown> = {};
    if (existing) {
      try {
        parsed = TOML.parse(existing) as Record<string, unknown>;
      } catch { /* start fresh */ }
    }

    // Remove the incorrect setting if present
    delete parsed['exclude-newer-days'];

    // Set the correct setting
    parsed['exclude-newer'] = `${this.quarantineDays} days`;

    const merged = TOML.stringify(parsed as TOML.JsonMap);
    const changed = merged !== existing;

    if (!dryRun && changed) {
      await this.fs.writeFile(this.configPath, merged);
    }

    return { path: this.configPath, content: merged, changed };
  }

  getOutdated(): OutdatedPackage[] {
    // uv manages project deps, not global — no global outdated
    return [];
  }

  protected auditConfig(content: string | null): AuditCheck[] {
    if (!content) {
      return [{
        key: 'exclude-newer', expected: `${this.quarantineDays} days`, actual: null,
        status: 'missing', message: `${this.configPath} not found`,
      }];
    }

    try {
      const parsed = TOML.parse(content) as Record<string, unknown>;
      const checks: AuditCheck[] = [];

      // Check for incorrect setting
      if ('exclude-newer-days' in parsed) {
        checks.push({
          key: 'exclude-newer-days',
          expected: '(should not exist)',
          actual: String(parsed['exclude-newer-days']),
          status: 'warn',
          message: 'Invalid setting — use `exclude-newer` instead',
        });
      }

      const actual = parsed['exclude-newer'] != null ? String(parsed['exclude-newer']) : null;
      checks.push({
        key: 'exclude-newer',
        expected: `${this.quarantineDays} days`,
        actual,
        status: actual === `${this.quarantineDays} days` ? 'ok' : actual ? 'warn' : 'missing',
      });

      return checks;
    } catch {
      return [{
        key: 'exclude-newer', expected: `${this.quarantineDays} days`, actual: null,
        status: 'missing', message: 'Could not parse uv.toml',
      }];
    }
  }
}

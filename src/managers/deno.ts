import { ManagerHandler } from './base.js';
import type { DesiredSetting, AuditCheck, OutdatedPackage } from '../types.js';

/**
 * Deno handler.
 * Quarantine is per-project only via deno.json `minimumDependencyAge`.
 */
export class DenoHandler extends ManagerHandler {
  readonly name = 'deno' as const;
  readonly displayName = 'Deno';
  readonly configPath = 'deno.json';
  readonly projectOnly = true;

  getDesiredSettings(): DesiredSetting[] {
    return [
      {
        key: 'minimumDependencyAge',
        value: `${this.quarantineDays}d`,
        description: `Block dependencies published less than ${this.quarantineDays} days ago`,
      },
    ];
  }

  async mergeConfig(_dryRun: boolean): Promise<{ path: string; content: string; changed: boolean }> {
    const instruction = [
      '// Add to your project deno.json:',
      `"minimumDependencyAge": "${this.quarantineDays}d"`,
      '',
    ].join('\n');

    return { path: 'deno.json (per-project)', content: instruction, changed: false };
  }

  getOutdated(): OutdatedPackage[] {
    return [];
  }

  protected auditConfig(_content: string | null): AuditCheck[] {
    return [
      {
        key: 'minimumDependencyAge',
        expected: `${this.quarantineDays}d`,
        actual: null,
        status: 'warn',
        message: 'Per-project only — check each project\'s deno.json',
      },
    ];
  }
}

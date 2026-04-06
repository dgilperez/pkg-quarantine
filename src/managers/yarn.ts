import { ManagerHandler } from './base.js';
import { paths } from '../lib/platform.js';
import type { DesiredSetting, AuditCheck, OutdatedPackage } from '../types.js';

/**
 * Yarn Berry (v2+) handler.
 * Quarantine is per-project only via .yarnrc.yml `npmMinimalAgeGate`.
 */
export class YarnHandler extends ManagerHandler {
  readonly name = 'yarn' as const;
  readonly displayName = 'Yarn';
  readonly configPath = paths.yarnrc;
  readonly projectOnly = true;

  getDesiredSettings(): DesiredSetting[] {
    return [
      {
        key: 'npmMinimalAgeGate',
        value: `${this.quarantineDays}d`,
        description: `Block packages published less than ${this.quarantineDays} days ago`,
      },
    ];
  }

  async mergeConfig(_dryRun: boolean): Promise<{ path: string; content: string; changed: boolean }> {
    // Yarn quarantine is per-project — we can't write a global config
    const instruction = [
      '# Add to your project .yarnrc.yml:',
      `npmMinimalAgeGate: "${this.quarantineDays}d"`,
      '',
    ].join('\n');

    return { path: '.yarnrc.yml (per-project)', content: instruction, changed: false };
  }

  getOutdated(): OutdatedPackage[] {
    // Yarn global outdated not applicable for quarantine
    return [];
  }

  protected auditConfig(_content: string | null): AuditCheck[] {
    return [
      {
        key: 'npmMinimalAgeGate',
        expected: `${this.quarantineDays}d`,
        actual: null,
        status: 'warn',
        message: 'Per-project only — check each project\'s .yarnrc.yml',
      },
    ];
  }
}

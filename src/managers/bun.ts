import TOML from '@iarna/toml';
import { ManagerHandler } from './base.js';
import { paths } from '../lib/platform.js';
import type { DesiredSetting, AuditCheck, OutdatedPackage } from '../types.js';

export class BunHandler extends ManagerHandler {
  readonly name = 'bun' as const;
  readonly displayName = 'Bun';
  readonly configPath = paths.bunfig;

  /** bun uses seconds for minimumReleaseAge */
  private get quarantineSeconds(): number {
    return this.quarantineDays * 86400;
  }

  getDesiredSettings(): DesiredSetting[] {
    return [
      {
        key: 'install.minimumReleaseAge',
        value: String(this.quarantineSeconds),
        description: `Block packages published less than ${this.quarantineDays} days ago (${this.quarantineSeconds} seconds)`,
      },
      {
        key: 'install.frozenLockfile',
        value: 'true',
        description: 'Prevent lockfile modifications',
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

    const install = (parsed['install'] ?? {}) as Record<string, unknown>;
    install['minimumReleaseAge'] = this.quarantineSeconds;
    install['frozenLockfile'] = true;
    parsed['install'] = install;

    const merged = TOML.stringify(parsed as TOML.JsonMap);
    const changed = merged !== existing;

    if (!dryRun && changed) {
      await this.fs.writeFile(this.configPath, merged);
    }

    return { path: this.configPath, content: merged, changed };
  }

  getOutdated(): OutdatedPackage[] {
    // Bun doesn't have a global outdated command yet
    return [];
  }

  protected auditConfig(content: string | null): AuditCheck[] {
    if (!content) {
      return this.getDesiredSettings().map((s) => ({
        key: s.key, expected: s.value, actual: null, status: 'missing' as const,
        message: `${this.configPath} not found`,
      }));
    }

    try {
      const parsed = TOML.parse(content) as Record<string, unknown>;
      const install = (parsed['install'] ?? {}) as Record<string, unknown>;

      return [
        {
          key: 'install.minimumReleaseAge',
          expected: String(this.quarantineSeconds),
          actual: install['minimumReleaseAge'] != null ? String(install['minimumReleaseAge']) : null,
          status:
            install['minimumReleaseAge'] != null &&
            Number(install['minimumReleaseAge']) >= this.quarantineSeconds
              ? 'ok' : install['minimumReleaseAge'] != null ? 'warn' : 'missing',
        },
        {
          key: 'install.frozenLockfile',
          expected: 'true',
          actual: install['frozenLockfile'] != null ? String(install['frozenLockfile']) : null,
          status: install['frozenLockfile'] === true ? 'ok' : install['frozenLockfile'] != null ? 'warn' : 'missing',
        },
      ];
    } catch {
      return this.getDesiredSettings().map((s) => ({
        key: s.key, expected: s.value, actual: null, status: 'missing' as const,
        message: 'Could not parse bunfig.toml',
      }));
    }
  }
}

import { ManagerHandler } from './base.js';
import type { DesiredSetting, AuditCheck, OutdatedPackage } from '../types.js';

/**
 * Homebrew handler.
 * No native quarantine — we warn about third-party taps.
 */
export class BrewHandler extends ManagerHandler {
  readonly name = 'brew' as const;
  readonly displayName = 'Homebrew';
  readonly configPath = ''; // No config file to write

  getDesiredSettings(): DesiredSetting[] {
    return [
      { key: 'third-party-taps', value: 'none', description: 'Avoid unreviewed third-party taps' },
    ];
  }

  async mergeConfig(_dryRun: boolean): Promise<{ path: string; content: string; changed: boolean }> {
    const info = [
      'Homebrew has no native quarantine mechanism.',
      'Best practice: avoid third-party taps from untrusted sources.',
      'Use `quarantine audit brew` to check for third-party taps.',
    ].join('\n');

    return { path: '(Homebrew)', content: info, changed: false };
  }

  getOutdated(): OutdatedPackage[] {
    const result = this.shell.exec('brew', ['outdated', '--json=v2']);
    if (result.exitCode !== 0) return [];

    try {
      const data = JSON.parse(result.stdout) as {
        formulae?: Array<{ name: string; installed_versions: string[]; current_version: string }>;
      };
      return (data.formulae ?? []).map((f) => ({
        name: f.name,
        current: f.installed_versions?.[0] ?? '',
        latest: f.current_version,
      }));
    } catch {
      return [];
    }
  }

  protected auditConfig(_content: string | null): AuditCheck[] {
    const result = this.shell.exec('brew', ['tap']);
    if (result.exitCode !== 0) {
      return [{
        key: 'third-party-taps', expected: 'none', actual: null,
        status: 'warn', message: 'Could not list taps',
      }];
    }

    const taps = result.stdout.split('\n').filter(Boolean);
    const thirdParty = taps.filter((t) => !t.startsWith('homebrew/'));

    if (thirdParty.length === 0) {
      return [{
        key: 'third-party-taps',
        expected: 'none',
        actual: 'none',
        status: 'ok',
      }];
    }

    return [{
      key: 'third-party-taps',
      expected: 'none',
      actual: thirdParty.join(', '),
      status: 'warn',
      message: `${thirdParty.length} third-party tap(s) detected (unreviewed)`,
    }];
  }
}

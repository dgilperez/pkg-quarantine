import { ManagerHandler } from './base.js';
import type { DesiredSetting, AuditCheck, OutdatedPackage } from '../types.js';

/**
 * Cargo (Rust) handler.
 * No native quarantine config. We check for cargo-audit and use
 * the crates.io API for age-checking during update.
 */
export class CargoHandler extends ManagerHandler {
  readonly name = 'cargo' as const;
  readonly displayName = 'Cargo (Rust)';
  readonly configPath = ''; // No quarantine config to write

  getDesiredSettings(): DesiredSetting[] {
    return [
      { key: 'cargo-audit', value: 'installed', description: 'Vulnerability scanner for Rust dependencies' },
    ];
  }

  async mergeConfig(_dryRun: boolean): Promise<{ path: string; content: string; changed: boolean }> {
    const hasAudit = this.shell.which('cargo-audit') !== null;
    const info = hasAudit
      ? 'cargo-audit is installed. Run `cargo audit` in your projects.'
      : [
          'Cargo has no native quarantine mechanism.',
          'Recommendation: install cargo-audit for vulnerability scanning:',
          '  cargo install cargo-audit',
        ].join('\n');

    return { path: '(Cargo)', content: info, changed: false };
  }

  getOutdated(): OutdatedPackage[] {
    // `cargo install --list` shows installed binaries but no outdated info
    // Use cargo-outdated if available
    const hasOutdated = this.shell.which('cargo-outdated') !== null;
    if (!hasOutdated) return [];

    const result = this.shell.exec('cargo', ['outdated', '--root-deps-only', '--format=json']);
    if (result.exitCode !== 0) return [];

    try {
      const data = JSON.parse(result.stdout) as {
        dependencies?: Array<{
          name: string;
          project: string;
          latest: string;
        }>;
      };
      return (data.dependencies ?? [])
        .filter((d) => d.latest !== d.project && d.latest !== '--')
        .map((d) => ({
          name: d.name,
          current: d.project,
          latest: d.latest,
        }));
    } catch {
      return [];
    }
  }

  protected auditConfig(_content: string | null): AuditCheck[] {
    const hasAudit = this.shell.which('cargo-audit') !== null;

    return [{
      key: 'cargo-audit',
      expected: 'installed',
      actual: hasAudit ? 'installed' : 'not found',
      status: hasAudit ? 'ok' : 'warn',
      message: hasAudit ? undefined : 'Install: cargo install cargo-audit',
    }];
  }
}

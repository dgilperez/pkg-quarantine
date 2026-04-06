import { ManagerHandler } from './base.js';
import type { DesiredSetting, AuditCheck, OutdatedPackage } from '../types.js';

/**
 * Hex (Elixir/Erlang) handler.
 * No native quarantine config. We check for mix_audit and use
 * the hex.pm API for age-checking during update.
 */
export class HexHandler extends ManagerHandler {
  readonly name = 'hex' as const;
  readonly displayName = 'Hex (Elixir)';
  readonly configPath = ''; // No quarantine config to write

  protected get binaryName(): string {
    return 'mix';
  }

  getDesiredSettings(): DesiredSetting[] {
    return [
      { key: 'mix_audit', value: 'installed', description: 'Vulnerability scanner for Elixir dependencies' },
    ];
  }

  async mergeConfig(_dryRun: boolean): Promise<{ path: string; content: string; changed: boolean }> {
    const hasAudit = this.checkMixAudit();
    const info = hasAudit
      ? 'mix_audit is installed. Run `mix deps.audit` in your projects.'
      : [
          'Hex has no native quarantine mechanism.',
          'Recommendation: install mix_audit for vulnerability scanning:',
          '  mix archive.install hex mix_audit',
        ].join('\n');

    return { path: '(Hex)', content: info, changed: false };
  }

  getOutdated(): OutdatedPackage[] {
    // `mix hex.outdated` lists outdated deps but is per-project
    // Global hex packages are rare — skip
    return [];
  }

  protected auditConfig(_content: string | null): AuditCheck[] {
    const hasAudit = this.checkMixAudit();

    return [{
      key: 'mix_audit',
      expected: 'installed',
      actual: hasAudit ? 'installed' : 'not found',
      status: hasAudit ? 'ok' : 'warn',
      message: hasAudit ? undefined : 'Install: mix archive.install hex mix_audit',
    }];
  }

  private checkMixAudit(): boolean {
    // mix_audit is a Mix archive, not a standalone binary
    // Check if mix deps.audit works
    const result = this.shell.exec('mix', ['help', 'deps.audit']);
    return result.exitCode === 0;
  }
}

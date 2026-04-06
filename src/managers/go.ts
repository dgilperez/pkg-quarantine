import { ManagerHandler } from './base.js';
import type { DesiredSetting, AuditCheck, OutdatedPackage } from '../types.js';

/**
 * Go handler.
 * Go uses sumdb by default for checksum verification.
 * We just verify it's active and recommend govulncheck.
 */
export class GoHandler extends ManagerHandler {
  readonly name = 'go' as const;
  readonly displayName = 'Go';
  readonly configPath = ''; // No config file to write

  getDesiredSettings(): DesiredSetting[] {
    return [
      { key: 'GONOSUMDB', value: '(empty)', description: 'Ensure sum database is not bypassed' },
      { key: 'GONOSUMCHECK', value: '(empty)', description: 'Ensure checksum verification is active' },
    ];
  }

  async mergeConfig(_dryRun: boolean): Promise<{ path: string; content: string; changed: boolean }> {
    // Go sumdb is on by default — just verify
    const info = [
      'Go uses sum.golang.org for checksum verification by default.',
      'Recommendation: install govulncheck for vulnerability scanning:',
      '  go install golang.org/x/vuln/cmd/govulncheck@latest',
    ].join('\n');

    return { path: '(Go environment)', content: info, changed: false };
  }

  getOutdated(): OutdatedPackage[] {
    // Go doesn't have global outdated — tools are project-scoped
    return [];
  }

  protected auditConfig(_content: string | null): AuditCheck[] {
    const checks: AuditCheck[] = [];

    // Check GONOSUMDB
    const gonosumdb = this.shell.exec('go', ['env', 'GONOSUMDB']);
    const nosumdbVal = gonosumdb.stdout.trim();
    checks.push({
      key: 'GONOSUMDB',
      expected: '(empty)',
      actual: nosumdbVal || '(empty)',
      status: !nosumdbVal ? 'ok' : 'warn',
      message: nosumdbVal ? 'Some modules bypass sum database' : undefined,
    });

    // Check GONOSUMCHECK
    const gonosumcheck = this.shell.exec('go', ['env', 'GONOSUMCHECK']);
    const nosumcheckVal = gonosumcheck.stdout.trim();
    checks.push({
      key: 'GONOSUMCHECK',
      expected: '(empty)',
      actual: nosumcheckVal || '(empty)',
      status: !nosumcheckVal ? 'ok' : 'warn',
      message: nosumcheckVal ? 'Checksum verification partially disabled' : undefined,
    });

    // Check govulncheck
    const hasGovulncheck = this.shell.which('govulncheck') !== null;
    checks.push({
      key: 'govulncheck',
      expected: 'installed',
      actual: hasGovulncheck ? 'installed' : 'not found',
      status: hasGovulncheck ? 'ok' : 'warn',
      message: hasGovulncheck ? undefined : 'Install: go install golang.org/x/vuln/cmd/govulncheck@latest',
    });

    return checks;
  }
}

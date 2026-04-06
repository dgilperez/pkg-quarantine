import { ManagerHandler } from './base.js';
import { paths } from '../lib/platform.js';
import { parseNpmrc, mergeNpmrc } from '../config/npmrc.js';
import type { DesiredSetting, AuditCheck, AuditResult, OutdatedPackage } from '../types.js';

/** Minimum npm major version where min-release-age is reliably supported. */
const MIN_SUPPORTED_MAJOR = 10;

export class NpmHandler extends ManagerHandler {
  readonly name = 'npm' as const;
  readonly displayName = 'npm';
  readonly configPath = paths.npmrc;

  getDesiredSettings(): DesiredSetting[] {
    return [
      {
        key: 'min-release-age',
        value: String(this.quarantineDays),
        description: `Block packages published less than ${this.quarantineDays} days ago`,
      },
      {
        key: 'ignore-scripts',
        value: 'true',
        description: 'Disable lifecycle scripts by default',
      },
      {
        key: 'audit-level',
        value: 'high',
        description: 'Fail audit on high+ severity vulnerabilities',
      },
    ];
  }

  async mergeConfig(dryRun: boolean): Promise<{ path: string; content: string; changed: boolean }> {
    const existing = (await this.fs.readFile(this.configPath)) ?? '';
    const settings: Record<string, string> = {};
    for (const s of this.getDesiredSettings()) {
      settings[s.key] = s.value;
    }
    const merged = mergeNpmrc(existing, settings);
    const changed = merged !== existing;

    if (!dryRun && changed) {
      await this.fs.writeFile(this.configPath, merged);
    }

    return { path: this.configPath, content: merged, changed };
  }

  getOutdated(): OutdatedPackage[] {
    const result = this.shell.exec('npm', ['outdated', '-g', '--json']);
    // npm outdated exits 1 when packages are outdated — that's expected
    const stdout = result.stdout || '{}';
    try {
      const data = JSON.parse(stdout) as Record<string, { current?: string; latest?: string }>;
      return Object.entries(data)
        .filter(([, info]) => info.latest && info.latest !== info.current)
        .map(([name, info]) => ({
          name,
          current: info.current ?? '',
          latest: info.latest!,
        }));
    } catch {
      return [];
    }
  }

  /** Override audit to append an npm version compatibility check. */
  override async audit(): Promise<AuditResult> {
    const base = await super.audit();
    const compatCheck = this.versionCompatCheck();
    if (compatCheck) {
      base.checks.push(compatCheck);
    }
    return base;
  }

  /** Return a compatibility AuditCheck for the installed npm version, or null if npm not found. */
  private versionCompatCheck(): AuditCheck | null {
    if (!this.isInstalled()) return null;

    const result = this.shell.exec('npm', ['--version']);
    const raw = result.stdout.trim();
    const major = parseInt(raw.split('.')[0], 10);

    if (isNaN(major) || major < MIN_SUPPORTED_MAJOR) {
      const versionLabel = isNaN(major) ? `unknown (${raw})` : raw;
      return {
        key: 'npm-version-compat',
        expected: `>=${MIN_SUPPORTED_MAJOR}`,
        actual: raw || null,
        status: 'warn',
        message:
          `npm ${versionLabel} has known issues with min-release-age and --before flag interactions. ` +
          `Upgrade to npm ${MIN_SUPPORTED_MAJOR}+ for reliable quarantine support: npm install -g npm@latest`,
      };
    }

    return {
      key: 'npm-version-compat',
      expected: `>=${MIN_SUPPORTED_MAJOR}`,
      actual: raw,
      status: 'ok',
    };
  }

  protected auditConfig(content: string | null): AuditCheck[] {
    if (!content) {
      return this.getDesiredSettings().map((s) => ({
        key: s.key,
        expected: s.value,
        actual: null,
        status: 'missing' as const,
        message: `${this.configPath} not found`,
      }));
    }

    const parsed = parseNpmrc(content);
    return this.getDesiredSettings().map((s) => {
      const actual = parsed.settings.get(s.key) ?? null;
      const status = actual === s.value ? 'ok' : actual === null ? 'missing' : 'warn';
      return {
        key: s.key,
        expected: s.value,
        actual,
        status,
        message: status === 'warn' ? `Expected ${s.value}, got ${actual}` : undefined,
      };
    });
  }
}

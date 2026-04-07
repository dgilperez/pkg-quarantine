import { ManagerHandler } from './base.js';
import { paths } from '../lib/platform.js';
import { parseNpmrc, mergeNpmrc } from '../config/npmrc.js';
import type { DesiredSetting, AuditCheck, AuditResult, OutdatedPackage } from '../types.js';

/**
 * Minimum npm version where `min-release-age` is honored.
 *
 * The setting shipped in npm 11.10.0 (Feb 2026, see
 * https://socket.dev/blog/npm-introduces-minimumreleaseage-and-bulk-oidc-configuration).
 * Earlier npm versions accept the key in `.npmrc` but silently ignore it AND
 * emit a deprecation warning, so installs proceed unprotected. The compat
 * check exists specifically to surface that false-OK to the user.
 */
const MIN_NPM_VERSION = { major: 11, minor: 10, patch: 0 } as const;

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
    const min = MIN_NPM_VERSION;
    const expected = `>=${min.major}.${min.minor}.${min.patch}`;
    const parsed = parseSemver(raw);

    if (!parsed) {
      return {
        key: 'npm-version-compat',
        expected,
        actual: raw || null,
        status: 'warn',
        message:
          `Could not parse npm version "${raw}". ` +
          `min-release-age requires npm >=${min.major}.${min.minor}.${min.patch}. ` +
          `Upgrade with: npm install -g npm@latest`,
      };
    }

    if (compareSemver(parsed, min) < 0) {
      return {
        key: 'npm-version-compat',
        expected,
        actual: raw,
        status: 'warn',
        message:
          `npm ${raw} silently ignores the \`min-release-age\` setting — ` +
          `it shipped in npm ${min.major}.${min.minor}.${min.patch} (Feb 2026). ` +
          `Until you upgrade, the npm quarantine is NOT enforced. ` +
          `Upgrade with: npm install -g npm@latest`,
      };
    }

    return {
      key: 'npm-version-compat',
      expected,
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

interface SemverParts {
  major: number;
  minor: number;
  patch: number;
}

/** Parse a `MAJOR.MINOR.PATCH` string. Pre-release/build metadata is ignored. */
function parseSemver(raw: string): SemverParts | null {
  const match = raw.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

/** Standard semver compare. Returns <0, 0, or >0. */
function compareSemver(a: SemverParts, b: SemverParts): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

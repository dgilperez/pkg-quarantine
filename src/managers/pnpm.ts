import { ManagerHandler } from './base.js';
import { paths } from '../lib/platform.js';
import { parseIni, mergeIni } from '../config/file-parsers.js';
import type { DesiredSetting, AuditCheck, OutdatedPackage } from '../types.js';

export class PnpmHandler extends ManagerHandler {
  readonly name = 'pnpm' as const;
  readonly displayName = 'pnpm';
  readonly configPath = paths.pnpmrc;

  /** pnpm uses minutes for minimum-release-age */
  private get quarantineMinutes(): number {
    return this.quarantineDays * 24 * 60;
  }

  getDesiredSettings(): DesiredSetting[] {
    return [
      {
        // pnpm only honours the kebab-case form here. The camelCase
        // alias appears in `pnpm config list` but is silently ignored
        // at resolution time — writing it disables quarantine.
        key: 'minimum-release-age',
        value: String(this.quarantineMinutes),
        description: `Block packages published less than ${this.quarantineDays} days ago (${this.quarantineMinutes} minutes)`,
      },
      {
        key: 'ignore-scripts',
        value: 'true',
        description: 'Disable lifecycle scripts by default',
      },
    ];
  }

  async mergeConfig(dryRun: boolean): Promise<{ path: string; content: string; changed: boolean }> {
    const existing = (await this.fs.readFile(this.configPath)) ?? '';
    const settings: Record<string, string> = {};
    for (const s of this.getDesiredSettings()) {
      settings[s.key] = s.value;
    }
    const merged = mergeIni(existing, settings);
    const changed = merged !== existing;

    if (!dryRun && changed) {
      await this.fs.writeFile(this.configPath, merged);
    }

    return { path: this.configPath, content: merged, changed };
  }

  getOutdated(): OutdatedPackage[] {
    const result = this.shell.exec('pnpm', ['outdated', '-g', '--json']);
    const stdout = result.stdout || '[]';
    try {
      const data = JSON.parse(stdout);
      const entries = Array.isArray(data) ? data : Object.entries(data).map(([name, info]) => ({ name, ...info as object }));
      return entries
        .filter((e: Record<string, string>) => e.latest && e.latest !== e.current)
        .map((e: Record<string, string>) => ({
          name: e.name,
          current: e.current ?? '',
          latest: e.latest,
        }));
    } catch {
      return [];
    }
  }

  protected auditConfig(content: string | null): AuditCheck[] {
    if (!content) {
      return this.getDesiredSettings().map((s) => ({
        key: s.key, expected: s.value, actual: null, status: 'missing' as const,
        message: `${this.configPath} not found`,
      }));
    }

    const parsed = parseIni(content);
    return this.getDesiredSettings().map((s) => {
      const actual = parsed.settings.get(s.key) ?? null;
      const status = actual === s.value ? 'ok' : actual === null ? 'missing' : 'warn';
      return {
        key: s.key, expected: s.value, actual, status,
        message: status === 'warn' ? `Expected ${s.value}, got ${actual}` : undefined,
      };
    });
  }
}

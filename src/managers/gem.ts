import { ManagerHandler } from './base.js';
import { paths } from '../lib/platform.js';
import type { DesiredSetting, AuditCheck, AuditResult, OutdatedPackage } from '../types.js';

export class GemHandler extends ManagerHandler {
  readonly name = 'gem' as const;
  readonly displayName = 'RubyGems';
  readonly configPath = paths.bundleConfig;

  getDesiredSettings(): DesiredSetting[] {
    return [
      {
        key: 'BUNDLE_TRUST___POLICY',
        value: 'MediumSecurity',
        description: 'Require signed gems when available (via bundler)',
      },
    ];
  }

  async mergeConfig(dryRun: boolean): Promise<{ path: string; content: string; changed: boolean }> {
    const existing = (await this.fs.readFile(this.configPath)) ?? '';

    let changed = false;
    let content = existing;

    if (!existing.includes('BUNDLE_TRUST___POLICY')) {
      if (existing && !existing.endsWith('\n')) content += '\n';
      if (!existing.includes('---')) content = '---\n' + content;
      content += 'BUNDLE_TRUST___POLICY: "MediumSecurity"\n';
      changed = true;
    }

    if (!dryRun && changed) {
      await this.fs.writeFile(this.configPath, content);
    }

    return { path: this.configPath, content, changed };
  }

  getOutdated(): OutdatedPackage[] {
    const result = this.shell.exec('gem', ['outdated']);
    if (result.exitCode !== 0 || !result.stdout) return [];

    return result.stdout.split('\n')
      .filter((line) => line.includes('<'))
      .map((line) => {
        // Format: "gemname (current < latest)"
        const name = line.split(' ')[0];
        const version = line.replace(/.*< /, '').replace(')', '');
        const current = line.replace(/.*\(/, '').replace(/ <.*/, '');
        return { name, current, latest: version };
      });
  }

  override async audit(): Promise<AuditResult> {
    const content = await this.fs.readFile(this.configPath);
    const hasTrustPolicy = content?.includes('BUNDLE_TRUST___POLICY') ?? false;
    const actualValue = hasTrustPolicy
      ? content!.match(/BUNDLE_TRUST___POLICY:\s*"?(\w+)"?/)?.[1] ?? null
      : null;

    return {
      manager: this.name,
      installed: this.isInstalled(),
      checks: [{
        key: 'BUNDLE_TRUST___POLICY',
        expected: 'MediumSecurity',
        actual: actualValue,
        status: actualValue === 'MediumSecurity' ? 'ok' : actualValue ? 'warn' : 'missing',
      }],
    };
  }

  protected auditConfig(_content: string | null): AuditCheck[] {
    // Not used — audit() is overridden. Required by abstract base.
    return [];
  }
}

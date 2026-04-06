import { ManagerHandler } from './base.js';
import { paths } from '../lib/platform.js';
import type { DesiredSetting, AuditCheck, OutdatedPackage } from '../types.js';

export class GemHandler extends ManagerHandler {
  readonly name = 'gem' as const;
  readonly displayName = 'RubyGems';
  readonly configPath = paths.gemrc;

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
    // gem has two config files: ~/.gemrc (YAML) and ~/.bundle/config (YAML)
    // We handle ~/.bundle/config for trust policy
    const bundlePath = paths.bundleConfig;
    const existing = (await this.fs.readFile(bundlePath)) ?? '';

    let changed = false;
    let content = existing;

    if (!existing.includes('BUNDLE_TRUST___POLICY')) {
      // Append to bundle config
      if (existing && !existing.endsWith('\n')) content += '\n';
      if (!existing.includes('---')) content = '---\n' + content;
      content += 'BUNDLE_TRUST___POLICY: "MediumSecurity"\n';
      changed = true;
    }

    if (!dryRun && changed) {
      await this.fs.writeFile(bundlePath, content);
    }

    return { path: bundlePath, content, changed };
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

  protected auditConfig(_content: string | null): AuditCheck[] {
    // Check bundle config instead of gemrc for trust policy
    // We use a synchronous approach — the async audit() method handles the read
    return [{
      key: 'BUNDLE_TRUST___POLICY',
      expected: 'MediumSecurity',
      actual: null,
      status: 'warn',
      message: 'Check ~/.bundle/config manually',
    }];
  }

  override async audit(): Promise<AuditResult> {
    const bundleContent = await this.fs.readFile(paths.bundleConfig);
    const hasTrustPolicy = bundleContent?.includes('BUNDLE_TRUST___POLICY') ?? false;
    const actualValue = hasTrustPolicy
      ? bundleContent!.match(/BUNDLE_TRUST___POLICY:\s*"?(\w+)"?/)?.[1] ?? null
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
}

// Import for the override return type
import type { AuditResult } from '../types.js';

import { ManagerHandler } from './base.js';
import { paths } from '../lib/platform.js';
import { mergeJson } from '../config/file-parsers.js';
import type { DesiredSetting, AuditCheck, OutdatedPackage } from '../types.js';

export class ComposerHandler extends ManagerHandler {
  readonly name = 'composer' as const;
  readonly displayName = 'Composer';
  readonly configPath = paths.composerConfig;

  getDesiredSettings(): DesiredSetting[] {
    // Note: `audit.block-insecure` is intentionally NOT set here.
    // Composer 2.9+ enables it by default, and the setting cannot be applied
    // via `~/.config/composer/config.json` reliably (it lives under `config`
    // but is gated to per-project composer.json in older Composer versions).
    // See https://github.com/composer/composer/issues/12611.
    return [
      { key: 'config.no-scripts', value: 'true', description: 'Disable post-install scripts' },
      { key: 'config.allow-plugins', value: '{}', description: 'Block all plugins by default' },
      { key: 'config.secure-http', value: 'true', description: 'Require HTTPS for downloads' },
    ];
  }

  async mergeConfig(dryRun: boolean): Promise<{ path: string; content: string; changed: boolean }> {
    const existing = (await this.fs.readFile(this.configPath)) ?? '{}';
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(existing);
    } catch { /* start fresh */ }

    const desired = {
      config: {
        'secure-http': true,
        'allow-plugins': {},
        'no-scripts': true,
      },
    };

    const merged = mergeJson(parsed, desired);
    const mergedStr = JSON.stringify(merged, null, 2) + '\n';
    const changed = mergedStr !== existing;

    if (!dryRun && changed) {
      await this.fs.writeFile(this.configPath, mergedStr);
    }

    return { path: this.configPath, content: mergedStr, changed };
  }

  getOutdated(): OutdatedPackage[] {
    // Composer global packages are rare; skip for now
    return [];
  }

  protected auditConfig(content: string | null): AuditCheck[] {
    if (!content) {
      return this.getDesiredSettings().map((s) => ({
        key: s.key, expected: s.value, actual: null,
        status: 'missing' as const, message: `${this.configPath} not found`,
      }));
    }

    try {
      const parsed = JSON.parse(content) as Record<string, unknown>;
      const config = (parsed['config'] ?? {}) as Record<string, unknown>;

      return [
        checkBool(config, 'no-scripts', true),
        {
          key: 'config.allow-plugins',
          expected: '{}',
          actual: JSON.stringify(config['allow-plugins'] ?? null),
          status: typeof config['allow-plugins'] === 'object' &&
                  Object.keys(config['allow-plugins'] as object).length === 0
            ? 'ok' : config['allow-plugins'] != null ? 'warn' : 'missing',
        },
        checkBool(config, 'secure-http', true),
      ];
    } catch {
      return [{
        key: 'config', expected: '(valid JSON)', actual: null,
        status: 'missing', message: 'Could not parse composer config',
      }];
    }
  }
}

function checkBool(config: Record<string, unknown>, key: string, expected: boolean): AuditCheck {
  const actual = config[key];
  return {
    key: `config.${key}`,
    expected: String(expected),
    actual: actual != null ? String(actual) : null,
    status: actual === expected ? 'ok' : actual != null ? 'warn' : 'missing',
  };
}

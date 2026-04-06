import { ManagerHandler } from './base.js';
import { paths } from '../lib/platform.js';
import { parsePipConf, serializePipConf } from '../config/file-parsers.js';
import type { DesiredSetting, AuditCheck, OutdatedPackage } from '../types.js';

export class PipHandler extends ManagerHandler {
  readonly name = 'pip' as const;
  readonly displayName = 'pip';
  readonly configPath = paths.pipConf;

  protected get binaryName(): string {
    return 'pip3';
  }

  getDesiredSettings(): DesiredSetting[] {
    return [
      {
        key: 'only-binary',
        value: ':all:',
        description: 'Only install pre-built wheels (blocks source-based attacks)',
      },
    ];
  }

  async mergeConfig(dryRun: boolean): Promise<{ path: string; content: string; changed: boolean }> {
    const existing = (await this.fs.readFile(this.configPath)) ?? '';
    const sections = existing ? parsePipConf(existing) : new Map([['global', new Map<string, string>()]]);

    if (!sections.has('global')) sections.set('global', new Map());
    const global = sections.get('global')!;
    global.set('only-binary', ':all:');

    const merged = serializePipConf(sections);
    const changed = merged !== existing;

    if (!dryRun && changed) {
      await this.fs.writeFile(this.configPath, merged);
    }

    return { path: this.configPath, content: merged, changed };
  }

  getOutdated(): OutdatedPackage[] {
    const pip = this.shell.which('pip3') ? 'pip3' : 'pip';
    const result = this.shell.exec(pip, ['list', '--outdated', '--format=json']);
    if (result.exitCode !== 0) return [];

    try {
      const data = JSON.parse(result.stdout) as Array<{
        name: string;
        version: string;
        latest_version: string;
      }>;
      return data.map((p) => ({
        name: p.name,
        current: p.version,
        latest: p.latest_version,
      }));
    } catch {
      return [];
    }
  }

  protected auditConfig(content: string | null): AuditCheck[] {
    if (!content) {
      return [{
        key: 'only-binary', expected: ':all:', actual: null,
        status: 'missing', message: `${this.configPath} not found`,
      }];
    }

    const sections = parsePipConf(content);
    const global = sections.get('global');
    const actual = global?.get('only-binary') ?? null;

    return [{
      key: 'only-binary',
      expected: ':all:',
      actual,
      status: actual === ':all:' ? 'ok' : actual ? 'warn' : 'missing',
    }];
  }
}

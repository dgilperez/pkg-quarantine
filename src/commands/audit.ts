import type { FileSystem, Shell, ManagerName, QuarantineConfig } from '../types.js';
import { resolveManagers } from '../lib/detect.js';
import { createHandlers } from '../managers/registry.js';
import * as output from '../lib/output.js';

export interface AuditOptions {
  managers: ManagerName[];
  config: QuarantineConfig;
}

export interface AuditTotals {
  ok: number;
  warn: number;
  missing: number;
}

export async function auditCommand(
  fs: FileSystem,
  shell: Shell,
  options: AuditOptions,
): Promise<AuditTotals> {
  const { config } = options;
  const requested = options.managers.length > 0 ? options.managers : config.managers;

  output.heading(`Quarantine Audit (${config.quarantine_days}-day policy)`);

  const { resolved, missing } = resolveManagers(requested, shell);
  for (const m of missing) {
    output.skip(`${m} — not installed`);
  }

  const handlers = createHandlers(resolved, fs, shell, config.quarantine_days);

  let totalOk = 0;
  let totalWarn = 0;
  let totalMissing = 0;

  for (const handler of handlers) {
    const result = await handler.audit();
    output.heading(handler.displayName);

    if (!result.installed) {
      output.skip('Not installed');
      continue;
    }

    for (const check of result.checks) {
      switch (check.status) {
        case 'ok':
          output.ok(`${check.key} = ${check.actual}`);
          totalOk++;
          break;
        case 'warn':
          output.warn(`${check.key}: ${check.message ?? `expected ${check.expected}, got ${check.actual}`}`);
          totalWarn++;
          break;
        case 'missing':
          output.fail(`${check.key}: ${check.message ?? 'not set'}`);
          totalMissing++;
          break;
      }
    }
  }

  console.log('');
  const parts = [
    `${totalOk} passed`,
    totalWarn > 0 ? `${totalWarn} warning(s)` : null,
    totalMissing > 0 ? `${totalMissing} missing` : null,
  ].filter(Boolean);
  output.info(parts.join(', '));

  if (totalMissing > 0) {
    output.info('Run `quarantine init` to fix missing settings');
  }

  return { ok: totalOk, warn: totalWarn, missing: totalMissing };
}

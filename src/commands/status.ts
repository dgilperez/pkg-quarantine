import type { FileSystem, Shell, QuarantineConfig } from '../types.js';
import { detectManagers } from '../lib/detect.js';
import { createHandlers } from '../managers/registry.js';
import * as output from '../lib/output.js';

export async function statusCommand(
  fs: FileSystem,
  shell: Shell,
  config: QuarantineConfig,
): Promise<void> {
  output.heading(`Quarantine Status`);
  output.info(`Policy: ${config.quarantine_days}-day minimum release age`);
  output.info(`Configured managers: ${config.managers.join(', ')}`);

  const installed = detectManagers(shell);
  output.info(`Installed: ${installed.join(', ')}`);

  console.log('');

  const handlers = createHandlers(installed, fs, shell, config.quarantine_days);

  const rows: [string, string, 'ok' | 'warn' | 'missing'][] = [];

  for (const handler of handlers) {
    const result = await handler.audit();
    const allOk = result.checks.every((c) => c.status === 'ok');
    const anyMissing = result.checks.some((c) => c.status === 'missing');

    const status: 'ok' | 'warn' | 'missing' = allOk ? 'ok' : anyMissing ? 'missing' : 'warn';
    const detail = result.checks
      .map((c) => c.status === 'ok' ? c.key : `${c.key} (${c.status})`)
      .join(', ');

    rows.push([handler.displayName, detail, status]);
  }

  output.table(rows);
}

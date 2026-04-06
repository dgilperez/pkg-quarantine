import type { FileSystem, Shell, ManagerName, QuarantineConfig } from '../types.js';
import { resolveManagers } from '../lib/detect.js';
import { createHandlers } from '../managers/registry.js';
import * as output from '../lib/output.js';

export interface InitOptions {
  dryRun: boolean;
  managers: ManagerName[];
  config: QuarantineConfig;
}

export async function initCommand(
  fs: FileSystem,
  shell: Shell,
  options: InitOptions,
): Promise<void> {
  const { dryRun, config } = options;
  const requested = options.managers.length > 0 ? options.managers : config.managers;

  output.heading(`Quarantine Init (${config.quarantine_days}-day policy)`);
  if (dryRun) output.info('DRY RUN — no files will be modified');

  const { resolved, missing } = resolveManagers(requested, shell);
  for (const m of missing) {
    output.skip(`${m} — not installed`);
  }

  const handlers = createHandlers(resolved, fs, shell, config.quarantine_days);

  let wrote = 0;
  let skipped = 0;

  for (const handler of handlers) {
    output.heading(handler.displayName);

    if (handler.projectOnly) {
      const result = await handler.mergeConfig(true);
      output.warn(`Per-project only — cannot set globally`);
      output.info(result.content.split('\n')[1] ?? result.content);
      skipped++;
      continue;
    }

    const result = await handler.mergeConfig(dryRun);

    if (!result.changed) {
      output.ok(`${result.path} — already configured`);
      skipped++;
    } else if (dryRun) {
      output.info(`Would write: ${result.path}`);
      for (const s of handler.getDesiredSettings()) {
        output.info(`  ${s.key} = ${s.value}`);
      }
      wrote++;
    } else {
      output.ok(`${result.path} — updated`);
      for (const s of handler.getDesiredSettings()) {
        output.ok(`  ${s.key} = ${s.value}`);
      }
      wrote++;
    }
  }

  console.log('');
  const action = dryRun ? 'would update' : 'updated';
  output.info(`${wrote} config(s) ${action}, ${skipped} already set / per-project`);
}

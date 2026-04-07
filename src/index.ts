import { Command } from 'commander';
import { RealFileSystem } from './lib/fs.js';
import { RealShell } from './lib/shell.js';
import { paths } from './lib/platform.js';
import { parseQuarantineConfig } from './config/global-config.js';
import { initCommand } from './commands/init.js';
import { auditCommand } from './commands/audit.js';
import { statusCommand } from './commands/status.js';
import { updateCommand } from './commands/update.js';
import { ALL_MANAGERS } from './types.js';
import type { ManagerName } from './types.js';

const fs = new RealFileSystem();
const shell = new RealShell();

function parseManagers(args: string[]): ManagerName[] {
  const valid = new Set<string>(ALL_MANAGERS);
  const result: ManagerName[] = [];
  for (const arg of args) {
    if (valid.has(arg)) result.push(arg as ManagerName);
    else {
      console.error(`Unknown manager: ${arg}. Valid: ${ALL_MANAGERS.join(', ')}`);
      process.exit(1);
    }
  }
  return result;
}

async function loadConfig() {
  const content = await fs.readFile(paths.quarantineConfig);
  return parseQuarantineConfig(content);
}

const program = new Command();

program
  .name('quarantine')
  .description('Unified quarantine policy for package managers')
  .version('0.1.3');

program
  .command('init')
  .description('Write/merge quarantine configs for detected managers')
  .argument('[managers...]', 'Specific managers to configure')
  .option('--dry-run', 'Show what would change without writing files', false)
  .option('-d, --days <n>', 'Quarantine days (overrides config)', parseInt)
  .action(async (managers: string[], opts: { dryRun: boolean; days?: number }) => {
    const config = await loadConfig();
    if (opts.days) config.quarantine_days = opts.days;
    await initCommand(fs, shell, {
      dryRun: opts.dryRun,
      managers: parseManagers(managers),
      config,
    });
  });

program
  .command('audit')
  .description('Traffic-light report of quarantine config status')
  .argument('[managers...]', 'Specific managers to audit')
  .option('--exit-code', 'Exit non-zero if any manager has warnings or missing settings (CI mode)', false)
  .action(async (managers: string[], opts: { exitCode: boolean }) => {
    const config = await loadConfig();
    const totals = await auditCommand(fs, shell, {
      managers: parseManagers(managers),
      config,
    });
    if (opts.exitCode && (totals.warn + totals.missing) > 0) {
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Quick summary of quarantine policy')
  .action(async () => {
    const config = await loadConfig();
    await statusCommand(fs, shell, config);
  });

program
  .command('update')
  .description('Quarantine-aware global package updater')
  .argument('[managers...]', 'Specific managers to update')
  .option('--dry-run', 'Show what would be updated without installing', false)
  .option('--force', 'Bypass quarantine (with warning)', false)
  .option('-d, --days <n>', 'Quarantine days (overrides config)', parseInt)
  .action(async (managers: string[], opts: { dryRun: boolean; force: boolean; days?: number }) => {
    const config = await loadConfig();
    if (opts.days) config.quarantine_days = opts.days;
    await updateCommand(fs, shell, {
      dryRun: opts.dryRun,
      force: opts.force,
      managers: parseManagers(managers),
      config,
    });
  });

program.parse();

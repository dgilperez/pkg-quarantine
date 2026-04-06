import type { FileSystem, Shell, ManagerName, QuarantineConfig, OutdatedPackage } from '../types.js';
import { resolveManagers } from '../lib/detect.js';
import { createHandlers } from '../managers/registry.js';
import { checkAge } from '../lib/age-check.js';
import { getNpmPublishDate } from '../registries/npm-registry.js';
import { getPypiPublishDate } from '../registries/pypi-registry.js';
import { getGemPublishDate } from '../registries/rubygems-registry.js';
import { getCratePublishDate } from '../registries/crates-registry.js';
import { getHexPublishDate } from '../registries/hex-registry.js';
import * as output from '../lib/output.js';

export interface UpdateOptions {
  dryRun: boolean;
  force: boolean;
  managers: ManagerName[];
  config: QuarantineConfig;
}

/** Map manager names to their registry lookup function */
const REGISTRY_LOOKUP: Partial<Record<ManagerName, (name: string, version: string) => Promise<Date | null>>> = {
  npm: getNpmPublishDate,
  pnpm: getNpmPublishDate,
  bun: getNpmPublishDate,
  pip: getPypiPublishDate,
  uv: getPypiPublishDate,
  gem: getGemPublishDate,
  cargo: getCratePublishDate,
  hex: getHexPublishDate,
};

export async function updateCommand(
  fs: FileSystem,
  shell: Shell,
  options: UpdateOptions,
): Promise<void> {
  const { dryRun, force, config } = options;
  const requested = options.managers.length > 0 ? options.managers : config.managers;

  output.heading(`Quarantine Update (${config.quarantine_days}-day policy)`);
  if (dryRun) output.info('DRY RUN — no packages will be installed');
  if (force) output.warn('FORCE MODE — quarantine bypassed');

  const { resolved, missing } = resolveManagers(requested, shell);
  for (const m of missing) {
    output.skip(`${m} — not installed`);
  }

  const handlers = createHandlers(resolved, fs, shell, config.quarantine_days);

  for (const handler of handlers) {
    output.heading(handler.displayName);

    // Special handling for brew — no registry age check
    if (handler.name === 'brew') {
      await updateBrew(shell, dryRun);
      continue;
    }

    // Special handling for go — just show info
    if (handler.name === 'go') {
      output.info('Go uses sum.golang.org for verification by default');
      output.info('No global update needed — modules are project-scoped');
      continue;
    }

    // Special handling for composer — self-update
    if (handler.name === 'composer') {
      await updateComposer(shell, dryRun);
      continue;
    }

    const outdated = handler.getOutdated();
    if (outdated.length === 0) {
      output.ok('All packages are up to date');
      continue;
    }

    const lookup = REGISTRY_LOOKUP[handler.name];
    const toUpdate: OutdatedPackage[] = [];

    for (const pkg of outdated) {
      if (force) {
        output.warn(`FORCE: bypassing quarantine for ${pkg.name}@${pkg.latest}`);
        toUpdate.push(pkg);
        continue;
      }

      if (!lookup) {
        // No registry API — allow by default (e.g., brew)
        toUpdate.push(pkg);
        continue;
      }

      const publishDate = await lookup(pkg.name, pkg.latest);
      if (!publishDate) {
        output.warn(`${pkg.name}@${pkg.latest}: could not determine publish date — skipping`);
        continue;
      }

      const ageResult = checkAge(pkg.name, pkg.latest, publishDate, config.quarantine_days);
      if (ageResult.allowed) {
        output.ok(`${pkg.name}@${pkg.latest} — ${ageResult.ageDays}d old`);
        toUpdate.push(pkg);
      } else {
        output.skip(`${pkg.name}@${pkg.latest} — ${ageResult.ageDays}d old (quarantine: ${config.quarantine_days}d)`);
      }
    }

    if (toUpdate.length === 0) {
      output.info('No packages passed quarantine check');
      continue;
    }

    await installPackages(handler.name, toUpdate, shell, dryRun);
  }
}

async function installPackages(
  manager: ManagerName,
  packages: OutdatedPackage[],
  shell: Shell,
  dryRun: boolean,
): Promise<void> {
  const specs = packages.map((p) => {
    switch (manager) {
      case 'pip':
      case 'uv':
        return `${p.name}==${p.latest}`;
      case 'gem':
        return p.name;
      default:
        return `${p.name}@${p.latest}`;
    }
  });

  if (dryRun) {
    output.info(`Would install: ${specs.join(' ')}`);
    return;
  }

  output.info(`Installing: ${specs.join(' ')}`);

  let cmd: string;
  let args: string[];

  switch (manager) {
    case 'npm':
      cmd = 'npm'; args = ['install', '-g', ...specs]; break;
    case 'pnpm':
      cmd = 'pnpm'; args = ['add', '-g', ...specs]; break;
    case 'bun':
      cmd = 'bun'; args = ['add', '-g', ...specs]; break;
    case 'pip':
      cmd = 'pip3'; args = ['install', '--upgrade', ...specs]; break;
    case 'gem':
      cmd = 'gem'; args = ['update', ...specs]; break;
    case 'cargo':
      cmd = 'cargo'; args = ['install', ...specs.map(s => s.replace(/@.*/, ''))]; break;
    default:
      output.warn(`No install command defined for ${manager}`);
      return;
  }

  const result = shell.exec(cmd, args);
  if (result.exitCode !== 0) {
    output.fail(`Install failed: ${result.stderr}`);
  } else {
    output.ok('Install complete');
  }
}

async function updateBrew(shell: Shell, dryRun: boolean): Promise<void> {
  // Check third-party taps
  const tapsResult = shell.exec('brew', ['tap']);
  if (tapsResult.exitCode === 0) {
    const thirdParty = tapsResult.stdout.split('\n').filter((t) => t && !t.startsWith('homebrew/'));
    if (thirdParty.length > 0) {
      output.warn('Third-party taps detected:');
      for (const tap of thirdParty) output.warn(`  ${tap}`);
    }
  }

  if (dryRun) {
    output.info('Would run: brew update && brew upgrade');
    const result = shell.exec('brew', ['outdated']);
    if (result.stdout) output.info(`Outdated: ${result.stdout}`);
    return;
  }

  output.info('Running brew update && brew upgrade...');
  shell.exec('brew', ['update', '--quiet']);
  const result = shell.exec('brew', ['upgrade']);
  if (result.exitCode !== 0) {
    output.fail(`brew upgrade failed: ${result.stderr}`);
  } else {
    output.ok('Homebrew updated');
  }
}

async function updateComposer(shell: Shell, dryRun: boolean): Promise<void> {
  const currentResult = shell.exec('composer', ['--version']);
  const current = currentResult.stdout.match(/(\d+\.\d+\.\d+)/)?.[1] ?? 'unknown';
  output.info(`Current: Composer ${current}`);

  if (dryRun) {
    output.info('Would run: composer self-update');
  } else {
    const result = shell.exec('composer', ['self-update']);
    if (result.exitCode !== 0) {
      output.warn(`composer self-update: ${result.stderr}`);
    } else {
      output.ok('Composer updated');
    }
  }
}

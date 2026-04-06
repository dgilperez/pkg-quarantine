import type { ManagerName, Shell } from '../types.js';
import { ALL_MANAGERS } from '../types.js';

/** Binary name for each manager (most match the manager name) */
const BINARIES: Record<ManagerName, string> = {
  npm: 'npm',
  pnpm: 'pnpm',
  bun: 'bun',
  yarn: 'yarn',
  deno: 'deno',
  uv: 'uv',
  pip: 'pip3',
  gem: 'gem',
  composer: 'composer',
  go: 'go',
  brew: 'brew',
  cargo: 'cargo',
  hex: 'mix',
};

/** Detect which package managers are installed on the system */
export function detectManagers(shell: Shell): ManagerName[] {
  return ALL_MANAGERS.filter((m) => shell.which(BINARIES[m]) !== null);
}

/** Filter requested managers to only those installed */
export function resolveManagers(
  requested: ManagerName[],
  shell: Shell,
): { resolved: ManagerName[]; missing: ManagerName[] } {
  const installed = new Set(detectManagers(shell));
  const resolved: ManagerName[] = [];
  const missing: ManagerName[] = [];

  for (const m of requested) {
    if (installed.has(m)) resolved.push(m);
    else missing.push(m);
  }

  return { resolved, missing };
}

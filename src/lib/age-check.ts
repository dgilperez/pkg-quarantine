import type { AgeCheckResult } from '../types.js';

const MS_PER_DAY = 86_400_000;

/** Check if a package version is old enough to pass quarantine */
export function checkAge(
  name: string,
  version: string,
  publishDate: Date,
  quarantineDays: number,
): AgeCheckResult {
  const now = Date.now();
  const ageMs = now - publishDate.getTime();
  const ageDays = Math.floor(ageMs / MS_PER_DAY);

  return {
    name,
    version,
    publishDate,
    ageDays,
    allowed: ageMs >= quarantineDays * MS_PER_DAY,
  };
}

/** Compute the cutoff date (anything published after this is quarantined) */
export function quarantineCutoff(quarantineDays: number): Date {
  return new Date(Date.now() - quarantineDays * MS_PER_DAY);
}

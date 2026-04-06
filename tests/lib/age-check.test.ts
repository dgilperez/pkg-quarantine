import { describe, it, expect } from 'vitest';
import { checkAge, quarantineCutoff } from '../../src/lib/age-check.js';

describe('checkAge', () => {
  it('allows packages older than quarantine period', () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 86_400_000);
    const result = checkAge('foo', '1.0.0', tenDaysAgo, 4);
    expect(result.allowed).toBe(true);
    expect(result.ageDays).toBeGreaterThanOrEqual(10);
  });

  it('blocks packages newer than quarantine period', () => {
    const oneHourAgo = new Date(Date.now() - 3_600_000);
    const result = checkAge('foo', '1.0.0', oneHourAgo, 4);
    expect(result.allowed).toBe(false);
    expect(result.ageDays).toBe(0);
  });

  it('allows packages exactly at quarantine boundary', () => {
    const exactlyFourDaysAgo = new Date(Date.now() - 4 * 86_400_000);
    const result = checkAge('foo', '1.0.0', exactlyFourDaysAgo, 4);
    expect(result.allowed).toBe(true);
  });

  it('returns correct name and version', () => {
    const date = new Date(Date.now() - 10 * 86_400_000);
    const result = checkAge('my-pkg', '2.3.4', date, 4);
    expect(result.name).toBe('my-pkg');
    expect(result.version).toBe('2.3.4');
  });
});

describe('quarantineCutoff', () => {
  it('returns a date N days in the past', () => {
    const cutoff = quarantineCutoff(4);
    const expectedMs = Date.now() - 4 * 86_400_000;
    expect(Math.abs(cutoff.getTime() - expectedMs)).toBeLessThan(100);
  });
});

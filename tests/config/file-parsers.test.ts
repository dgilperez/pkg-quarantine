import { describe, it, expect } from 'vitest';
import { parseIni, serializeIni, mergeJson } from '../../src/config/file-parsers.js';

describe('INI parser (pnpm rc style)', () => {
  it('parses key=value pairs', () => {
    const result = parseIni('minimumReleaseAge=5760\nignore-scripts=true\n');
    expect(result.get('minimumReleaseAge')).toBe('5760');
    expect(result.get('ignore-scripts')).toBe('true');
  });

  it('handles empty input', () => {
    const result = parseIni('');
    expect(result.size).toBe(0);
  });

  it('serializes back to key=value', () => {
    const map = new Map([['a', '1'], ['b', '2']]);
    expect(serializeIni(map)).toBe('a=1\nb=2\n');
  });
});

describe('mergeJson', () => {
  it('deep merges objects', () => {
    const base = { config: { a: 1, b: 2 } };
    const overlay = { config: { b: 3, c: 4 } };
    const result = mergeJson(base, overlay);
    expect(result).toEqual({ config: { a: 1, b: 3, c: 4 } });
  });

  it('does not mutate inputs', () => {
    const base = { a: 1 };
    const overlay = { b: 2 };
    mergeJson(base, overlay);
    expect(base).toEqual({ a: 1 });
  });

  it('overwrites non-object values', () => {
    const base = { a: 'old' };
    const overlay = { a: 'new' };
    expect(mergeJson(base, overlay)).toEqual({ a: 'new' });
  });
});

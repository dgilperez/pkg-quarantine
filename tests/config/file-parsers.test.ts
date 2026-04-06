import { describe, it, expect } from 'vitest';
import { parseIni, serializeIni, mergeIni, parsePipConf, serializePipConf, mergePipConf, mergeJson } from '../../src/config/file-parsers.js';

describe('INI parser (pnpm rc style)', () => {
  it('parses key=value pairs', () => {
    const result = parseIni('minimumReleaseAge=5760\nignore-scripts=true\n');
    expect(result.settings.get('minimumReleaseAge')).toBe('5760');
    expect(result.settings.get('ignore-scripts')).toBe('true');
  });

  it('handles empty input', () => {
    const result = parseIni('');
    expect(result.settings.size).toBe(0);
    expect(result.lines).toEqual([]);
  });

  it('preserves comments on roundtrip', () => {
    const input = '# my pnpm config\nminimumReleaseAge=5760\n; another comment\nignore-scripts=true\n';
    const parsed = parseIni(input);
    const output = serializeIni(parsed);
    expect(output).toBe(input);
  });

  it('preserves blank lines on roundtrip', () => {
    const input = 'a=1\n\nb=2\n';
    const parsed = parseIni(input);
    const output = serializeIni(parsed);
    expect(output).toBe(input);
  });

  it('skips section headers', () => {
    const input = '[section]\nkey=value\n';
    const parsed = parseIni(input);
    expect(parsed.settings.get('key')).toBe('value');
    expect(parsed.lines[0]).toBe('[section]');
  });
});

describe('mergeIni', () => {
  it('adds new keys without destroying comments', () => {
    const existing = '# my config\nminimumReleaseAge=1440\n';
    const result = mergeIni(existing, { 'ignore-scripts': 'true' });
    expect(result).toContain('# my config');
    expect(result).toContain('minimumReleaseAge=1440');
    expect(result).toContain('ignore-scripts=true');
  });

  it('updates existing keys in-place', () => {
    const existing = '# comment\nminimumReleaseAge=1440\nignore-scripts=false\n';
    const result = mergeIni(existing, { 'minimumReleaseAge': '5760', 'ignore-scripts': 'true' });
    expect(result).toContain('# comment');
    expect(result).toContain('minimumReleaseAge=5760');
    expect(result).toContain('ignore-scripts=true');
    expect(result.match(/minimumReleaseAge/g)?.length).toBe(1);
  });

  it('handles empty existing content', () => {
    const result = mergeIni('', { 'key': 'value' });
    expect(result).toBe('key=value\n');
  });
});

describe('parsePipConf (sectioned INI)', () => {
  it('parses sections and keys', () => {
    const input = '[global]\nonly-binary = :all:\n';
    const parsed = parsePipConf(input);
    expect(parsed.sections.get('global')?.get('only-binary')?.value).toBe(':all:');
  });

  it('preserves comments on roundtrip', () => {
    const input = '# pip config\n[global]\n# wheel-only mode\nonly-binary = :all:\n';
    const parsed = parsePipConf(input);
    const output = serializePipConf(parsed);
    expect(output).toBe(input);
  });

  it('handles multiple sections', () => {
    const input = '[global]\nonly-binary = :all:\n[install]\ntimeout = 30\n';
    const parsed = parsePipConf(input);
    expect(parsed.sections.get('global')?.get('only-binary')?.value).toBe(':all:');
    expect(parsed.sections.get('install')?.get('timeout')?.value).toBe('30');
  });
});

describe('mergePipConf', () => {
  it('updates existing key in-place preserving comments', () => {
    const existing = '# config\n[global]\n# safety\nonly-binary = :none:\n';
    const result = mergePipConf(existing, 'global', { 'only-binary': ':all:' });
    expect(result).toContain('# config');
    expect(result).toContain('# safety');
    expect(result).toContain('only-binary = :all:');
    expect(result).not.toContain(':none:');
  });

  it('adds new key to existing section', () => {
    const existing = '[global]\nonly-binary = :all:\n';
    const result = mergePipConf(existing, 'global', { 'timeout': '30' });
    expect(result).toContain('only-binary = :all:');
    expect(result).toContain('timeout = 30');
  });

  it('creates new section if missing', () => {
    const existing = '[global]\nonly-binary = :all:\n';
    const result = mergePipConf(existing, 'install', { 'timeout': '30' });
    expect(result).toContain('[install]');
    expect(result).toContain('timeout = 30');
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

  it('preserves base keys when overlay is empty object', () => {
    const base = { plugins: { 'some/plugin': true } };
    const overlay = { plugins: {} };
    const result = mergeJson(base, overlay);
    expect(result).toEqual({ plugins: { 'some/plugin': true } });
  });
});

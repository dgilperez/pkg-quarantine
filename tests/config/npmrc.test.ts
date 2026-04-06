import { describe, it, expect } from 'vitest';
import { parseNpmrc, serializeNpmrc, mergeNpmrc } from '../../src/config/npmrc.js';

describe('npmrc parser', () => {
  it('parses key=value lines', () => {
    const result = parseNpmrc('min-release-age=4\nignore-scripts=true\n');
    expect(result.settings.get('min-release-age')).toBe('4');
    expect(result.settings.get('ignore-scripts')).toBe('true');
  });

  it('preserves scoped registry lines (// prefix) as-is', () => {
    const input = '//registry.npmjs.org/:_authToken=secret123\nmin-release-age=4\n';
    const result = parseNpmrc(input);
    // Scoped lines are NOT settings — they're preserved verbatim
    expect(result.settings.has('//registry.npmjs.org/:_authToken')).toBe(false);
    expect(result.lines[0]).toBe('//registry.npmjs.org/:_authToken=secret123');
  });

  it('preserves comment lines (# prefix)', () => {
    const input = '# my comment\nmin-release-age=4\n';
    const result = parseNpmrc(input);
    expect(result.lines[0]).toBe('# my comment');
  });

  it('preserves blank lines', () => {
    const input = 'a=1\n\nb=2\n';
    const result = parseNpmrc(input);
    expect(result.lines).toContain('');
  });

  it('roundtrips without data loss', () => {
    const input = '//registry.npmjs.org/:_authToken=secret\nmin-release-age=4\n# comment\nfund=false\n';
    const parsed = parseNpmrc(input);
    const output = serializeNpmrc(parsed);
    expect(output).toBe(input);
  });

  it('roundtrips complex file with auth tokens intact', () => {
    const input = [
      '//registry.npmjs.org/:_authToken=npm_SECRET_TOKEN_12345',
      '//custom.registry.com/:_authToken=other_token',
      'registry=https://registry.npmjs.org/',
      'min-release-age=2',
      'ignore-scripts=false',
      '# This is a real comment',
      'fund=false',
      '',
    ].join('\n');
    const parsed = parseNpmrc(input);
    const output = serializeNpmrc(parsed);
    expect(output).toBe(input);
  });

  describe('mergeNpmrc', () => {
    it('adds new keys without touching existing ones', () => {
      const existing = '//reg/:_authToken=tok\nfund=false\n';
      const result = mergeNpmrc(existing, { 'min-release-age': '4', 'ignore-scripts': 'true' });
      expect(result).toContain('//reg/:_authToken=tok');
      expect(result).toContain('fund=false');
      expect(result).toContain('min-release-age=4');
      expect(result).toContain('ignore-scripts=true');
    });

    it('updates existing keys', () => {
      const existing = 'min-release-age=2\nignore-scripts=false\n';
      const result = mergeNpmrc(existing, { 'min-release-age': '4', 'ignore-scripts': 'true' });
      expect(result).toContain('min-release-age=4');
      expect(result).toContain('ignore-scripts=true');
      // Should not have duplicates
      expect(result.match(/min-release-age/g)?.length).toBe(1);
    });

    it('never modifies auth token lines', () => {
      const existing = '//registry.npmjs.org/:_authToken=npm_SECRET\nmin-release-age=2\n';
      const result = mergeNpmrc(existing, { 'min-release-age': '4' });
      expect(result).toContain('//registry.npmjs.org/:_authToken=npm_SECRET');
    });
  });
});

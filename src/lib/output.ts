/** ANSI color helpers — zero dependencies */

const isColorSupported =
  process.env['NO_COLOR'] === undefined &&
  process.env['FORCE_COLOR'] !== '0' &&
  (process.stdout.isTTY ?? false);

function wrap(code: number, resetCode: number): (s: string) => string {
  if (!isColorSupported) return (s) => s;
  return (s) => `\x1b[${code}m${s}\x1b[${resetCode}m`;
}

export const bold = wrap(1, 22);
export const dim = wrap(2, 22);
export const red = wrap(31, 39);
export const green = wrap(32, 39);
export const yellow = wrap(33, 39);
export const cyan = wrap(36, 39);

export function ok(msg: string): void {
  console.log(`  ${green('✓')} ${msg}`);
}

export function warn(msg: string): void {
  console.log(`  ${yellow('⚠')} ${msg}`);
}

export function skip(msg: string): void {
  console.log(`  ${yellow('○')} ${msg}`);
}

export function fail(msg: string): void {
  console.log(`  ${red('✗')} ${msg}`);
}

export function info(msg: string): void {
  console.log(`  ${cyan('·')} ${msg}`);
}

export function heading(msg: string): void {
  console.log(`\n${bold(msg)}`);
}

/** Simple table — array of [label, value, status] rows */
export function table(rows: [string, string, 'ok' | 'warn' | 'missing'][]): void {
  const maxLabel = Math.max(...rows.map(([l]) => l.length));
  for (const [label, value, status] of rows) {
    const icon =
      status === 'ok' ? green('✓') :
      status === 'warn' ? yellow('⚠') :
      red('✗');
    console.log(`  ${icon} ${label.padEnd(maxLabel)}  ${dim(value)}`);
  }
}

import { homedir, platform } from 'node:os';
import { join } from 'node:path';

const home = homedir();
const isWindows = platform() === 'win32';
const isMacOS = platform() === 'darwin';

/** XDG-aware config directory */
function configDir(): string {
  if (isWindows) return join(home, 'AppData', 'Local');
  return process.env['XDG_CONFIG_HOME'] || join(home, '.config');
}

/**
 * Platform-specific config directory for pnpm, mirroring pnpm's own
 * `getConfigDir` logic (see pnpm source: `@pnpm/config/lib/dirs.js`).
 *
 * - `XDG_CONFIG_HOME` wins on every platform when set.
 * - macOS: `~/Library/Preferences/pnpm` (NOT `~/.config/pnpm` — pnpm
 *   follows macOS conventions there and ignores XDG paths by default).
 * - Linux / other POSIX: `~/.config/pnpm`.
 * - Windows: `%LOCALAPPDATA%\pnpm\config`, or fallback to `~/.config/pnpm`.
 *
 * Writing to the wrong path silently disables quarantine — pnpm reads
 * the `globalconfig` location only, and won't notice settings placed
 * elsewhere.
 */
function pnpmConfigDir(): string {
  const xdg = process.env['XDG_CONFIG_HOME'];
  if (xdg) return join(xdg, 'pnpm');
  if (isMacOS) return join(home, 'Library', 'Preferences', 'pnpm');
  if (!isWindows) return join(home, '.config', 'pnpm');
  const localAppData = process.env['LOCALAPPDATA'];
  if (localAppData) return join(localAppData, 'pnpm', 'config');
  return join(home, '.config', 'pnpm');
}

/** OS-specific paths for each manager's config file */
export const paths = {
  home,

  /** ~/.config/quarantine/config.toml */
  quarantineConfig: join(configDir(), 'quarantine', 'config.toml'),

  /** ~/.npmrc */
  npmrc: join(home, '.npmrc'),

  /** pnpm global rc — platform-specific (see `pnpmConfigDir`) */
  pnpmrc: join(pnpmConfigDir(), 'rc'),

  /** ~/.bunfig.toml */
  bunfig: join(home, '.bunfig.toml'),

  /** ~/.yarnrc.yml (global — but yarn quarantine is per-project) */
  yarnrc: join(home, '.yarnrc.yml'),

  /** ~/.config/uv/uv.toml */
  uvToml: join(configDir(), 'uv', 'uv.toml'),

  /** ~/.config/pip/pip.conf */
  pipConf: join(configDir(), 'pip', 'pip.conf'),

  /** ~/.gemrc */
  gemrc: join(home, '.gemrc'),

  /** ~/.bundle/config */
  bundleConfig: join(home, '.bundle', 'config'),

  /** ~/.config/composer/config.json */
  composerConfig: join(configDir(), 'composer', 'config.json'),
} as const;

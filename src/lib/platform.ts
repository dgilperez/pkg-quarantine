import { homedir, platform } from 'node:os';
import { join } from 'node:path';

const home = homedir();
const isWindows = platform() === 'win32';

/** XDG-aware config directory */
function configDir(): string {
  if (isWindows) return join(home, 'AppData', 'Local');
  return process.env['XDG_CONFIG_HOME'] || join(home, '.config');
}

/** OS-specific paths for each manager's config file */
export const paths = {
  home,

  /** ~/.config/quarantine/config.toml */
  quarantineConfig: join(configDir(), 'quarantine', 'config.toml'),

  /** ~/.npmrc */
  npmrc: join(home, '.npmrc'),

  /** ~/.config/pnpm/rc */
  pnpmrc: join(configDir(), 'pnpm', 'rc'),

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

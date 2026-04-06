import type { FileSystem, Shell, ManagerName } from '../types.js';
import type { ManagerHandler } from './base.js';
import { NpmHandler } from './npm.js';
import { PnpmHandler } from './pnpm.js';
import { BunHandler } from './bun.js';
import { YarnHandler } from './yarn.js';
import { DenoHandler } from './deno.js';
import { UvHandler } from './uv.js';
import { PipHandler } from './pip.js';
import { GemHandler } from './gem.js';
import { ComposerHandler } from './composer.js';
import { GoHandler } from './go.js';
import { BrewHandler } from './brew.js';
import { CargoHandler } from './cargo.js';
import { HexHandler } from './hex.js';

type HandlerFactory = new (
  fs: FileSystem,
  shell: Shell,
  quarantineDays: number,
) => ManagerHandler;

const FACTORIES: Record<ManagerName, HandlerFactory> = {
  npm: NpmHandler,
  pnpm: PnpmHandler,
  bun: BunHandler,
  yarn: YarnHandler,
  deno: DenoHandler,
  uv: UvHandler,
  pip: PipHandler,
  gem: GemHandler,
  composer: ComposerHandler,
  go: GoHandler,
  brew: BrewHandler,
  cargo: CargoHandler,
  hex: HexHandler,
};

/** Create a handler instance for a given manager */
export function createHandler(
  name: ManagerName,
  fs: FileSystem,
  shell: Shell,
  quarantineDays: number,
): ManagerHandler {
  const Factory = FACTORIES[name];
  return new Factory(fs, shell, quarantineDays);
}

/** Create handler instances for multiple managers */
export function createHandlers(
  names: ManagerName[],
  fs: FileSystem,
  shell: Shell,
  quarantineDays: number,
): ManagerHandler[] {
  return names.map((name) => createHandler(name, fs, shell, quarantineDays));
}

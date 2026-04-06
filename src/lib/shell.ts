import { spawnSync } from 'node:child_process';
import type { Shell, ShellResult } from '../types.js';

/** Real shell implementation using spawnSync */
export class RealShell implements Shell {
  exec(command: string, args: string[]): ShellResult {
    const result = spawnSync(command, args, {
      encoding: 'utf-8',
      timeout: 30_000,
      shell: false,
    });

    return {
      stdout: result.stdout?.trim() ?? '',
      stderr: result.stderr?.trim() ?? '',
      exitCode: result.status ?? 1,
    };
  }

  which(command: string): string | null {
    const result = this.exec('which', [command]);
    return result.exitCode === 0 ? result.stdout : null;
  }
}

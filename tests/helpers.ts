/**
 * Shared test helpers — mock FileSystem and Shell with DI.
 */
import type { FileSystem, Shell, ShellResult } from '../src/types.js';

/** In-memory filesystem mock */
export function mockFs(files: Record<string, string> = {}): FileSystem & { store: Map<string, string> } {
  const store = new Map(Object.entries(files));
  return {
    store,
    async readFile(path: string) { return store.get(path) ?? null; },
    async writeFile(path: string, content: string) { store.set(path, content); },
    async exists(path: string) { return store.has(path); },
    async mkdir() {},
  };
}

type ExecHandler = (cmd: string, args: string[]) => ShellResult;
type WhichHandler = (cmd: string) => string | null;

/** Shell mock with configurable exec and which behavior */
export function mockShell(opts: {
  installed?: string[];
  exec?: ExecHandler;
  npmVersion?: string;
} = {}): Shell {
  const installed = new Set(opts.installed ?? []);
  const npmVersion = opts.npmVersion ?? '10.2.3';
  const defaultExec: ExecHandler = (cmd, args) => {
    if (cmd === 'npm' && args.includes('--version')) {
      return { stdout: npmVersion, stderr: '', exitCode: 0 };
    }
    return { stdout: '', stderr: '', exitCode: 0 };
  };
  return {
    exec: opts.exec ?? defaultExec,
    which(cmd: string) {
      return installed.has(cmd) ? `/usr/bin/${cmd}` : null;
    },
  };
}

/** Capture console.log output */
export function captureOutput(fn: () => Promise<void> | void): Promise<string[]> {
  const logs: string[] = [];
  const spy = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
    logs.push(args.map(String).join(' '));
  });
  const result = fn();
  if (result && typeof result.then === 'function') {
    return result.then(() => { spy.mockRestore(); return logs; });
  }
  spy.mockRestore();
  return Promise.resolve(logs);
}

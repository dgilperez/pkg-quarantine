/** Dependency-injection interface for filesystem operations */
export interface FileSystem {
  readFile(path: string): Promise<string | null>;
  writeFile(path: string, content: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  mkdir(path: string): Promise<void>;
}

/** Result of a shell command */
export interface ShellResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/** Dependency-injection interface for shell operations */
export interface Shell {
  exec(command: string, args: string[]): ShellResult;
  which(command: string): string | null;
}

/** A package that can be updated */
export interface OutdatedPackage {
  name: string;
  current: string;
  latest: string;
  publishDate?: Date;
}

/** Result of an age check */
export interface AgeCheckResult {
  name: string;
  version: string;
  publishDate: Date;
  ageDays: number;
  allowed: boolean;
}

/** Traffic-light audit status for a single config key */
export type AuditStatus = 'ok' | 'warn' | 'missing';

/** Audit result for a single manager */
export interface AuditResult {
  manager: string;
  installed: boolean;
  checks: AuditCheck[];
}

export interface AuditCheck {
  key: string;
  expected: string;
  actual: string | null;
  status: AuditStatus;
  message?: string;
}

/** What a manager wants its quarantine config to look like */
export interface DesiredSetting {
  key: string;
  value: string;
  description: string;
}

/** Supported package manager names */
export type ManagerName =
  | 'npm'
  | 'pnpm'
  | 'bun'
  | 'yarn'
  | 'deno'
  | 'uv'
  | 'pip'
  | 'gem'
  | 'composer'
  | 'go'
  | 'brew'
  | 'cargo'
  | 'hex';

export const ALL_MANAGERS: ManagerName[] = [
  'npm', 'pnpm', 'bun', 'yarn', 'deno',
  'uv', 'pip', 'gem', 'composer', 'go', 'brew',
  'cargo', 'hex',
];

/** Global user config stored in ~/.config/quarantine/config.toml */
export interface QuarantineConfig {
  quarantine_days: number;
  managers: ManagerName[];
}

export const DEFAULT_QUARANTINE_DAYS = 4;

export const DEFAULT_CONFIG: QuarantineConfig = {
  quarantine_days: DEFAULT_QUARANTINE_DAYS,
  managers: ['npm', 'pnpm', 'bun', 'uv', 'pip', 'gem', 'composer', 'go', 'brew', 'cargo', 'hex'],
};

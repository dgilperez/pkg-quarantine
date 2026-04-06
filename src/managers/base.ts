import type {
  FileSystem,
  Shell,
  ManagerName,
  DesiredSetting,
  AuditResult,
  AuditCheck,
  OutdatedPackage,
} from '../types.js';

/** Abstract base class for all package manager handlers */
export abstract class ManagerHandler {
  constructor(
    protected readonly fs: FileSystem,
    protected readonly shell: Shell,
    protected readonly quarantineDays: number,
  ) {}

  abstract readonly name: ManagerName;
  abstract readonly displayName: string;
  abstract readonly configPath: string;

  /** Whether this manager's quarantine is per-project only (not global) */
  readonly projectOnly: boolean = false;

  /** Settings this manager should have for quarantine */
  abstract getDesiredSettings(): DesiredSetting[];

  /** Read current config, merge quarantine settings, return new content */
  abstract mergeConfig(dryRun: boolean): Promise<{ path: string; content: string; changed: boolean }>;

  /** List globally outdated packages */
  abstract getOutdated(): OutdatedPackage[];

  /** Audit current config against desired quarantine state */
  async audit(): Promise<AuditResult> {
    const content = await this.fs.readFile(this.configPath);
    const checks = this.auditConfig(content);

    return {
      manager: this.name,
      installed: this.isInstalled(),
      checks,
    };
  }

  /** Check if the manager binary is available */
  isInstalled(): boolean {
    return this.shell.which(this.binaryName) !== null;
  }

  /** The binary name to check for (defaults to manager name) */
  protected get binaryName(): string {
    return this.name;
  }

  /** Compare current config content against desired settings */
  protected abstract auditConfig(content: string | null): AuditCheck[];
}

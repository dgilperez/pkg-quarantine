# pkg-quarantine

Unified quarantine policy for package managers. Block recently-published packages to prevent supply-chain attacks.

## Why

The Axios npm supply-chain attack (March 2026) injected a RAT via a hijacked maintainer account. Malicious package versions are typically detected and removed within 72 hours. A 4-day quarantine blocks installation of anything published too recently, catching the vast majority of these attacks.

Most package managers have some form of quarantine support, but it's fragmented across different config formats and settings. `pkg-quarantine` is a single command that configures all of them.

## Install

```bash
npm install -g pkg-quarantine
```

Requires Node.js 18+.

## Commands

```bash
quarantine init [managers...]        # Write/merge quarantine configs
quarantine audit [managers...]       # Traffic-light config report
quarantine status                    # Quick policy summary
quarantine update [managers...]      # Quarantine-aware global updater
```

### `quarantine init`

Writes quarantine settings to each manager's global config file. Existing settings and auth tokens are preserved.

```bash
quarantine init                  # All detected managers
quarantine init npm pnpm uv     # Specific managers
quarantine init --dry-run        # Preview without writing
quarantine init --days 7         # Custom quarantine period
```

### `quarantine audit`

Checks current config against desired quarantine state. Traffic-light output: green (configured), yellow (wrong value), red (missing).

```bash
quarantine audit           # All detected managers
quarantine audit npm       # Just npm
```

### `quarantine status`

One-line-per-manager summary of quarantine posture.

### `quarantine update`

Quarantine-aware global package updater. Checks each outdated package's publish date against the registry API before upgrading.

```bash
quarantine update                    # All managers
quarantine update npm                # Just npm
quarantine update --dry-run          # Preview without installing
quarantine update --force            # Bypass quarantine (with warning)
```

## Supported Managers

| Manager | Quarantine mechanism | What `init` configures |
|---------|---------------------|----------------------|
| **npm** | `min-release-age` in ~/.npmrc | `min-release-age`, `ignore-scripts`, `audit-level` |
| **pnpm** | `minimumReleaseAge` in rc | `minimumReleaseAge` (minutes), `ignore-scripts` |
| **bun** | `minimumReleaseAge` in bunfig.toml | `install.minimumReleaseAge` (seconds), `frozenLockfile` |
| **yarn** | `npmMinimalAgeGate` in .yarnrc.yml | Per-project only (prints instructions) |
| **deno** | `minimumDependencyAge` in deno.json | Per-project only (prints instructions) |
| **uv** | `exclude-newer` in uv.toml | `exclude-newer = "N days"` |
| **pip** | Registry API check during update | `only-binary = :all:` |
| **gem** | Registry API check during update | `BUNDLE_TRUST___POLICY: MediumSecurity` |
| **composer** | Registry API check during update | `no-scripts`, `allow-plugins={}`, `audit.block-insecure` |
| **go** | sumdb verification (default) | Verifies sumdb active, recommends govulncheck |
| **brew** | No native quarantine | Warns about third-party taps |
| **cargo** | Registry API check during update | Recommends cargo-audit |
| **hex** | Registry API check during update | Recommends mix_audit |

## Configuration

Global config lives at `~/.config/quarantine/config.toml`:

```toml
quarantine_days = 4
managers = ["npm", "pnpm", "bun", "uv", "pip", "gem", "composer", "go", "brew", "cargo", "hex"]
```

If the file doesn't exist, defaults are used (4 days, all managers except yarn/deno which are per-project).

## Design

- **2 runtime dependencies**: `commander` + `@iarna/toml`. Zero transitive deps.
- **Dependency injection**: All commands receive `FileSystem` and `Shell` interfaces. Tests use in-memory mocks.
- **Auth-token safe**: The custom `.npmrc` parser treats `//` lines as scoped registry entries (not comments), preserving auth tokens.
- **Native `fetch()`**: Registry API calls use Node's built-in fetch (no HTTP library deps).

## Development

```bash
npm test              # Run tests
npm run build         # Build ESM + CJS
npm run lint          # Type-check
npm run test:watch    # Watch mode
```

## License

MIT

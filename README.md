```
  ╔══╦══╦══╗   ╔═╗ ╦ ╦╔═╗╦═╗╔═╗╔╗╔╔╦╗╦╔╗╔╔═╗
  ╠══╬══╬══╣   ║═╬╗║ ║╠═╣╠╦╝╠═╣║║║ ║ ║║║║║╣
  ╚══╩══╩══╝   ╩ ╩╚╚═╝╩ ╩╩╚═╩ ╩╝╚╝ ╩ ╩╝╚╝╚═╝

  [ pkg ]──wait 4 days──>[ install ]  ← supply-chain blocker
```

[![npm version](https://img.shields.io/npm/v/pkg-quarantine)](https://www.npmjs.com/package/pkg-quarantine)
[![license](https://img.shields.io/npm/l/pkg-quarantine)](LICENSE)
[![node](https://img.shields.io/node/v/pkg-quarantine)](package.json)

**Block freshly-published packages before they reach your machine.**

One command configures a 4-day quarantine across npm, pnpm, bun, uv, pip, gem, composer, go, cargo, and more. Malicious versions of hijacked packages are almost always detected and pulled within 72 hours — a 4-day hold catches the entire window.

```bash
npm install -g pkg-quarantine
quarantine init
```

That's it. Every package manager on your machine now silently rejects anything published in the last 4 days.

---

## Why this exists

The Axios supply-chain attack (March 2026) injected a remote access trojan via a hijacked maintainer account. The malicious version was live for ~18 hours before detection. It was installed by thousands of CI pipelines and developer machines before anyone noticed.

This pattern keeps repeating:
- Maintainer account compromise → malicious version published
- Typosquatting → `cros-env` instead of `cross-env`
- Dependency confusion → private package names published to public registries

**The exploit window is short.** Security teams typically detect and pull malicious packages within 24–72 hours. A 4-day quarantine makes your machine invisible to this entire class of attack.

Most package managers have some form of quarantine support — it's just scattered across different formats and options. `pkg-quarantine` configures all of them at once.

---

## Commands

```bash
quarantine init [managers...]        # Write/merge quarantine configs
quarantine audit [managers...]       # Traffic-light config report
quarantine status                    # Quick policy summary
quarantine update [managers...]      # Quarantine-aware global updater
```

### `quarantine init`

Writes quarantine settings to each manager's global config file. Existing settings and auth tokens are preserved — it merges, never clobbers.

```bash
quarantine init                  # All detected managers
quarantine init npm pnpm uv      # Specific managers
quarantine init --dry-run        # Preview without writing
quarantine init --days 7         # Custom quarantine period
```

### `quarantine audit`

Checks current config against desired quarantine state. Traffic-light output:

```
  npm     ✓ configured    min-release-age=4 days
  pnpm    ✓ configured    minimumReleaseAge=5760 minutes
  uv      ✗ missing       add exclude-newer to ~/.config/uv/uv.toml
  pip     ~ wrong value   only-binary not set
```

### `quarantine status`

One-line-per-manager summary of quarantine posture.

### `quarantine update`

Quarantine-aware global package updater. Checks each outdated package's publish date against the registry API before upgrading. Won't install anything that's too fresh — even if you ask it to.

```bash
quarantine update                    # All managers
quarantine update npm                # Just npm
quarantine update --dry-run          # Preview without installing
quarantine update --force            # Bypass quarantine (with warning)
```

---

## For AI agents

**If you use Claude Code, Codex, Cursor, or any AI coding assistant that can install packages — this is especially for you.**

AI agents install dependencies automatically, often without a human reviewing the exact version or publish date. That's fine for productivity. It's a supply-chain risk if the agent happens to install a freshly-hijacked package.

`quarantine init` enforces the policy at the package manager level, so it applies to *every* install — whether a human typed it or an agent did.

### Setting it up once

```bash
# Install and configure everything:
npm install -g pkg-quarantine
quarantine init
```

After that, `npm install`, `pip install`, `uv add`, etc. will all silently enforce the quarantine with no further action needed.

### Instructing your agent

Add this to your `CLAUDE.md` (or equivalent agent instructions file):

```markdown
## Package Security

A 4-day quarantine policy is enforced across all package managers via pkg-quarantine.
This blocks installation of any package version published less than 4 days ago.

Rules:
- Never run bare `npm install -g <pkg>@latest` — use `quarantine update` instead.
- Before manually installing an unfamiliar package, check its publish date.
- If a package install fails with a quarantine error, report it rather than bypassing it.
- The quarantine is a safety net, not an obstacle. Work within it.
```

### Verifying your agent respects it

```bash
quarantine audit        # Check all manager configs are set
quarantine status       # One-line status summary
```

If an agent tries to bypass quarantine with `--ignore-scripts=false` or `--force`, treat that as a signal to review what it's installing.

### For CI pipelines

Add quarantine verification to your CI setup step:

```yaml
- name: Verify quarantine policy
  run: |
    npm install -g pkg-quarantine
    quarantine audit --exit-code   # exits 1 if any manager is misconfigured
```

---

## Supported managers

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

---

## Configuration

Global config at `~/.config/quarantine/config.toml`:

```toml
quarantine_days = 4
managers = ["npm", "pnpm", "bun", "uv", "pip", "gem", "composer", "go", "brew", "cargo", "hex"]
```

Defaults apply if the file doesn't exist: 4-day hold, all managers (yarn and deno are per-project only).

---

## Design

- **2 runtime dependencies**: `commander` + `@iarna/toml`. Zero transitive deps.
- **Dependency injection**: All commands receive `FileSystem` and `Shell` interfaces. Tests use in-memory mocks — no disk or network in tests.
- **Auth-token safe**: The custom `.npmrc` parser treats `//` lines as scoped registry entries (not comments), preserving all auth tokens intact.
- **Native `fetch()`**: Registry API calls use Node's built-in fetch. No HTTP library dependency.
- **Merge, never clobber**: `init` reads existing config before writing, preserving all unrelated settings.

---

## Development

```bash
npm test              # Run tests
npm run build         # Build ESM + CJS
npm run lint          # Type-check
npm run test:watch    # Watch mode
```

---

## License

MIT

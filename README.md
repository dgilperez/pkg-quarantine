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

One command configures a release-age cooldown across every supported package manager on your machine. Malicious versions of hijacked packages are typically [detected and pulled within hours to a few days](https://socket.dev/blog/npm-introduces-minimumreleaseage-and-bulk-oidc-configuration) — a 4-day hold sits comfortably outside that window.

```bash
npm install -g pkg-quarantine
quarantine init
```

That's it. For managers with native release-age support (npm, pnpm, bun, uv, yarn, deno), every install now silently rejects anything published in the last 4 days. For managers without it (pip, gem, composer, cargo, hex), `quarantine update` enforces the same policy at update time.

---

## Why this exists

The [axios supply-chain compromise](https://www.elastic.co/security-labs/axios-one-rat-to-rule-them-all) (March 31, 2026) injected a cross-platform RAT through a hijacked maintainer account. `axios@1.14.1` shipped at 00:21 UTC; Elastic Security Labs filed an advisory at 01:50 UTC. In the ~90 minutes between publish and disclosure — and the longer window before npm pulled the package — both the `latest` and `legacy` dist-tags pointed at compromised versions, so the majority of fresh installs picked up a backdoored release.

This pattern keeps repeating:
- Maintainer account compromise → malicious version published
- Typosquatting → `cros-env` instead of `cross-env`
- Dependency confusion → private package names published to public registries

**The exploit window is short.** Security teams and automated scanners ([Snyk](https://snyk.io/blog/axios-npm-package-compromised-supply-chain-attack-delivers-cross-platform/), [StepSecurity](https://www.stepsecurity.io/blog/axios-compromised-on-npm-malicious-versions-drop-remote-access-trojan), [Socket](https://socket.dev/blog/npm-introduces-minimumreleaseage-and-bulk-oidc-configuration)) typically detect and pull malicious packages within hours to a few days of publication. A 4-day quarantine puts your machine outside that window for the bulk of supply-chain attacks.

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

Quarantine-aware global package updater. Checks each outdated package's publish date against the registry API before upgrading. Refuses to install anything that's too fresh unless you pass `--force`.

```bash
quarantine update                    # All managers
quarantine update npm                # Just npm
quarantine update --dry-run          # Preview without installing
quarantine update --force            # Bypass quarantine (prints a warning)
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

`pkg-quarantine` covers 13 package managers, but they fall into three honest tiers depending on what the underlying tool supports.

### Tier 1 — Native install-time quarantine

These managers ship a built-in release-age gate. `init` writes the setting and *every* install (manual or via an AI agent) is automatically protected.

| Manager | Mechanism | Notes |
|---------|-----------|-------|
| **npm** | `min-release-age` in `~/.npmrc` | **Requires npm ≥ 11.10.0** (Feb 2026). Earlier versions silently ignore the setting — `quarantine audit` warns. |
| **pnpm** | `minimumReleaseAge` (minutes) in pnpm rc | — |
| **bun** | `install.minimumReleaseAge` (seconds) in `bunfig.toml` | — |
| **uv** | `exclude-newer = "N days"` in `uv.toml` | — |
| **yarn** | `npmMinimalAgeGate` in `.yarnrc.yml` | Per-project only — `init` prints the snippet to add. |
| **deno** | `minimumDependencyAge` in `deno.json` | Per-project only — `init` prints the snippet to add. |

### Tier 2 — Update-time quarantine via `quarantine update`

These managers have no native release-age config, so install-time enforcement isn't possible. `quarantine update` checks the registry API before upgrading and refuses fresh versions. Bare `pip install foo` / `gem install foo` / etc. are *not* gated — you must use `quarantine update`.

| Manager | Registry checked | Hardening `init` configures |
|---------|------------------|------------------------------|
| **pip** | PyPI JSON API | `only-binary = :all:` (blocks source-build attacks; not a quarantine itself) |
| **gem** | rubygems.org API | `BUNDLE_TRUST___POLICY: MediumSecurity` |
| **composer** | packagist API | `no-scripts`, `allow-plugins={}`, `secure-http` |
| **cargo** | crates.io API | Recommends `cargo-audit` |
| **hex** | hex.pm API | Recommends `mix_audit` |

> Composer 2.9+ already enables `audit.block-insecure` by default, so `init` no longer writes that setting.

### Tier 3 — Audit and recommendation only

These managers don't have a release-age model at all. `init` prints best-practice recommendations and `audit` reports posture; there is no enforcement.

| Manager | What `init` does |
|---------|------------------|
| **go** | Verifies sumdb is active, recommends `govulncheck` |
| **brew** | Lists third-party taps as a posture warning |

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

# Changelog

All notable changes to this project are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.4] — 2026-04-23

### Fixed

- **Critical: pnpm quarantine was silently ineffective on macOS.** Two
  independent bugs cancelled each other's symptoms so `quarantine audit`
  reported green while pnpm continued to install fresh packages.
  - **Wrong config path on macOS.** pnpm follows Apple's preferences
    convention — its global rc lives at `~/Library/Preferences/pnpm/rc`
    on darwin (see pnpm's own `getConfigDir`), *not* the XDG
    `~/.config/pnpm/rc` this tool was writing to. pnpm silently ignored
    the file. Linux users with XDG-style paths were unaffected.
  - **Wrong setting key.** Previous versions wrote `minimumReleaseAge`
    (camelCase). That alias is accepted by `pnpm config list` but is
    *not* applied during install resolution — only the kebab-case
    `minimum-release-age` actually gates installs. Reproduce on any
    platform by placing the camelCase form in the correct rc file and
    running `pnpm add <pkg>@<fresh-version>`: install proceeds.
- `paths.pnpmrc` now mirrors pnpm's own platform branches (XDG →
  macOS → POSIX → Windows) instead of assuming XDG everywhere.
- `quarantine audit pnpm` now flags legacy `minimumReleaseAge` entries
  as `missing` so anyone upgrading from 0.1.3 gets a warning at audit
  time instead of silent non-protection.

### Migration

If you ran `quarantine init` on macOS with 0.1.3 or earlier:

1. `quarantine init pnpm` to write the correct config (new path + key).
2. Delete the stale `~/.config/pnpm/rc` to avoid confusion — pnpm wasn't
   reading it anyway.
3. Verify: `pnpm config get minimum-release-age` should return `5760`.

## [0.1.3] — 2026-04-08

### Fixed

- README header now renders correctly on npmjs.com. The previous version
  used Unicode box-drawing characters to spell "QUARANTINE" — these
  rendered fine on GitHub but came out as scrambled glyphs on npm because
  npm's monospace font doesn't space the box-drawing chars correctly.
  Replaced with a clean H1 + tagline.
- The "Instructing your agent" section's nested markdown code block was
  being clipped on the right edge on npmjs.com (npm's code blocks don't
  word-wrap and the lines were too long). Lines have been hard-wrapped to
  fit a ~55-character column.
- Badge links now point to absolute GitHub URLs (`blob/master/LICENSE`,
  `blob/master/package.json`) instead of bare relative paths.

## [0.1.2] — 2026-04-08

### Fixed

- **Critical: npm version compatibility check now requires npm ≥ 11.10.0.**
  Previously the check used `MIN_SUPPORTED_MAJOR = 10`, which silently passed
  on every npm 10.x and 11.0–11.9 install — but `min-release-age` only shipped
  in npm 11.10.0 (Feb 2026). On older npm, the setting is silently ignored
  *and* npm warns it will hard-error in the next major. The audit was reporting
  green while providing zero protection. Compat check now does a proper semver
  comparison and the warning message tells the user exactly what to upgrade.
- README install snippet for `quarantine audit --exit-code` now actually exists
  (see Added below).
- README contradiction: `update --force` is now acknowledged in the description
  of `quarantine update`.
- README "supported managers" table reorganised into three honest tiers:
  native install-time quarantine, update-time quarantine, audit-only.
- Removed `composer.audit.block-insecure` from `init` — Composer 2.9+ enables
  it by default and the setting cannot be reliably applied via global
  `~/.config/composer/config.json` (see [composer/composer#12611](https://github.com/composer/composer/issues/12611)).

### Added

- `quarantine audit --exit-code` flag for CI integration. Exits 1 if any
  manager has warnings or missing settings. The README CI snippet now matches
  the implementation.
- `auditCommand()` returns `{ ok, warn, missing }` totals so callers (and
  tests) can introspect the result.

## [0.1.1] — 2026-04-07

### Fixed

- `NpmHandler.audit()` now emits an `npm-version-compat` warning when the
  installed npm is older than v10, explaining the `--before` / `min-release-age`
  interaction and providing an upgrade command ([#2]).
- Shared test `mockShell` helper now returns a sensible `10.2.3` npm version
  by default so audit tests aren't polluted by the version check.

## [0.1.0] — 2026-04-06

### Added

- `quarantine init` — write/merge quarantine config for all detected managers.
- `quarantine audit` — traffic-light report: green (ok), yellow (wrong value),
  red (missing).
- `quarantine status` — one-line-per-manager policy summary.
- `quarantine update` — quarantine-aware global package updater; checks publish
  dates via registry APIs before upgrading.
- Support for 13 package managers: npm, pnpm, bun, yarn, deno, uv, pip, gem,
  composer, go, brew, cargo, hex.
- Global config at `~/.config/quarantine/config.toml` with `quarantine_days`
  and `managers` fields.
- Auth-token-safe `.npmrc` parser (`//` lines preserved as scoped registry
  entries, not comments).
- Dependency-injection design: all commands receive `FileSystem` and `Shell`
  interfaces — zero disk or network I/O in tests.
- Native `fetch()` for registry API calls — no HTTP library dependency.
- 130+ tests across 27 test files.

[Unreleased]: https://github.com/dgilperez/pkg-quarantine/compare/v0.1.4...HEAD
[0.1.4]: https://github.com/dgilperez/pkg-quarantine/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/dgilperez/pkg-quarantine/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/dgilperez/pkg-quarantine/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/dgilperez/pkg-quarantine/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/dgilperez/pkg-quarantine/releases/tag/v0.1.0

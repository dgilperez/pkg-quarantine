# Changelog

All notable changes to this project are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
- 131 tests across 27 test files.

[Unreleased]: https://github.com/dgilperez/pkg-quarantine/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/dgilperez/pkg-quarantine/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/dgilperez/pkg-quarantine/releases/tag/v0.1.0

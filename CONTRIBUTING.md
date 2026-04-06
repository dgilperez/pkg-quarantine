# Contributing to pkg-quarantine

Thanks for your interest. Contributions are welcome — bug reports, documentation
improvements, new manager support, and feature requests.

## Quick start

```bash
git clone https://github.com/dgilperez/pkg-quarantine.git
cd pkg-quarantine
npm install
npm test
```

## Before you open a PR

1. **Run the tests.** All 137 tests must pass.
   ```bash
   npm test
   ```

2. **Type-check.** No TypeScript errors.
   ```bash
   npm run lint
   ```

3. **One concern per PR.** A PR that fixes a bug, another that adds a feature.
   Don't mix them.

4. **Tests are required.** Every new behavior needs a test. The project uses
   dependency injection throughout — `FileSystem` and `Shell` are injected so
   tests never touch disk or network. Follow the same pattern.

## Adding support for a new package manager

1. Create `src/managers/<name>.ts` extending `ManagerHandler`.
2. Implement `getDesiredSettings()`, `mergeConfig()`, `getOutdated()`, and
   `auditConfig()`.
3. Register it in `src/index.ts` and add it to `ManagerName` in `src/types.ts`.
4. Add tests in `tests/managers/<name>.test.ts`.
5. Update the supported managers table in `README.md`.

## Reporting bugs

Open an issue with:
- Your OS and Node.js version
- The command you ran
- The output you saw
- The output you expected

## Security issues

See [SECURITY.md](SECURITY.md).

## Code style

The project uses TypeScript strict mode. Follow the existing patterns:
- No `any` without a comment explaining why
- Interfaces for DI boundaries (`FileSystem`, `Shell`)
- All commands receive injected deps — never import `fs` or `child_process` directly
- Pure functions where possible

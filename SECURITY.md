# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | Yes       |

## Reporting a vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Please report security issues via GitHub's private vulnerability reporting:
[Report a vulnerability](https://github.com/dgilperez/pkg-quarantine/security/advisories/new)

Include:
- A description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fixes (optional)

You will receive a response within 72 hours. If the issue is confirmed, a fix
will be released as quickly as possible and you will be credited in the
changelog (unless you prefer to remain anonymous).

## Scope

pkg-quarantine is a CLI that reads and writes local config files. The most
relevant attack surfaces:

- **Path traversal**: config file paths are derived from known platform
  locations, not user input. Report any case where user input reaches a file
  path without sanitization.

- **Script execution**: `quarantine init` writes `ignore-scripts=true` to
  prevent npm lifecycle script execution. Report any case where this can be
  bypassed or misconfigured by the tool itself.

- **Registry API calls**: `quarantine update` calls public registry APIs to
  check publish dates. Report any case where these responses could be used to
  inject or execute arbitrary code.

## What is out of scope

- Vulnerabilities in the package managers themselves (npm, pip, etc.)
- Social engineering or phishing
- Issues requiring physical access to the machine

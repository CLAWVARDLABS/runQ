# Security Policy

RunQ is local-first software that records metadata about coding-agent sessions. Security reports are taken seriously because collected event streams can include sensitive workflow context if integrations are misconfigured.

## Supported Versions

| Version | Supported |
| --- | --- |
| `0.2.x` | Yes, local alpha support |
| `< 0.2.0` | No |

APIs and schemas may change before `1.0`. Security fixes may land with breaking changes when needed to protect local data.

## Reporting a Vulnerability

Do not open a public issue for a vulnerability.

Report privately by emailing the project owner or by using GitHub private vulnerability reporting if it is enabled for `THEZIONLABS/runQ`.

Include:

- Affected version or commit.
- Reproduction steps.
- Impact and likely data exposure.
- Whether the issue requires local access, repository access, or a malicious event payload.
- Suggested fix, if known.

## Response Targets

- Acknowledge: within 7 days.
- Initial triage: within 14 days.
- Fix or mitigation plan: based on severity and maintainer availability.

## Security Scope

In scope:

- Raw prompts, command strings, command output, API keys, passwords, or token-looking strings being persisted despite default metadata-first redaction.
- Path traversal, arbitrary file reads/writes, or command execution in CLI, adapters, reporters, or importers.
- Malicious event payloads that break the local UI, API, or SQLite store.
- Npm package contents that unintentionally include local databases, secrets, or build artifacts.

Out of scope:

- Issues requiring a compromised local machine.
- Reports based only on dependency warnings without an exploitable path.
- Denial-of-service against a developer's local-only server unless it causes data loss or secret disclosure.


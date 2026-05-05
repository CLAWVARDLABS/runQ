# Release Process

RunQ releases must be reproducible from a clean checkout and safe for open source users to inspect, install, and test.

## Release Types

- `local-alpha`: preview releases for developers running RunQ locally.
- `developer-preview`: broader public preview once real-session readiness criteria are met.
- `stable`: reserved for `1.0` and later.

`0.2.0` is a `local-alpha` release.

## Required Checks

Run these from the repository root before tagging:

```bash
npm ci
npm test
npm run build
npm run test:e2e
npm run release-check
npm audit --omit=dev
env npm_config_cache=.tmp/npm-cache npm pack --dry-run
```

The Playwright check starts a local Next.js server and verifies the primary user flow plus mobile overflow behavior.

For first-run manual review, generate demo data with:

```bash
node src/cli.js demo --db .runq/demo.db
npm run inbox -- --db .runq/demo.db --port 4545
```

## Manual Product Check

Before publishing an alpha release, manually open the app and check:

- `/agents`
- `/agents/openclaw/sessions`
- `/agents/openclaw/evaluations`
- `/traces?session=<known-session-id>`
- `/agents/openclaw/recommendations`
- `/agents/openclaw/setup`
- `/docs`

Confirm that recommendation accept/dismiss with notes writes a feedback event and that mobile width does not horizontally overflow.

## Tagging

1. Update `CHANGELOG.md`.
2. Confirm `package.json` version matches the intended tag.
3. Commit release changes.
4. Tag with `vX.Y.Z`.
5. Push the branch and tag.
6. Create a GitHub release using the changelog entry.

## Npm Publishing

Only publish to npm after `npm pack --dry-run` shows expected package contents.

Do not publish local databases, `.env` files, `.runq/`, `.next/`, Playwright reports, or test output.

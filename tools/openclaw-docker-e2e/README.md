# RunQ OpenClaw Docker E2E

This harness runs a real OpenClaw CLI turn inside Docker, installs the RunQ native plugin in the container, asks OpenClaw to execute one command, and writes the resulting RunQ SQLite database to a mounted host directory.

```bash
docker build \
  -f tools/openclaw-docker-e2e/Dockerfile \
  -t runq-openclaw-e2e:local .

docker run --rm \
  -e OPENCLAW_E2E_API_KEY="$OPENCLAW_E2E_API_KEY" \
  -e OPENCLAW_E2E_BASE_URL="https://token.clawvard.school/v1" \
  -e OPENCLAW_E2E_PROVIDER="clawvard-token" \
  -e OPENCLAW_E2E_MODEL="MiniMax-M2.7" \
  -v "$PWD/.runq/docker-openclaw:/runq" \
  runq-openclaw-e2e:local
```

The expected output includes one OpenClaw response and one RunQ session in `/runq/openclaw-docker-e2e.db`. The runner fails if OpenClaw responds but RunQ does not capture model-call start/end and exactly one command start/end pair for the session.

The Dockerfile installs the latest published `openclaw` package by default. To test a specific OpenClaw package version:

```bash
docker build \
  --build-arg OPENCLAW_NPM_SPEC=openclaw@2026.5.2 \
  -f tools/openclaw-docker-e2e/Dockerfile \
  -t runq-openclaw-e2e:candidate .
```

Provider names are normalized into OpenClaw provider ids, so `OPENCLAW_E2E_PROVIDER="Clawvard Token"` becomes the model ref `clawvard-token/MiniMax-M2.7`.

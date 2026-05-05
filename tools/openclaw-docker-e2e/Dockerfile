FROM node:22-bookworm-slim

ARG OPENCLAW_NPM_SPEC=openclaw
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates git \
  && rm -rf /var/lib/apt/lists/*
RUN npm install -g "${OPENCLAW_NPM_SPEC}"

WORKDIR /app

COPY adapters ./adapters
COPY src ./src
COPY tools/openclaw-docker-e2e ./tools/openclaw-docker-e2e
COPY package.json ./

ENTRYPOINT ["node", "tools/openclaw-docker-e2e/run.js"]

FROM node:22-bookworm-slim

WORKDIR /app

COPY adapters ./adapters
COPY examples ./examples
COPY src ./src
COPY tools ./tools
COPY package.json ./

ENTRYPOINT ["node", "tools/agent-manager/agent-runner.js"]

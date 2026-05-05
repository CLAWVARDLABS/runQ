#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB_PATH="${RUNQ_DB_PATH:-$HOME/.runq/runq.db}"

mkdir -p "$(dirname "$DB_PATH")"

echo "RunQ local alpha setup"
echo
echo "Project: $ROOT_DIR"
echo "DB:      $DB_PATH"
echo
echo "Configure supported local agent surfaces:"
echo "node $ROOT_DIR/src/cli.js init all --db $DB_PATH"
echo
echo "Supported surfaces: Claude Code, Codex, OpenClaw, Hermes"
echo
echo "Run Inbox:"
echo "npm --prefix $ROOT_DIR run inbox -- --db $DB_PATH --port 4545"
echo
echo "Session export:"
echo "node $ROOT_DIR/src/cli.js export <session_id> --db $DB_PATH"

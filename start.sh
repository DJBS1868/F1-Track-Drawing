#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

PROJECT_DIR="$(pwd -P)"
DIST_DIR="$PROJECT_DIR/dist"
WEB_DIR="${OPENCODE_WEB_DIR:-/home/runner/work/_temp/omgithub-web}"
PORT="${PORT:-3000}"
export PORT

now_ms() { date +%s%3N; }

run_timed() {
  local label="$1"
  shift
  local start end status=0
  start="$(now_ms)"
  "$@" || status=$?
  end="$(now_ms)"
  printf '[timing] %s: %d ms\n' "$label" "$((end - start))"
  return "$status"
}

install_dependencies() {
  if [[ -f package-lock.json ]]; then
    npm ci --no-audit --no-fund
  else
    npm install --no-audit --no-fund
  fi
}

write_deployment_output() {
  mkdir -p "$WEB_DIR"
  node -e '
    const { writeFileSync } = require("node:fs");
    const [output, project, directory] = process.argv.slice(1);
    writeFileSync(output, JSON.stringify({ project, directory }) + "\n");
  ' "$WEB_DIR/deployment-output.json" "$PROJECT_DIR" "$DIST_DIR"
}

[[ "$PORT" =~ ^[0-9]+$ ]] || { echo "PORT must be a number, got: $PORT" >&2; exit 1; }

if [[ ! -d node_modules/three ]] || [[ package-lock.json -nt node_modules/.package-lock.json ]]; then
  run_timed "install dependencies" install_dependencies
else
  printf '[timing] install dependencies: skipped (node_modules up to date)\n'
fi

# Build a self-contained static directory. The project serves prebuilt files and
# needs no runtime framework, so a clean copy is the build step.
run_timed "clean static build" rm -rf "$DIST_DIR"
run_timed "create static build" mkdir -p "$DIST_DIR"
run_timed "copy static files" cp -R index.html styles.css src vendor assets "$DIST_DIR"/
run_timed "verify static build" test -f "$DIST_DIR/index.html"

run_timed "write deployment-output.json" write_deployment_output

printf '[timing] serve: starting static server on port %s from %s\n' "$PORT" "$DIST_DIR"
cd "$DIST_DIR"
exec /usr/bin/time -p node ../server.mjs

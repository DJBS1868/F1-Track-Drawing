#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
PROJECT_DIR="${PROJECT_DIR:-$SCRIPT_DIR}"

: "${CAPTURE_URL:?Set CAPTURE_URL to the preview URL to capture.}"
: "${CAPTURE_DIR:?Set CAPTURE_DIR to an output directory outside the project.}"

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

case "$CAPTURE_URL" in
  http://*|https://*) ;;
  *) echo "CAPTURE_URL must start with http:// or https://: $CAPTURE_URL" >&2; exit 1 ;;
esac

PROJECT_DIR="$(realpath -m "$PROJECT_DIR")"
CAPTURE_DIR="$(realpath -m "$CAPTURE_DIR")"
case "$CAPTURE_DIR/" in
  "$PROJECT_DIR/"*)
    echo "CAPTURE_DIR must be outside the source project: $CAPTURE_DIR" >&2
    exit 1
    ;;
esac

run_timed "create capture directory" mkdir -p "$CAPTURE_DIR"
run_timed "capture desktop and mobile preview" env \
  CAPTURE_URL="$CAPTURE_URL" \
  CAPTURE_DIR="$CAPTURE_DIR" \
  PROJECT_DIR="$PROJECT_DIR" \
  node "$SCRIPT_DIR/capture.mjs"

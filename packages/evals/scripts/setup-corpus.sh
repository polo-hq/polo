#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
EVALS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CORPUS_DIR="${1:-$EVALS_DIR/corpus/eval-corpus}"
BRANCH="${2:-canary}"

if [ -d "$CORPUS_DIR/.git" ]; then
  echo "Corpus already exists at $CORPUS_DIR"
else
  mkdir -p "$(dirname "$CORPUS_DIR")"
  git clone --depth 1 --branch "$BRANCH" https://github.com/vercel/next.js.git "$CORPUS_DIR"
fi

git -C "$CORPUS_DIR" rev-parse HEAD > "$CORPUS_DIR/.eval-commit"

(cd "$EVALS_DIR" && vp exec tsx "scripts/generate-v2-config.ts")

echo "Corpus ready: $CORPUS_DIR"
echo "Pinned commit: $(cat "$CORPUS_DIR/.eval-commit")"

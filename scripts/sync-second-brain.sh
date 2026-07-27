#!/usr/bin/env bash
# AI Second Brain — sync automation.
#
# Passes, in order:
#   1. transcribe audio        -> 03-Notes/Transcripts/
#   2. parse documents         -> 03-Notes/Extracted-Docs/
#   3. consolidate to memory   -> Hermes MEMORY.md/USER.md (read every session)
#   4. build the wiki          -> 04-Wiki/ (interlinked entity/concept pages)
#   5. graphify code graph     -> lam-cyberlab/graphify-out/ (code only)
# Run this whenever new raw files land in the vault's 01-Audio/ or
# 02-Documents/ (default vault: ~/obsidian/memo).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

VENV_PYTHON="$ROOT/.venv-second-brain/bin/python"

if [ ! -x "$VENV_PYTHON" ]; then
  echo "Second-brain venv not found at .venv-second-brain/." >&2
  echo "Set it up first:" >&2
  echo "  uv venv .venv-second-brain" >&2
  echo "  uv pip install -r requirements-second-brain.txt --python .venv-second-brain" >&2
  exit 1
fi

echo "== Pass 1: audio transcription =="
"$VENV_PYTHON" scripts/ingest_audio.py

echo
echo "== Pass 2: document parsing =="
"$VENV_PYTHON" scripts/ingest_docs.py

echo
echo "== Pass 3: memory consolidation =="
if command -v hermes >/dev/null 2>&1; then
  python3 scripts/consolidate_memory.py
else
  echo "hermes CLI not found on PATH — skipping memory consolidation." >&2
fi

echo
echo "== Pass 4: wiki ingest =="
if command -v hermes >/dev/null 2>&1; then
  python3 scripts/wiki_ingest.py
else
  echo "hermes CLI not found on PATH — skipping wiki ingest." >&2
fi

echo
echo "== Pass 4.5: wiki lint =="
python3 scripts/wiki_lint.py --no-llm --save-report || true

echo
echo "== Pass 5: graphify sync =="
if command -v graphify >/dev/null 2>&1; then
  graphify update .
else
  echo "graphify CLI not found on PATH — skipping graph update." >&2
  echo "Install it via one of the 'graphify install' targets, or add it to PATH." >&2
fi

echo
echo "Second brain sync complete."

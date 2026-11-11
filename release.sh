#!/usr/bin/env bash
set -euo pipefail

if ! command -v seed >/dev/null 2>&1; then
  echo "seed not found. Source Dev/shell/seedworks.zsh from ~/.zshrc and reload your shell." >&2
  exit 1
fi

exec seed release coconut "$@"

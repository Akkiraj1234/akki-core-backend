#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

log() {
    printf '\n==> %s\n' "$1"
}

find_python() {
    if command -v python3 >/dev/null 2>&1; then
        printf '%s\n' "python3"
        return
    fi

    if command -v python >/dev/null 2>&1; then
        printf '%s\n' "python"
        return
    fi

    if command -v py >/dev/null 2>&1; then
        printf '%s\n' "py -3"
        return
    fi

    printf 'Python was not found. Install Python 3 and try again.\n' >&2
    exit 1
}

PYTHON_CMD="$(find_python)"
VENV_DIR=".venv"

log "Creating Python virtual environment"
$PYTHON_CMD -m venv "$VENV_DIR"

if [[ -f "$VENV_DIR/Scripts/activate" ]]; then
    # Windows Git Bash/MSYS path.
    # shellcheck disable=SC1091
    source "$VENV_DIR/Scripts/activate"
elif [[ -f "$VENV_DIR/bin/activate" ]]; then
    # Linux/macOS path.
    # shellcheck disable=SC1091
    source "$VENV_DIR/bin/activate"
else
    printf 'Could not find the virtual environment activation script.\n' >&2
    exit 1
fi

if [[ -f "requirements.txt" ]]; then
    log "Installing Python requirements"
    TEMP_REQUIREMENTS="$(mktemp)"
    trap 'rm -f "$TEMP_REQUIREMENTS"' EXIT

    python - "requirements.txt" "$TEMP_REQUIREMENTS" <<'PY'
from pathlib import Path
import sys

source = Path(sys.argv[1])
target = Path(sys.argv[2])
data = source.read_bytes()

for encoding in ("utf-8-sig", "utf-16"):
    try:
        text = data.decode(encoding)
        break
    except UnicodeDecodeError:
        continue
else:
    text = data.decode()

target.write_text(text, encoding="utf-8")
PY

    python -m pip install -r "$TEMP_REQUIREMENTS"
else
    log "Skipping Python requirements; requirements.txt was not found"
fi

if command -v npm >/dev/null 2>&1; then
    log "Installing Node dependencies"
    npm install
    npm fund
else
    printf 'npm was not found. Install Node.js and try again.\n' >&2
    exit 1
fi

if [[ -d ".git" ]] && command -v git >/dev/null 2>&1; then
    log "Initializing Git submodules"
    git submodule update --init --recursive
else
    log "Skipping Git submodules"
fi

log "Development setup complete"

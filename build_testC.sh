#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

find_cmake() {
    if command -v cmake >/dev/null 2>&1; then
        printf '%s\n' "cmake"
        return
    fi
    if command -v cmake.exe >/dev/null 2>&1; then
        printf '%s\n' "cmake.exe"
        return
    fi

    local win_paths=(
        "/c/Program Files/CMake/bin/cmake.exe"
        "/c/Program Files (x86)/CMake/bin/cmake.exe"
    )

    local p
    for p in "${win_paths[@]}"; do
        if [[ -x "$p" ]]; then
            printf '%s\n' "$p"
            return
        fi
    done

    printf 'CMake was not found. Install CMake and/or add it to PATH.\n' >&2
    exit 1
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
    printf 'Python 3 was not found. Install Python and try again.\n' >&2
    exit 1
}

CMAKE_CMD="$(find_cmake)"
PYTHON_CMD="$(find_python)"

"$CMAKE_CMD" -S . -B build
"$CMAKE_CMD" --build build --parallel

# Runs Python false-request checker against the local server.
# Keep main_app running in another terminal before running this script.
$PYTHON_CMD dev/dev_build_test/false_request_test.py --url http://127.0.0.1:3000/does_not_exist --count 25

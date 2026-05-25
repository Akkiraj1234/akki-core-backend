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

CMAKE_CMD="$(find_cmake)"

"$CMAKE_CMD" -S . -B build
"$CMAKE_CMD" --build build --parallel

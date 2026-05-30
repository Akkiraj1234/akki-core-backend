from __future__ import annotations

import curses
import locale
import subprocess
import textwrap
import tomllib
from copy import deepcopy
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


locale.setlocale(locale.LC_ALL, "")

RECURSIVE_CONFIG_SEARCH = 5
FILE_NAME = "testpy.toml"
WINDOW_MARGIN_Y = 1
WINDOW_MARGIN_X = 3
MIN_HEIGHT = 18
MIN_WIDTH = 72

COLOR_SELECTED = 1
COLOR_TITLE = 2
COLOR_TEXT = 3
COLOR_ERROR = 4

DEFAULT_DATA = {
    "theme": "dark",
    "refresh_rate": 60,
    "ui": {
        "border": True,
        "padding": 2,
    },
    "TEST_DIR": "./test/",
}


def merge_dicts(defaults: dict[str, Any], user: dict[str, Any]) -> dict[str, Any]:
    merged = deepcopy(defaults)

    def merge_into(target: dict[str, Any], incoming: dict[str, Any]) -> None:
        for key, value in incoming.items():
            if key in target and isinstance(target[key], dict) and isinstance(value, dict):
                merge_into(target[key], value)
            else:
                target[key] = value

    merge_into(merged, user)
    return merged

def find_config() -> dict[str, Any]:
    current = Path.cwd()

    for _ in range(RECURSIVE_CONFIG_SEARCH):
        config_path = current / FILE_NAME
        if config_path.exists():
            with config_path.open("rb") as file:
                config = tomllib.load(file)
                
            return merge_dicts(DEFAULT_DATA, {**config, "root": current})

        if current == current.parent:
            break

        current = current.parent

    raise FileNotFoundError(f"{FILE_NAME} not found")

class window:
    
    def __init__(self):
        pass



class App:
    
    def __init__(self):
        pass
    
    def run(self, stdscr: curses.window):
        pass



def main():
    config = find_config()
    curses.wrapper(App(config).run)
    
if __name__ == "__main__":
    main()
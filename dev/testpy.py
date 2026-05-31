from __future__ import annotations

import curses
import locale
import textwrap
import subprocess
import textwrap
import tomllib
from copy import deepcopy
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


# Setting up environment
locale.setlocale(locale.LC_ALL, "")

RECURSIVE_CONFIG_SEARCH = 5
FILE_NAME = "testpy.toml"

# Window Defaults
MIN_HEIGHT = 18
MIN_WIDTH = 72

DEFAULT_DATA = {
    "theme": "dark",
    "refresh_rate": 60,
    "ui": {
        "border": True,
        "padding": 2,
        "window_margin_y": 1,
        "window_margin_x": 3,
        
    },
    "TEST_DIR": "./test/",
}

# Temp Color
COLOR_SELECTED = 1
COLOR_TITLE = 2
COLOR_TEXT = 3
COLOR_ERROR = 4



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


class Window:
    def __init__(self, stdscr):
        """
        init the window set up all settings
        and create the window and initial setup
        """
        self.stdscr = stdscr
        self.curses_terminal_settings()
        self.height = 0
        self.width = 0
        
        self.create_window()
        self.set_layout()
        
    def curses_terminal_settings(self):
        self.stdscr.keypad(True)
        curses.start_color()
        curses.use_default_colors()
        curses.init_pair(
            COLOR_TITLE,
            curses.COLOR_CYAN,
            -1
        )
        self.stdscr.timeout(16)
        
    
    def create_window(self):
        """
        create the all windows..
        """
        self.explore = curses.newwin(1, 1, 0, 0)
        self.command = curses.newwin(1, 1, 0, 0)
        self.output = curses.newwin(1, 1, 0, 0)
    
    def set_layout(self):
        """
        Setting up the window layout
        """
        height, width = self.stdscr.getmaxyx()
        
        if height == self.height and width == self.width:
            return
        
        if height < MIN_HEIGHT or width < MIN_WIDTH:
            self._create_small_window(height, width)
            return
            
        # height calculation
        command_h = 3
        main_h = height - command_h
        explore_w = width // 3
        output_w = width - explore_w

        # set new height and width
        self.explore.resize( main_h, explore_w )
        self.explore.mvwin( 0, 0 )
        
        self.output.resize( main_h, output_w )
        self.output.mvwin( 0, explore_w )
        
        self.command.resize( command_h, width )
        self.command.mvwin( main_h, 0)

        # update height and width
        self.height, self.width = height, width
    
    def update_window(self):
        self.explore.erase()
        self.output.erase()
        self.command.erase()
        
        self.explore.box()
        self.output.box()
        self.command.box()

        self.explore.addstr(0, 2, " Explore ")
        self.output.addstr(0, 2, " Output ")
        self.command.addstr(0, 2, " Command ")

        self.explore.noutrefresh()
        self.output.noutrefresh()
        self.command.noutrefresh()
    
    def handle_input(self, key: int) -> bool:
        """
        Return True to exit application.
        """
        if key == -1:
            return 
        
        if key == ord("q"):
            return True

        return False
    
    def cleanup(self):
        print("thanks for using the testpy")
    
    def run(self):
        while True:
            self.set_layout()
            self.update_window()
            curses.doupdate()
            
            key = self.stdscr.getch()
            
            if self.handle_input(key):
                break
            
        self.cleanup()
        
    def _create_small_window(self, height: int, width: int) -> None:
        """
        Create the small window to notify user window is too small
        """
        
        # implement : save old window state if we had
        
        text = (
            f"Window is too small. "
            f"Minimum size is {MIN_HEIGHT}x{MIN_WIDTH}"
        )
        
        lines = textwrap.wrap(text, width=width - 4)
        
        for row, line in enumerate(lines, start=2):
            self.stdscr.addstr(row, 2, line)
        
        self.stdscr.refresh()


class App:
    
    # it will be even driven like tkinter where on even function call nad get data
    
    def __init__(self, config):
        self.config = config
    
    def run(self, stdscr):
        window = Window(stdscr)
        window.run()


def main():
    config = find_config()
    curses.wrapper(App(config).run)
    

if __name__ == "__main__":
    main()
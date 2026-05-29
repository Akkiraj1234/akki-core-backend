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


def resolve_test_root(config: dict[str, Any]) -> Path:
    root = Path(config["root"])
    raw_test_dir = config.get("TEST_DIR", "./test/")
    return (root / raw_test_dir).resolve()


@dataclass(frozen=True)
class Size:
    height: int
    width: int


@dataclass
class WindowResult:
    action: str
    payload: dict[str, Any] = field(default_factory=dict)


class Window:
    title = "Window"

    def draw(self, window: curses.window) -> None:
        raise NotImplementedError

    def handle_key(self, key: int) -> WindowResult | None:
        raise NotImplementedError


class WindowMixin:
    def __init__(self, use_unicode: bool, use_colors: bool) -> None:
        self.use_unicode = use_unicode
        self.use_colors = use_colors

    def _attr_text(self) -> int:
        return curses.color_pair(COLOR_TEXT) if self.use_colors else curses.A_NORMAL

    def _attr_title(self) -> int:
        base = curses.color_pair(COLOR_TITLE) if self.use_colors else curses.A_NORMAL
        return base | curses.A_BOLD

    def _attr_error(self) -> int:
        base = curses.color_pair(COLOR_ERROR) if self.use_colors else curses.A_BOLD
        return base

    def _attr_selected(self) -> int:
        if self.use_colors:
            return curses.color_pair(COLOR_SELECTED) | curses.A_BOLD
        return curses.A_REVERSE | curses.A_BOLD


class TestWindow(Window, WindowMixin):
    title = "Tests"
    EMPTY_BULLET = "○"
    FILLED_BULLET = "●"

    def __init__(self, test_root: Path, use_unicode: bool, use_colors: bool) -> None:
        WindowMixin.__init__(self, use_unicode, use_colors)
        self.test_root = test_root
        self.selected_index = 0
        self.directories = self._scan_dirs()

    def _scan_dirs(self) -> list[Path]:
        if not self.test_root.exists():
            return []
        return sorted([item for item in self.test_root.iterdir() if item.is_dir()], key=lambda item: item.name.lower())

    def draw(self, window: curses.window) -> None:
        height, width = window.getmaxyx()
        self._draw_title(window, width)
        self._draw_info(window, width)

        start_y = 6
        rows = max(height - start_y - 2, 0)
        visible_dirs, start_index = self._visible_dirs(rows)

        if not self.directories:
            self._safe_addstr(window, start_y, 3, "No test folders found.", self._attr_error())
            return

        for offset, folder in enumerate(visible_dirs):
            absolute_index = start_index + offset
            is_selected = absolute_index == self.selected_index
            bullet = self._bullet(is_selected)
            color = self._attr_selected() if is_selected else self._attr_text()
            self._safe_addstr(window, start_y + offset, 3, f"{bullet} {folder.name}", color)

    def handle_key(self, key: int) -> WindowResult | None:
        if key in (curses.KEY_UP, ord("k")):
            self._move(-1)
            return None
        if key in (curses.KEY_DOWN, ord("j")):
            self._move(1)
            return None
        if key in (10, 13, curses.KEY_ENTER):
            if not self.directories:
                return None
            directory = self.directories[self.selected_index]
            return WindowResult(
                action="open_test_dir",
                payload={"path": directory, "name": directory.name},
            )
        if key == ord("r"):
            self.directories = self._scan_dirs()
            self.selected_index = min(self.selected_index, max(len(self.directories) - 1, 0))
        return None

    def _move(self, step: int) -> None:
        if not self.directories:
            return
        self.selected_index = (self.selected_index + step) % len(self.directories)

    def _visible_dirs(self, rows: int) -> tuple[list[Path], int]:
        if rows <= 0:
            return [], 0
        if len(self.directories) <= rows:
            return self.directories, 0

        start = max(0, self.selected_index - (rows // 2))
        max_start = len(self.directories) - rows
        start = min(start, max_start)
        return self.directories[start : start + rows], start

    def _draw_title(self, window: curses.window, width: int) -> None:
        title = f" {self.title} "
        x = max((width - len(title)) // 2, 1)
        self._safe_addstr(window, 0, x, title, self._attr_title())

    def _draw_info(self, window: curses.window, width: int) -> None:
        self._safe_addstr(window, 2, 2, f"Path: {self.test_root}", self._attr_text())
        self._safe_addstr(window, 3, 2, "Enter to open, r to refresh, Ctrl+C to quit", self._attr_text())
        self._safe_hline(window, 4, 1, curses.ACS_HLINE, max(width - 2, 0))

    def _bullet(self, is_selected: bool) -> str:
        if self.use_unicode:
            return self.FILLED_BULLET if is_selected else self.EMPTY_BULLET
        return ">" if is_selected else "-"

    def _safe_addstr(self, window: curses.window, y: int, x: int, text: str, style: int = 0) -> None:
        max_y, max_x = window.getmaxyx()
        if 0 <= y < max_y and 0 <= x < max_x:
            try:
                window.addstr(y, x, text[: max(max_x - x - 1, 0)], style)
            except curses.error:
                pass

    def _safe_hline(self, window: curses.window, y: int, x: int, ch: int, count: int) -> None:
        if count <= 0:
            return
        try:
            window.hline(y, x, ch, count)
        except curses.error:
            pass


class TestDir(Window, WindowMixin):
    title = "Test Directory"

    def __init__(self, test_dir: Path, use_unicode: bool, use_colors: bool) -> None:
        WindowMixin.__init__(self, use_unicode, use_colors)
        self.test_dir = test_dir
        self.input_buffer = ""
        self.output_lines = [
            f"Selected test folder: {test_dir.name}",
            "Type a command and press Enter to run it in this folder.",
            "Press Esc to go back, Ctrl+L to clear output.",
            "",
        ]

    def draw(self, window: curses.window) -> None:
        height, width = window.getmaxyx()
        self._draw_title(window, width)
        self._draw_info(window, width)
        self._draw_output(window, height, width)
        self._draw_prompt(window, height, width)

    def handle_key(self, key: int) -> WindowResult | None:
        if key == 27:
            return WindowResult(action="back")
        if key == 12:
            self.input_buffer = ""
            self.output_lines.clear()
            self.output_lines.append("Output cleared.")
            return WindowResult(action="clear")
        if key in (curses.KEY_BACKSPACE, 127, 8):
            self.input_buffer = self.input_buffer[:-1]
            return None
        if key in (10, 13, curses.KEY_ENTER):
            command = self.input_buffer.strip()
            if not command:
                return None
            self.input_buffer = ""
            return WindowResult(
                action="execute",
                payload={"command": command, "path": self.test_dir, "name": self.test_dir.name},
            )
        if 32 <= key <= 126:
            self.input_buffer += chr(key)
        return None

    def append_command_result(self, command: str, output: str, return_code: int) -> None:
        self.output_lines.append(f"{self.test_dir.name}> {command}")
        if output.strip():
            self.output_lines.extend(output.rstrip().splitlines())
        else:
            self.output_lines.append("[no output]")
        self.output_lines.append(f"[exit code: {return_code}]")
        self.output_lines.append("")

    def append_status(self, message: str, *, is_error: bool = False) -> None:
        prefix = "error: " if is_error else "info: "
        self.output_lines.append(f"{prefix}{message}")
        self.output_lines.append("")

    def _draw_title(self, window: curses.window, width: int) -> None:
        title = f" {self.title}: {self.test_dir.name} "
        x = max((width - len(title)) // 2, 1)
        self._safe_addstr(window, 0, x, title, self._attr_title())

    def _draw_info(self, window: curses.window, width: int) -> None:
        self._safe_addstr(window, 2, 2, f"Directory: {self.test_dir}", self._attr_text())
        self._safe_addstr(window, 3, 2, "Esc to go back, Ctrl+L to clear, Ctrl+C to quit", self._attr_text())
        self._safe_hline(window, 4, 1, curses.ACS_HLINE, max(width - 2, 0))

    def _draw_output(self, window: curses.window, height: int, width: int) -> None:
        start_y = 6
        prompt_row = height - 3
        available_rows = max(prompt_row - start_y, 0)
        wrapped_lines: list[tuple[str, int]] = []

        for line in self.output_lines:
            style = self._attr_error() if line.startswith("error:") else self._attr_text()
            chunks = textwrap.wrap(line, width=max(width - 6, 1)) or [""]
            for chunk in chunks:
                wrapped_lines.append((chunk, style))

        visible_lines = wrapped_lines[-available_rows:]
        for offset, (line, style) in enumerate(visible_lines):
            self._safe_addstr(window, start_y + offset, 3, line, style)

    def _draw_prompt(self, window: curses.window, height: int, width: int) -> None:
        prompt_y = height - 2
        prompt_label = f"{self.test_dir.name}> "
        visible_input_width = max(width - len(prompt_label) - 6, 1)
        visible_input = self.input_buffer[-visible_input_width:]

        self._safe_hline(window, height - 3, 1, curses.ACS_HLINE, max(width - 2, 0))
        self._safe_addstr(window, prompt_y, 2, prompt_label, self._attr_selected())
        self._safe_addstr(window, prompt_y, 2 + len(prompt_label), visible_input, self._attr_text())

    def _safe_addstr(self, window: curses.window, y: int, x: int, text: str, style: int = 0) -> None:
        max_y, max_x = window.getmaxyx()
        if 0 <= y < max_y and 0 <= x < max_x:
            try:
                window.addstr(y, x, text[: max(max_x - x - 1, 0)], style)
            except curses.error:
                pass

    def _safe_hline(self, window: curses.window, y: int, x: int, ch: int, count: int) -> None:
        if count <= 0:
            return
        try:
            window.hline(y, x, ch, count)
        except curses.error:
            pass


class CLIApp:
    def __init__(self, stdscr: curses.window, config: dict[str, Any]) -> None:
        self.stdscr = stdscr
        self.config = config
        self.test_root = resolve_test_root(config)
        self.use_unicode = self._detect_unicode_support()
        self.use_colors = False
        self.window_stack: list[Window] = [TestWindow(self.test_root, self.use_unicode, self.use_colors)]

    @property
    def current_window(self) -> Window:
        return self.window_stack[-1]

    def run(self) -> None:
        self._safe_hide_cursor()
        self.stdscr.keypad(True)
        self._setup_colors()

        while True:
            self.stdscr.erase()
            size = self._current_size()

            if not self._is_size_valid(size):
                self._draw_resize_message(size)
                key = self.stdscr.getch()
                if key == 3:
                    break
                continue

            window = self._create_frame(size)
            self.current_window.draw(window)
            self.stdscr.noutrefresh()
            window.noutrefresh()
            curses.doupdate()

            key = self.stdscr.getch()
            if key == 3:
                break

            result = self.current_window.handle_key(key)
            if result is not None:
                self._handle_result(result)

    def _handle_result(self, result: WindowResult) -> None:
        if result.action == "open_test_dir":
            self.window_stack.append(TestDir(result.payload["path"], self.use_unicode, self.use_colors))
            return

        if result.action == "back":
            if len(self.window_stack) > 1:
                self.window_stack.pop()
            return

        if result.action == "clear":
            return

        if result.action == "execute":
            self._execute_current_command(result.payload)

    def _execute_current_command(self, payload: dict[str, Any]) -> None:
        command = payload["command"]
        path = payload["path"]

        result = subprocess.run(
            command,
            cwd=path,
            shell=True,
            capture_output=True,
            text=True,
        )

        output_parts = []
        if result.stdout:
            output_parts.append(result.stdout)
        if result.stderr:
            output_parts.append(result.stderr)
        output = "\n".join(part.rstrip("\n") for part in output_parts)

        current = self.current_window
        if isinstance(current, TestDir):
            current.append_command_result(command, output, result.returncode)

    def _current_size(self) -> Size:
        height, width = self.stdscr.getmaxyx()
        return Size(height=height, width=width)

    def _is_size_valid(self, size: Size) -> bool:
        return size.height >= MIN_HEIGHT and size.width >= MIN_WIDTH

    def _create_frame(self, size: Size) -> curses.window:
        frame_height = size.height - (WINDOW_MARGIN_Y * 2)
        frame_width = size.width - (WINDOW_MARGIN_X * 2)
        frame = curses.newwin(frame_height, frame_width, WINDOW_MARGIN_Y, WINDOW_MARGIN_X)
        frame.erase()
        frame.box()
        return frame

    def _setup_colors(self) -> None:
        if not curses.has_colors():
            return

        curses.start_color()
        try:
            curses.use_default_colors()
        except curses.error:
            pass

        try:
            curses.init_pair(COLOR_SELECTED, curses.COLOR_YELLOW, -1)
            curses.init_pair(COLOR_TITLE, curses.COLOR_CYAN, -1)
            curses.init_pair(COLOR_TEXT, curses.COLOR_WHITE, -1)
            curses.init_pair(COLOR_ERROR, curses.COLOR_RED, -1)
            self.use_colors = True
        except curses.error:
            self.use_colors = False

    def _safe_hide_cursor(self) -> None:
        try:
            curses.curs_set(0)
        except curses.error:
            pass

    def _draw_resize_message(self, size: Size) -> None:
        lines = [
            "Terminal window is too small",
            f"Current: {size.width}x{size.height}",
            f"Minimum: {MIN_WIDTH}x{MIN_HEIGHT}",
            "Please increase terminal size",
            "Press Ctrl+C to quit",
        ]
        style = (curses.color_pair(COLOR_SELECTED) | curses.A_BOLD) if self.use_colors else (curses.A_REVERSE | curses.A_BOLD)
        self._draw_centered_lines(lines, style)

    def _draw_centered_lines(self, lines: list[str], style: int) -> None:
        height, width = self.stdscr.getmaxyx()
        start_y = max((height - len(lines)) // 2, 0)

        for offset, line in enumerate(lines):
            x = max((width - len(line)) // 2, 0)
            try:
                self.stdscr.addstr(start_y + offset, x, line, style)
            except curses.error:
                pass

        self.stdscr.refresh()

    def _detect_unicode_support(self) -> bool:
        encoding = locale.getpreferredencoding(False).upper()
        return "UTF" in encoding


def main(stdscr: curses.window) -> None:
    config = find_config()
    app = CLIApp(stdscr, config)
    try:
        app.run()
    except KeyboardInterrupt:
        return


if __name__ == "__main__":
    curses.wrapper(main)

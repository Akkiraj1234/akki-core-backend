import os
import sys
import base64
import argparse
import dotenv
import secrets
import asyncio
import threading
import webbrowser
import urllib.parse
import aiohttp
import concurrent.futures
import customtkinter as ctk
import json
from datetime import datetime

from typing import (
    Optional, 
    List, 
    Dict, 
    Any
)
from http.server import (
    BaseHTTPRequestHandler, 
    HTTPServer
)
from pathlib import Path


# Configs files ====================================================
dotenv.load_dotenv("secret.env")
WIDTH, HEIGHT = 300, 400
Title = "Spotify Credential Retriever"
SPOTIFY_PNG = Path(__file__).parent.parent / "resource/spotify.png"
DELETE_PNG = Path(__file__).parent.parent / "resource/delete.png"

SPOTIFY_SCOPES = [
    "user-read-playback-state", 
    "user-read-currently-playing",
    "playlist-read-private",
    "user-top-read",
    "user-read-recently-played"
]
    
# ==================================================================

GUI_REQUESTED = any(arg in ("-gui", "--gui") for arg in sys.argv[1:])
if GUI_REQUESTED:
    from PIL import Image, ImageTk
    import customtkinter as ctk


if GUI_REQUESTED:
    def get_image(path: Path, size = (100, 100)) -> ImageTk:
        if not path.exists():
            raise ValueError("path is not correct")
        img = Image.open(path)
        return ctk.CTkImage(img, size=size)
else:
    class _CtkStub:
        def __getattr__(self, _name):
            return object

    class ImageTk:  # type: ignore[no-redef]
        pass

    ctk = _CtkStub()  # type: ignore[assignment]

    def get_image(path: Path, size = (100, 100)) -> None:
        return None


def random_number_generator(bytes_size:int = 16) -> str:
    """
    Generate a URL-safe cryptographic token.
    """

    return secrets.token_urlsafe(bytes_size)



class SpotifyAuthHandler(BaseHTTPRequestHandler):
    """
    HTTP handler that captures Spotify OAuth callback
    """
    auth_code: Optional[str] = None
    auth_error: Optional[str] = None
    auth_error_description: Optional[str] = None

    def log_message(self, format: str, *args) -> None:
        # Silence default HTTP request logs in terminal.
        return
    
    def do_GET(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        query = urllib.parse.parse_qs(parsed.query)
        SpotifyAuthHandler.auth_error = query.get("error", [None])[0]
        SpotifyAuthHandler.auth_error_description = query.get("error_description", [None])[0]
        SpotifyAuthHandler.auth_code = query.get("code", [None])[0]

        if SpotifyAuthHandler.auth_code:
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.end_headers()

            self.wfile.write(
                b"<html><body><h2>Spotify login successful.</h2>"
                b"<p>You may close this window.</p></body></html>"
            )

        elif SpotifyAuthHandler.auth_error:
            self.send_response(400)
            self.send_header("Content-Type", "text/html")
            self.end_headers()
            self.wfile.write(
                b"<html><body><h2>Spotify login failed.</h2>"
                b"<p>Check your app logs for details.</p></body></html>"
            )
        else:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(b"Authorization failed")


class SpotifyAuth:
    LOGIN_URL: str = "https://accounts.spotify.com/authorize"
    TOKEN_URL: str = "https://accounts.spotify.com/api/token"

    def __init__(self) -> None:
        self.client_id: Optional[str] = os.getenv("SPOTIFY_CLIENT_ID")
        self.client_secret: Optional[str] = os.getenv("SPOTIFY_CLIENT_SECRET")
        self.redirect_uri: Optional[str] = os.getenv("SPOTIFY_REDIRECT_URI")

        if not all([self.client_id, self.client_secret, self.redirect_uri]):
            raise ValueError("Missing Spotify credentials in environment variables")
        
        self.credentials: Optional[Dict[str, Any]] = None
        print("Spotify credentials loaded")

    def build_login_url(self, scopes: Optional[List[str]] = None) -> str:
        params: Dict[str, str] = {
            "client_id": self.client_id,
            "response_type": "code",
            "redirect_uri": self.redirect_uri,
            "state": secrets.token_hex(16),
            "show_dialog": "false",
            "scope": " ".join(scopes) if scopes else ""
        }   
        return f"{self.LOGIN_URL}?{urllib.parse.urlencode(params)}"

    def open_login(self, scopes: Optional[List[str]] = None) -> None:
        url = self.build_login_url(scopes)
        webbrowser.open(url)
        print("Please complete login in your browser")

    def wait_for_callback(self) -> str:
        parsed = urllib.parse.urlparse(self.redirect_uri)
        host = parsed.hostname or "127.0.0.1"
        port = parsed.port or 8888
        SpotifyAuthHandler.auth_code = None
        SpotifyAuthHandler.auth_error = None
        SpotifyAuthHandler.auth_error_description = None
        
        server = HTTPServer((host, port), SpotifyAuthHandler)
        print(f"Waiting for Spotify callback on {host}:{port}...")
        server.handle_request()

        code = SpotifyAuthHandler.auth_code
        if SpotifyAuthHandler.auth_error:
            raise RuntimeError(
                f"Spotify OAuth error: {SpotifyAuthHandler.auth_error}"
                + (
                    f" ({SpotifyAuthHandler.auth_error_description})"
                    if SpotifyAuthHandler.auth_error_description
                    else ""
                )
            )
        if not code:
            raise RuntimeError("Failed to receive authorization code")

        print("Received authorization code")
        return code

    async def exchange_code_async(self, code: str) -> Dict[str, Any]:
        auth_string = f"{self.client_id}:{self.client_secret}"
        auth_base64 = base64.b64encode(auth_string.encode()).decode()

        headers = {
            "Authorization": f"Basic {auth_base64}"
        }
        data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": self.redirect_uri
        }

        timeout = aiohttp.ClientTimeout(total=30)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.post(self.TOKEN_URL, headers=headers, data=data) as response:
                response.raise_for_status()
                self.credentials = await response.json()

        return self.credentials

    async def flow_async(self, scopes: Optional[List[str]] = None) -> Dict[str, Any]:
        await asyncio.to_thread(self.open_login, scopes)
        code = await asyncio.to_thread(self.wait_for_callback)
        try:
            creds = await self.exchange_code_async(code)
        except aiohttp.ClientResponseError as err:
            raise RuntimeError("Failed to receive credentials code") from err

        print("Token session loaded successfully")
        return creds

    def get_credentials(self) -> Optional[Dict[str, Any]]:
        return self.credentials


def save_credentials_to_env(
    creds: Dict[str, Any], env_path: Path = Path("secret.env")
) -> Path:
    current_lines: List[str] = []
    env_map: Dict[str, str] = {}

    if env_path.exists():
        current_lines = env_path.read_text(encoding="utf-8").splitlines()
        for line in current_lines:
            if not line or line.strip().startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            env_map[key.strip()] = value

    for key, value in creds.items():
        env_key = f"SPOTIFY_AUTH_{str(key).upper()}"
        if isinstance(value, (dict, list)):
            env_value = json.dumps(value, separators=(",", ":"), ensure_ascii=True)
        else:
            env_value = str(value)
        env_map[env_key] = env_value

    updated_lines: List[str] = []
    seen_keys = set()
    for line in current_lines:
        if not line or line.strip().startswith("#") or "=" not in line:
            updated_lines.append(line)
            continue
        key, _ = line.split("=", 1)
        key = key.strip()
        if key in env_map:
            updated_lines.append(f"{key}={env_map[key]}")
            seen_keys.add(key)
        else:
            updated_lines.append(line)

    for key, value in env_map.items():
        if key not in seen_keys:
            updated_lines.append(f"{key}={value}")

    env_path.write_text("\n".join(updated_lines).rstrip() + "\n", encoding="utf-8")
    return env_path


def write_credentials_json(creds: Dict[str, Any]) -> Path:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_path = Path(f"spotify_credentials_{timestamp}.json")
    out_path.write_text(
        json.dumps(creds, indent=2, ensure_ascii=True) + "\n",
        encoding="utf-8",
    )
    return out_path


class SpotifyCredentialCLI:
    def __init__(self) -> None:
        self.scopes: List[str] = list(SPOTIFY_SCOPES)
        self.latest_creds: Optional[Dict[str, Any]] = None

    def _print_menu(self) -> None:
        print("\nSpotify Credential Retriever (CLI)")
        print("1. Show scopes")
        print("2. Add scope")
        print("3. Remove scope")
        print("4. Get session")
        print("5. End")
        print("---------")

    def _print_post_session_menu(self) -> None:
        print("\nSession Actions")
        print("1. Save credentials to secret.env")
        print("2. Download credentials JSON")
        print("3. End")
        print("---------")

    def _show_scopes(self) -> None:
        print("\nSelected scopes:")
        if not self.scopes:
            print("- (none)")
            return
        for i, scope in enumerate(self.scopes, start=1):
            print(f"{i}. {scope}")

    def _add_scope(self) -> None:
        scope = input("Enter scope to add: ").strip()
        if not scope:
            print("[WARN] Scope is empty.")
            return
        if scope in self.scopes:
            print(f"[WARN] Scope already exists: {scope}")
            return
        self.scopes.append(scope)
        print(f"[INFO] Added scope: {scope}")

    def _remove_scope(self) -> None:
        if not self.scopes:
            print("[WARN] No scopes to remove.")
            return
        self._show_scopes()
        raw = input("Enter scope number to remove: ").strip()
        if not raw.isdigit():
            print("[ERROR] Please enter a valid number.")
            return
        idx = int(raw)
        if idx < 1 or idx > len(self.scopes):
            print("[ERROR] Scope number out of range.")
            return
        removed = self.scopes.pop(idx - 1)
        print(f"[INFO] Removed scope: {removed}")

    def _get_session(self) -> None:
        try:
            print("[INFO] Starting Spotify auth flow...")
            spotify = SpotifyAuth()
            creds = asyncio.run(spotify.flow_async(self.scopes))
            self.latest_creds = creds
            print("[INFO] Login successful. Credentials received.")
            self._post_session_actions()
        except Exception as err:
            print(f"[ERROR] Login failed: {err}")

    def _post_session_actions(self) -> None:
        while True:
            self._print_post_session_menu()
            choice = input("choose : ").strip()
            if choice == "1":
                self._save_to_env()
            elif choice == "2":
                self._download_json()
            elif choice == "3":
                break
            else:
                print("[ERROR] Invalid option. Pick 1-3.")

    def _save_to_env(self) -> None:
        if not self.latest_creds:
            print("[ERROR] No credentials to save.")
            return
        env_path = save_credentials_to_env(self.latest_creds)
        print(f"[INFO] Credentials saved to {env_path}")

    def _download_json(self) -> None:
        if not self.latest_creds:
            print("[ERROR] No credentials to download.")
            return
        out_path = write_credentials_json(self.latest_creds)
        print(f"[INFO] Downloaded credentials JSON: {out_path.name}")

    def run(self) -> None:
        while True:
            self._print_menu()
            choice = input("choose : ").strip()
            if choice == "1":
                self._show_scopes()
            elif choice == "2":
                self._add_scope()
            elif choice == "3":
                self._remove_scope()
            elif choice == "4":
                self._get_session()
            elif choice == "5":
                print("[INFO] Bye.")
                break
            else:
                print("[ERROR] Invalid option. Pick 1-5.")


class AsyncWorker:
    """
    Run an asyncio event loop in a dedicated thread.
    """
    def __init__(self) -> None:
        self._loop = asyncio.new_event_loop()
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def _run(self) -> None:
        asyncio.set_event_loop(self._loop)
        self._loop.run_forever()

    def submit(self, coro) -> concurrent.futures.Future:
        return asyncio.run_coroutine_threadsafe(coro, self._loop)

    def stop(self) -> None:
        if not self._loop.is_running():
            return
        self._loop.call_soon_threadsafe(self._loop.stop)
        self._thread.join(timeout=2)


class TKList(ctk.CTkScrollableFrame):
    """
    Scrollable widget for managing a dynamic list of Spotify scopes.

    Features:
    - Add scopes by pressing Enter in the entry field
    - Prevents duplicate scopes
    - Delete scopes via clickable icon
    - Maintains internal state of scopes
    """
    delete_png = get_image(DELETE_PNG, size=(15, 15))

    def __init__(
        self,
        master,
        text_style,
        scope_list: list[str] | None = None,
        **kwargs
    ):
        """
        Initialize the scope list widget.

        Args:
            master: parent widget
            text_style: CTkFont used for text
            scope_list: optional list of scopes to preload
            **kwargs: forwarded to CTkScrollableFrame
        """
        super().__init__(master, **kwargs)

        self.normal_text_style = text_style
        self.scope_list: list[str] = []
        self.items= []

        self.entry_widget = None

        self._build_ui(scope_list or [])
        
    def _bind_wheel_for_widget(self, widget) -> None:
        """
        Attach mouse-wheel bindings to a widget (cross-platform).
        """
        widget.bind("<MouseWheel>", self._on_mousewheel, add="+")
        widget.bind("<Button-4>", self._on_mousewheel, add="+")
        widget.bind("<Button-5>", self._on_mousewheel, add="+")

    def _on_mousewheel(self, event) -> str:
        """
        Scroll the underlying canvas when wheel events are fired.
        """
        canvas = getattr(self, "_parent_canvas", None)
        if canvas is None:
            return "break"

        if getattr(event, "num", None) == 4:
            units = -1
        elif getattr(event, "num", None) == 5:
            units = 1
        else:
            delta = getattr(event, "delta", 0)
            if not delta:
                return "break"

            if sys.platform == "darwin":
                units = -int(delta)
            else:
                units = -int(delta / 120)

            if units == 0:
                units = -1 if delta > 0 else 1

        canvas.yview_scroll(units, "units")
        return "break"

    def _build_ui(self, scopes: list[str]) -> None:
        """
        Build the entry field and preload initial scopes.
        """
        self.grid_columnconfigure(0, weight=1)

        self.entry_widget = ctk.CTkEntry(
            self,
            text_color="cyan",
            placeholder_text="Add Spotify scope...",
            placeholder_text_color="light cyan",
            font=self.normal_text_style,
        )

        self.entry_widget.pack(fill="x", pady=5, side="bottom")
        self.entry_widget.bind("<Return>", self._on_action)
        self._bind_wheel_for_widget(self)
        self._bind_wheel_for_widget(self.entry_widget)

        if scopes:
            self.add_items(scopes)

    def _on_action(self, event=None) -> None:
        """
        Triggered when the user presses Enter inside the entry field.
        """
        if not self.entry_widget:
            return

        text = self.entry_widget.get().strip()

        if text:
            self.add_item(text)

        self.entry_widget.delete(0, "end")

    def add_item(self, text: str) -> None:
        """
        Add a new scope item.
        """
        if not isinstance(text, str):
            return

        text = text.strip()

        if not text or text in self.scope_list:
            return

        item_frame = ctk.CTkFrame(self, fg_color="transparent")

        label = ctk.CTkLabel(
            item_frame,
            text=text,
            text_color="cyan",
            font=self.normal_text_style,
            anchor="w",
        )

        label.pack(side="left", fill="x", expand=True)

        delete_btn = ctk.CTkLabel(
            item_frame,
            text="",
            image=self.delete_png,
            width=20,
            height=20,
            cursor="hand2",
        )

        delete_btn.pack(side="right", padx=5)

        delete_btn.bind(
            "<Button-1>",
            lambda e, f=item_frame, t=text: self._delete_item(f, t)
        )
        self._bind_wheel_for_widget(item_frame)
        self._bind_wheel_for_widget(label)
        self._bind_wheel_for_widget(delete_btn)

        item_frame.pack(fill="x", padx=2, pady=4)

        self.items.append(item_frame)
        self.scope_list.append(text)

    def _delete_item(self, frame,  text: str) -> None:
        """
        Remove a scope item from the UI and internal state.
        """
        try:
            frame.destroy()
        except Exception:
            pass

        if text in self.scope_list:
            self.scope_list.remove(text)

        if frame in self.items:
            self.items.remove(frame)

    def add_items(self, texts: list[str]) -> None:
        """
        Add multiple scopes.
        """
        if not texts:
            return

        for text in texts:
            self.add_item(text)

    def get_scopes(self) -> list[str]:
        """
        Return a copy of the current scope list.
        """
        return list(self.scope_list)

    def clear(self) -> None:
        """
        Remove all scopes from the widget.
        """
        for frame in self.items:
            try:
                frame.destroy()
            except Exception:
                pass

        self.items.clear()
        self.scope_list.clear()


class App(ctk.CTk):
    
    def __init__(self):
        super().__init__()
        screen_w = self.winfo_screenwidth()
        screen_h = self.winfo_screenheight()
        window_w = min(WIDTH, max(320, screen_w - 40))
        window_h = min(HEIGHT, max(420, screen_h - 80))
        x = int((screen_w / 2) - (window_w / 2))
        y = int((screen_h / 2) - (window_h / 2))
        self.geometry(f"{window_w}x{window_h}+{x}+{y}")
        self.resizable(False, False)
        self.title(Title)
        # self.overrideredirect(True)
        # self.attributes("-topmost", True) # its stays in top most not want that
        # self.lift()
        # now using lift and focus_force together to ensure the window is in front and focused
        self.NORMAL_TEXT_STYLE = ctk.CTkFont(family="Helvetica", size=12)
        self.HEADING_TEXT_STYLE = ctk.CTkFont(family="Helvetica", size=18, weight="bold")
        self.async_worker = AsyncWorker()
        self.latest_creds: Optional[Dict[str, Any]] = None
        
    @property
    def get_scope(self):
        return self.scope_list.get_scopes()

    def create_widgets(self):
        """
        Create the main container and widgets for the application.
        """
        self.container = ctk.CTkFrame(self, fg_color="transparent")
        self.status_label = ctk.CTkLabel(
            self.container,
            text="",
            font=self.NORMAL_TEXT_STYLE,
            wraplength=WIDTH - 40,
        )
        self.app_logo = ctk.CTkLabel(
			self.container, image=get_image(SPOTIFY_PNG), fg_color="transparent", text=""
		)
        self.scope_list = TKList(self.container, self.NORMAL_TEXT_STYLE)
        self.credentials_text = ctk.CTkTextbox(
            self.container,
            font=ctk.CTkFont(family="Courier", size=12),
            wrap="word",
        )
        self.back_button = ctk.CTkButton(self.container, command = self.shutdown, font = self.NORMAL_TEXT_STYLE)
        self.get_button = ctk.CTkButton(self.container, command = self.on_login, font = self.NORMAL_TEXT_STYLE)
        self.save_button = ctk.CTkButton(self.container, command=self.save_to_env, font=self.NORMAL_TEXT_STYLE)
        self.download_button = ctk.CTkButton(
            self.container,
            command=self.download_json,
            font=self.NORMAL_TEXT_STYLE,
        )
    
    def set_layout(self):
        """
        Set the layout of the widgets using grid geometry manager.
        """
        # set grid configuration for container
        self.container.grid_columnconfigure(0, weight=1) 
        self.container.grid_columnconfigure(1, weight=1)
        self.container.grid_rowconfigure(0, weight=0)
        self.container.grid_rowconfigure(1, weight=0)
        self.container.grid_rowconfigure(2, weight=0)
        self.container.grid_rowconfigure(3, weight=1)
        self.container.grid_rowconfigure(4, weight=0)
        self.container.grid_rowconfigure(5, weight=0)
        
        # layout setup
        self.container.pack(fill="both", expand=True, padx=10, pady=10)
        self.status_label.grid(row=1, column=0, columnspan=2, padx=10, pady=(0, 8), sticky="n")
        self.app_logo.grid(row=2, column=0, columnspan=2, pady=(0, 8), sticky="n")
        self.scope_list.grid(row=3, column=0, columnspan=2, sticky="nsew", pady=10, padx=10)
        self.credentials_text.grid(row=3, column=0, columnspan=2, sticky="nsew", pady=10, padx=10)
        self.credentials_text.grid_remove()
        self.download_button.grid(row=4, column=0, columnspan=2, pady=(4, 2), padx=10, sticky="ew")
        self.download_button.grid_remove()
        self.back_button.grid(row=5, column=0, pady=10, padx=10, sticky="ew")
        self.get_button.grid(row=5, column=1, pady=10, padx=10, sticky="ew")
        self.save_button.grid(row=5, column=1, pady=10, padx=10, sticky="ew")
        self.save_button.grid_remove()

    def set_data(self):
        """
        Set the data for the widgets, such as adding items to the scope list.
        """
        self.scope_list.add_items(SPOTIFY_SCOPES)
        self.back_button.configure(text = "Back")
        self.get_button.configure(text = "Get Session")
        self.save_button.configure(text = "Save to env")
        self.download_button.configure(text="Download JSON")
        self.set_status("", color= "#5a5a5a")

    def build(self):
        self.create_widgets()
        self.set_layout()
        self.set_data()
    
    def shutdown(self):
        self.async_worker.stop()
        self.destroy()
    
    def on_login(self):
        self.get_button.configure(state="disabled", text="Loading...")
        self.set_status("Opening Spotify login...", "#d4a017")
        scopes = self.get_scope

        future = self.async_worker.submit(self._login_task(scopes))
        future.add_done_callback(lambda fut: self.after(0, self._on_login_finished, fut))

    async def _login_task(self, scopes: List[str]) -> Dict[str, Any]:
        spotify = SpotifyAuth()
        return await spotify.flow_async(scopes)

    def _on_login_finished(self, future: concurrent.futures.Future) -> None:
        self.get_button.configure(state="normal", text="Get Session")
        try:
            creds = future.result()
            self.latest_creds = creds
            self.show_credentials_view(creds)
            self.set_status("Login successful. Credentials received.", "#2e7d32")
            print("Login successful. Credentials received.")
        except Exception as err:
            self.set_status(f"Login failed: {err}", "#c62828")
            print(f"Login failed: {err}")

    def set_status(self, text: str, color: str = "#5a5a5a") -> None:
        self.status_label.configure(text=text, text_color=color)

    def show_credentials_view(self, creds: Dict[str, Any]) -> None:
        self.scope_list.clear()
        self.scope_list.grid_remove()
        self.get_button.grid_remove()

        self.credentials_text.configure(state="normal")
        self.credentials_text.delete("1.0", "end")
        self.credentials_text.insert("1.0", json.dumps(creds, indent=2, ensure_ascii=True))
        self.credentials_text.configure(state="disabled")
        self.credentials_text.grid()
        self.download_button.grid()
        self.save_button.grid()

    def save_to_env(self) -> None:
        if not self.latest_creds:
            self.set_status("No credentials to save.", "#c62828")
            return
        save_credentials_to_env(self.latest_creds)
        self.set_status("Credentials saved to secret.env", "#2e7d32")
        print("Credentials saved to secret.env")

    def download_json(self) -> None:
        if not self.latest_creds:
            self.set_status("No credentials to download.", "#c62828")
            return

        out_path = write_credentials_json(self.latest_creds)
        self.set_status(f"Downloaded: {out_path.name}", "#2e7d32")
        print(f"Downloaded credentials JSON: {out_path.name}")

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Spotify credential retriever")
    parser.add_argument(
        "-gui",
        "--gui",
        action="store_true",
        help="Run in Tkinter GUI mode.",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    if args.gui:
        print("Config loaded")
        app = App()
        app.build()
        app.mainloop()
    else:
        SpotifyCredentialCLI().run()

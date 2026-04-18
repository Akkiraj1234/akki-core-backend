import os
import json
import base64
import asyncio
import secrets
import urllib.parse
import webbrowser
from pathlib import Path
from typing import Optional, Dict, Any, List
from http.server import BaseHTTPRequestHandler, HTTPServer
from datetime import datetime

import aiohttp
import dotenv

# ================= CONFIG =================

ROOT_DIR = Path(__file__).resolve().parent.parent
CONFIG_DIR = ROOT_DIR / "src" / "config"

ENV_PATH = ROOT_DIR / "secret.env"
CONFIG_PATH = CONFIG_DIR / "config.json"

dotenv.load_dotenv(ENV_PATH)

DEFAULT_SCOPES = [
    "user-read-playback-state",
    "user-read-currently-playing",
    "playlist-read-private",
    "user-top-read",
    "user-read-recently-played",
]

print(ROOT_DIR,"\n",CONFIG_DIR,"\n",ENV_PATH,"\n",CONFIG_PATH)

ALLOWED_ENV_KEYS = {
    "SPOTIFY_CLIENT_ID",
    "SPOTIFY_CLIENT_SECRET",
    "SPOTIFY_AUTH_REFRESH_TOKEN",
    "SPOTIFY_AUTH_ACCESS_TOKEN",
    "GITHUB_FG_ACCESS_TOKEN",
}


def load_config() -> Dict[str, Any]:
    if not CONFIG_PATH.exists():
        return {}
    try:
        return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}


CONFIG = load_config()
SPOTIFY_CONFIG = CONFIG.get("services", {}).get("spotify", {}).get("options", {})
SCOPES = SPOTIFY_CONFIG.get("scopes", DEFAULT_SCOPES)
SPOTIFY_REDIRECT_URI = SPOTIFY_CONFIG.get("SPOTIFY_REDIRECT_URI")

print(CONFIG)
print("Scopes:", SCOPES)
print("Redirect URI:", SPOTIFY_REDIRECT_URI)

# ================= AUTH HANDLER =================

class CallbackHandler(BaseHTTPRequestHandler):
    code: Optional[str] = None
    error: Optional[str] = None

    def log_message(self, *_):
        return

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        query = urllib.parse.parse_qs(parsed.query)

        CallbackHandler.code = query.get("code", [None])[0]
        CallbackHandler.error = query.get("error", [None])[0]

        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"You can close this window.")


# ================= AUTH =================

class SpotifyAuth:
    LOGIN_URL = "https://accounts.spotify.com/authorize"
    TOKEN_URL = "https://accounts.spotify.com/api/token"

    def __init__(self):
        self.client_id = os.getenv("SPOTIFY_CLIENT_ID")
        self.client_secret = os.getenv("SPOTIFY_CLIENT_SECRET")
        self.redirect_uri = SPOTIFY_REDIRECT_URI

        if not all([self.client_id, self.client_secret, self.redirect_uri]):
            raise ValueError("Missing Spotify credentials or redirect URI")

    def build_url(self, scopes: List[str]) -> str:
        params = {
            "client_id": self.client_id,
            "response_type": "code",
            "redirect_uri": self.redirect_uri,
            "scope": " ".join(scopes),
            "state": secrets.token_hex(16),
        }
        return f"{self.LOGIN_URL}?{urllib.parse.urlencode(params)}"

    def open_login(self, scopes):
        url = self.build_url(scopes)
        webbrowser.open(url)
        print("👉 Opened browser for login")

    def wait_for_code(self) -> str:
        parsed = urllib.parse.urlparse(self.redirect_uri)
        server = HTTPServer((parsed.hostname, parsed.port), CallbackHandler)

        print("⏳ Waiting for callback...")
        server.handle_request()

        if CallbackHandler.error:
            raise RuntimeError(f"Authorization failed: {CallbackHandler.error}")

        if not CallbackHandler.code:
            raise RuntimeError("No code received")

        return CallbackHandler.code

    async def exchange(self, code: str) -> Dict[str, Any]:
        auth = base64.b64encode(
            f"{self.client_id}:{self.client_secret}".encode()
        ).decode()

        headers = {"Authorization": f"Basic {auth}"}
        data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": self.redirect_uri,
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(self.TOKEN_URL, headers=headers, data=data) as res:
                res.raise_for_status()
                return await res.json()

    async def run(self, scopes: List[str]) -> Dict[str, Any]:
        await asyncio.to_thread(self.open_login, scopes)
        code = await asyncio.to_thread(self.wait_for_code)
        return await self.exchange(code)


# ================= STORAGE =================

def load_env_file() -> Dict[str, str]:
    data: Dict[str, str] = {}

    if ENV_PATH.exists():
        for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            data[k.strip()] = v.strip()

    return data


def save_env(creds: Dict[str, Any]):
    """
    Saves only allowed keys into secret.env.
    Keeps existing allowed keys already present in the file.
    """
    data = load_env_file()

    # Keep only allowed keys from existing env
    data = {k: v for k, v in data.items() if k in ALLOWED_ENV_KEYS}

    # Update Spotify token values from creds
    if "access_token" in creds:
        data["SPOTIFY_AUTH_ACCESS_TOKEN"] = str(creds["access_token"])

    if "refresh_token" in creds:
        data["SPOTIFY_AUTH_REFRESH_TOKEN"] = str(creds["refresh_token"])

    # Make sure parent directory exists just in case
    ENV_PATH.parent.mkdir(parents=True, exist_ok=True)

    content = "\n".join(f"{k}={v}" for k, v in data.items())
    ENV_PATH.write_text(content + ("\n" if content else ""), encoding="utf-8")

    print(f"💾 Saved to {ENV_PATH}")


def save_json(creds: Dict[str, Any]):
    """
    Saves the JSON output inside src/config instead of the current working directory.
    """
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)

    name = f"spotify_{datetime.now().strftime('%H%M%S')}.json"
    file_path = CONFIG_DIR / name
    file_path.write_text(json.dumps(creds, indent=2), encoding="utf-8")

    print(f"📁 Saved {file_path}")


# ================= CLI =================

class CLI:
    def __init__(self):
        self.scopes = list(SCOPES)
        self.creds = None

    def menu(self):
        print("\n1. Show scopes")
        print("2. Add scope")
        print("3. Remove scope")
        print("4. Login")
        print("5. Exit")

    def run(self):
        while True:
            self.menu()
            c = input("> ").strip()

            if c == "1":
                print(self.scopes)

            elif c == "2":
                s = input("scope: ").strip()
                if s and s not in self.scopes:
                    self.scopes.append(s)
                    print("✅ Added")

            elif c == "3":
                print(self.scopes)
                try:
                    i = int(input("index: ").strip()) - 1
                    if 0 <= i < len(self.scopes):
                        removed = self.scopes.pop(i)
                        print(f"✅ Removed {removed}")
                    else:
                        print("❌ Invalid index")
                except ValueError:
                    print("❌ Please enter a valid number")

            elif c == "4":
                self.login()

            elif c == "5":
                break

            else:
                print("❌ Invalid option")

    def login(self):
        try:
            auth = SpotifyAuth()
            self.creds = asyncio.run(auth.run(self.scopes))

            print("✅ Success")
            print(json.dumps(self.creds, indent=2))

            self.post_actions()

        except Exception as e:
            print("❌ Error:", e)

    def post_actions(self):
        while True:
            print("\n1. Save .env")
            print("2. Save JSON")
            print("3. Back")

            c = input("> ").strip()

            if c == "1":
                if self.creds:
                    save_env(self.creds)
                else:
                    print("❌ No credentials available")
            elif c == "2":
                if self.creds:
                    save_json(self.creds)
                else:
                    print("❌ No credentials available")
            elif c == "3":
                break
            else:
                print("❌ Invalid option")


# ================= ENTRY =================

if __name__ == "__main__":
    CLI().run()
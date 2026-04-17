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

ROOT_DIR = Path(__file__).resolve().parent
CONFIG_DIR = ROOT_DIR / "src/config"

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


def load_config() -> Dict[str, Any]:
    if not CONFIG_PATH.exists():
        return {}
    try:
        return json.loads(CONFIG_PATH.read_text())
    except:
        return {}


CONFIG = load_config()
SPOTIFY_CONFIG = CONFIG.get("spotify", {}).get("options", {})
SCOPES = SPOTIFY_CONFIG.get("scopes", DEFAULT_SCOPES)
SPOTIFY_REDIRECT_URI = SPOTIFY_CONFIG.get("SPOTIFY_REDIRECT_URI", None)


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
            raise ValueError("Missing Spotify credentials")

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
            raise RuntimeError("Authorization failed")

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

def save_env(creds: Dict[str, Any]):
    lines = []
    if ENV_PATH.exists():
        lines = ENV_PATH.read_text().splitlines()

    data = {}
    for line in lines:
        if "=" in line:
            k, v = line.split("=", 1)
            data[k] = v

    for k, v in creds.items():
        key = f"SPOTIFY_{k.upper()}"
        val = json.dumps(v) if isinstance(v, (dict, list)) else str(v)
        data[key] = val

    content = "\n".join(f"{k}={v}" for k, v in data.items())
    ENV_PATH.write_text(content)

    print(f"💾 Saved to {ENV_PATH}")


def save_json(creds: Dict[str, Any]):
    name = f"spotify_{datetime.now().strftime('%H%M%S')}.json"
    Path(name).write_text(json.dumps(creds, indent=2))
    print(f"📁 Saved {name}")


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
            c = input("> ")

            if c == "1":
                print(self.scopes)

            elif c == "2":
                s = input("scope: ")
                if s and s not in self.scopes:
                    self.scopes.append(s)

            elif c == "3":
                print(self.scopes)
                i = int(input("index: ")) - 1
                if 0 <= i < len(self.scopes):
                    self.scopes.pop(i)

            elif c == "4":
                self.login()

            elif c == "5":
                break

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

            c = input("> ")

            if c == "1":
                save_env(self.creds)
            elif c == "2":
                save_json(self.creds)
            else:
                break


# ================= ENTRY =================

if __name__ == "__main__":
    CLI().run()
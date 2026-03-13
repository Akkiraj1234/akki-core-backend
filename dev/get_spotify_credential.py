import os, requests, base64, dotenv
from pathlib import Path
from PIL import Image, ImageTk
import customtkinter as ctk

print("Loading environment variables...")
secrets = dotenv.load_dotenv("secret.env")
SPOTIFY_CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
SPOTIFY_CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")
SPOTIFY_REDIRECT_URI = os.getenv("SPOTIFY_REDIRECT_URI") 
SPOTIFY_PNG = Path(__file__).parent.parent / "resource/spotify.png"

scope = ("user-read-playback-state"
         "user-read-currently-playing"
         "playlist-read-private"
         "user-top-read"
         "user-read-recently-played")

if not SPOTIFY_CLIENT_ID or not SPOTIFY_CLIENT_SECRET or not SPOTIFY_REDIRECT_URI:
    print("Missing required Spotify credentials in environment variables.")
    exit(1)
    
class TKList(ctk.CTkScrollableFrame):
        def __init__(self, master, **kwargs):
                super().__init__(master, **kwargs)
                self.grid_columnconfigure(0, weight=1)
                self.grid_rowconfigure(0, weight=1)
                self.list_frame = ctk.CTkFrame(self)
                self.list_frame.grid(row=0, column=0, sticky="nsew")
                self.items = []
        
        def add_item(self, text):
                item = ctk.CTkLabel(self.list_frame, text=text)
                item.pack(fill="x", padx=5, pady=5)
                self.items.append(item)
                
        def add_items(self, texts: list[str, str]):
                for text in texts:
                        self.add_item(text)
                
    
def get_image(path: Path) -> ImageTk:
        if not path.exists():
                raise ValueError("path is not correct")
        img = Image.open(path)
        return ctk.CTkImage(img, size=(100, 100))

def random_number_generator():
        pass

def flow():
        pass

def shutdown():
        pass

def app(win):
        FRAME_WIDTH, FRAME_HEIGHT = 400, 350
        container = ctk.CTkFrame(win, width=FRAME_WIDTH, height=FRAME_HEIGHT)
        main_frame = ctk.CTkFrame(container)
        back = ctk.CTkButton(main_frame, text="Back", command=shutdown)
        heading = ctk.CTkLabel(main_frame, text="Spotify Credential Retriever")
        logo = ctk.CTkLabel(main_frame, image=get_image(SPOTIFY_PNG),fg_color="transparent", text="")
        scope_box = TKList(main_frame)
        get_button = ctk.CTkButton(main_frame, text="Get Session")
        
        # Grid management
        main_frame.grid_columnconfigure(0, weight=1)
        main_frame.grid_columnconfigure(1, weight=1)
        for i in range(4): main_frame.grid_rowconfigure(i, weight=1)
        
        # dummy
        scope_box.add_items([
                "user-read-playback-state",
                "user-read-currently-playing",
                "playlist-read-private",
                "user-top-read",
                "user-read-recently-played"
        ])
        
        # pack here
        container.pack(expand=True)
        main_frame.pack(fill="both", expand=True)
        heading.grid(row=0, column=0, columnspan=2, padx=10)
        logo.grid(row=1, column=0, columnspan=2)
        scope_box.grid(row=2, column=0, columnspan=2, padx=10, pady=10, sticky="nsew")
        back.grid(row=3, column=0, pady=10, padx=10)
        get_button.grid(row=3, column=1, pady=10, padx=10)

def main():        
        window = ctk.CTk()
        window.geometry("800x400")
        window.resizable(False, False)
        window.title("Spotify credentail getter")
        app(window)
        window.mainloop()


if __name__ == "__main__":
        main()
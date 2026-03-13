import os, requests, base64
from dotenv import load_dotenv
import customtkinter as ctk


print("Loading environment variables...")
secrets = load_dotenv("secret.env")
SPOTIFY_CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
SPOTIFY_CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")
SPOTIFY_REDIRECT_URI = os.getenv("SPOTIFY_REDIRECT_URI") 

scope = ("user-read-playback-state"
         "user-read-currently-playing"
         "playlist-read-private"
         "user-top-read"
         "user-read-recently-played")

if not SPOTIFY_CLIENT_ID or not SPOTIFY_CLIENT_SECRET or not SPOTIFY_REDIRECT_URI:
    print("Missing required Spotify credentials in environment variables.")
    exit(1)


def rnadowm_number_genrator():
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
        logo = ctk.CTkLabel(main_frame, text="🎵 Spotify")
        scope_box = ctk.CTkTextbox(main_frame)
        get_button = ctk.CTkButton(main_frame, text="Get Session")
        
        # Grid mangemnt
        main_frame.grid_columnconfigure(0, weight=1)
        main_frame.grid_columnconfigure(1, weight=1)
        for i in range(4): main_frame.grid_rowconfigure(i, weight=1)
        
        
        # pack here
        container.pack(expand=True)
        main_frame.pack(fill="both", expand=True)
        heading.grid(row=0, column=0, columnspan=2, padx=10)
        logo.grid(row=1, column=0, columnspan=2)
        scope_box.grid(row=2, column=0, columnspan=2, padx=10, pady=10, sticky="nsew")
        back.grid(row=3, column=0, pady=10)
        get_button.grid(row=3, column=1, pady=10)

def main():        
        window = ctk.CTk()
        window.geometry("800x400")
        window.resizable(False, False)
        window.title("Spotify credentail getter")
        app(window)
        window.mainloop()


if __name__ == "__main__":
        main()
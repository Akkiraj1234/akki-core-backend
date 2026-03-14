import os, requests, base64, dotenv, secrets
from pathlib import Path
from PIL import Image, ImageTk
import customtkinter as ctk

# Configs files ====================================================
WIDTH, HEIGHT = 300, 400
Title = "Spotify Credential Retriever"
secrets = dotenv.load_dotenv("secret.env")
SPOTIFY_CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
SPOTIFY_CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")
SPOTIFY_REDIRECT_URI = os.getenv("SPOTIFY_REDIRECT_URI")
SPOTIFY_PNG = Path(__file__).parent.parent / "resource/spotify.png"
DELETE_PNG = Path(__file__).parent.parent / "resource/delete.png"


SPOTIFY_SCOPES = [
    "user-read-playback-state", 
    "user-read-currently-playing",
    "playlist-read-private",
    "user-top-read",
    "user-read-recently-played"
]

if not SPOTIFY_CLIENT_ID or not SPOTIFY_CLIENT_SECRET or not SPOTIFY_REDIRECT_URI:
    print("Missing required Spotify credentials in environment variables.")
    exit(1)
print("Config Loaded")
    
# ==================================================================

def get_image(path: Path, size = (100, 100)) -> ImageTk:
    if not path.exists():
        raise ValueError("path is not correct")
    img = Image.open(path)
    return ctk.CTkImage(img, size=size)


def random_number_generator(bytes_size:int = 16) -> str:
    """
    Generate a URL-safe cryptographic token.
    """

    return secrets.token_urlsafe(bytes_size)


def flow():
    pass


def shutdown():
    pass



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
        self.items: list[ctk.CTkFrame] = []

        self.entry_widget: ctk.CTkEntry | None = None

        self._build_ui(scope_list or [])
        

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

        item_frame.pack(fill="x", padx=2, pady=4)

        self.items.append(item_frame)
        self.scope_list.append(text)

    def _delete_item(self, frame: ctk.CTkFrame, text: str) -> None:
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
        x = int((self.winfo_screenwidth()/2) - (WIDTH/2))
        y = int((self.winfo_screenheight()/2) - (HEIGHT/2))
        self.geometry(f"{WIDTH}x{HEIGHT}+{x}+{y}")
        self.resizable(False, False)
        self.title(Title)
        self.overrideredirect(True)
        self.attributes("-topmost", True)
        self.NORMAL_TEXT_STYLE = ctk.CTkFont(family="Helvetica", size=12)
        self.HEADING_TEXT_STYLE = ctk.CTkFont(family="Helvetica", size=18, weight="bold")    

    def create_widgets(self):
        """
        Create the main container and widgets for the application.
        """
        self.container = ctk.CTkFrame(self, width=WIDTH, height=HEIGHT, fg_color="transparent")
        self.back_button = ctk.CTkButton(self.container, text="Back", command=self.shutdown)
        self.heading_label = ctk.CTkLabel(self.container, text="Title", font=ctk.CTkFont(family="Helvetica", size=18, weight="bold"))
        self.app_logo = ctk.CTkLabel(
			self.container, image=get_image(SPOTIFY_PNG), fg_color="transparent", text=""
		)
        self.scope_list = TKList(self.container, self.NORMAL_TEXT_STYLE)
        self.get_button = ctk.CTkButton(self.container, text="Get Session")
    
    def set_layout(self):
        """
        Set the layout of the widgets using grid geometry manager.
        """
        # set grid configuration for container
        self.container.grid_columnconfigure(0, weight=1) 
        self.container.grid_columnconfigure(1, weight=1)
        for i in range(4):
            self.container.grid_rowconfigure(i, weight=1)
        
        # layout setup
        self.container.pack(fill="both", expand=True, padx=10, pady=10)
        self.heading_label.grid(row=0, column=0, columnspan=2, padx=10)
        self.app_logo.grid(row=1, column=0, columnspan=2)
        self.scope_list.grid(row=2, column=0, columnspan=2, padx=10, pady=10, sticky="nsew")
        self.back_button.grid(row=3, column=0, pady=10, padx=10)
        self.get_button.grid(row=3, column=1, pady=10, padx=10)

    def set_data(self):
        """
        Set the data for the widgets, such as adding items to the scope list.
        """
        self.scope_list.add_items(
            [
                "user-read-playback-state",
                "user-read-currently-playing",
                "playlist-read-private",
                "user-top-read",
                "user-read-recently-played",
                "user-read-playback-state",
                "user-read-currently-playing",
                "playlist-read-private",
                "user-top-read",
                "user-read-recently-played",
            ]
        )  

    def build(self):
        self.create_widgets()
        self.set_layout()
        self.set_data()
    
    def shutdown(self):
        self.destroy()

        
if __name__ == "__main__":
    app = App()
    app.build()
    app.mainloop()

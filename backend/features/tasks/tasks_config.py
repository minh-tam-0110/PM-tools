"""Constants cho tasks feature — không I/O at import time."""
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
TASKS_FILE = "tasks.json"

DEFAULT_STORE_PATH = str(DATA_DIR / TASKS_FILE)

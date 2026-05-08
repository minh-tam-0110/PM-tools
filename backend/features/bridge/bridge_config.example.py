"""
Copy this file to bridge_config.py and fill in your values.
"""
from pathlib import Path

REVIEW_360_URL = "https://your-review-app.web.app"
MY_WORK_URL = f"{REVIEW_360_URL}/my-work"

ALLOWED_ORIGINS = [
    "https://your-review-app.web.app",
    "https://your-review-app.firebaseapp.com",
]

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
PROFILE_DIR = str(DATA_DIR / "review360_profile")
LAST_DOM_DUMP_PATH = str(DATA_DIR / "review360_last_dom.html")

LOGIN_TIMEOUT_MS = 5 * 60 * 1000
SCRAPE_TIMEOUT_MS = 45 * 1000
LOGIN_DONE_URL_FRAGMENT = "/my-work"

DEFAULT_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/131.0.0.0 Safari/537.36"
)

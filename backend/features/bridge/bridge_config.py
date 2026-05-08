"""Constants cho bridge feature (Playwright scrape Review 360°).

URLs đọc từ env vars (`.env` ở root) — không hardcode trong source.
"""
import os
from pathlib import Path

REVIEW_360_URL = os.environ["REVIEW_360_URL"]
MY_WORK_URL = f"{REVIEW_360_URL}/my-work"

ALLOWED_ORIGINS = [
    o.strip() for o in os.environ["BRIDGE_ALLOWED_ORIGINS"].split(",") if o.strip()
]

# Persistent Chromium profile dir — lưu cookies + localStorage + IndexedDB + ServiceWorker.
# Cần persistent context (không phải storageState file) vì Firebase Auth lưu token trong IndexedDB.
DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
PROFILE_DIR = str(DATA_DIR / "review360_profile")
LAST_DOM_DUMP_PATH = str(DATA_DIR / "review360_last_dom.html")

LOGIN_TIMEOUT_MS = 5 * 60 * 1000      # 5 phút cho user nhập credential
SCRAPE_TIMEOUT_MS = 45 * 1000

# Heuristic login-done: URL chứa fragment này nghĩa là đã đăng nhập.
LOGIN_DONE_URL_FRAGMENT = "/my-work"

DEFAULT_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/131.0.0.0 Safari/537.36"
)

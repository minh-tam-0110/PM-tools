"""Constants cho bridge feature (Playwright scrape Review 360°)."""
from pathlib import Path

REVIEW_360_URL = "https://wolffun-review.web.app"
MY_WORK_URL = f"{REVIEW_360_URL}/my-work"

ALLOWED_ORIGINS = [
    "https://wolffun-review.web.app",
    "https://wolffun-review.firebaseapp.com",
]

# Persistent Chromium profile dir — lưu cookies + localStorage + IndexedDB + ServiceWorker.
# Cần persistent context (không phải storageState file) vì Firebase Auth lưu token trong IndexedDB.
# Đường dẫn này gitignored qua backend/data/ rule.
DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
PROFILE_DIR = str(DATA_DIR / "review360_profile")
LAST_DOM_DUMP_PATH = str(DATA_DIR / "review360_last_dom.html")

# Login phase chạy headed (user phải tự click), chờ tối đa N giây cho login xong.
LOGIN_TIMEOUT_MS = 5 * 60 * 1000      # 5 phút cho user nhập credential
SCRAPE_TIMEOUT_MS = 45 * 1000         # 45s cho mỗi scrape

# Selector login-done: khi nào coi như đã đăng nhập xong.
# Heuristic: URL không còn chứa "/login" và document có nội dung non-trivial.
# Có thể tinh chỉnh sau khi inspect.
LOGIN_DONE_URL_FRAGMENT = "/my-work"

# Default User-Agent (tránh bị block do Headless detection cơ bản).
DEFAULT_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/131.0.0.0 Safari/537.36"
)

"""Bridge feature: Playwright scrape Review 360° → canonical tasks JSON."""
import os
from pathlib import Path

from .bridge_config import ALLOWED_ORIGINS, DATA_DIR, PROFILE_DIR

NAME = "bridge"
LABEL = "Review 360° Bridge"
URL_PREFIX = "/api/bridge"
DESCRIPTION = "Scrape Review 360° qua Playwright (login 1 lần, scrape headless)"
ICON = "🔗"
COLOR = "#F472B6"
ORDER = 40


def register(app):
    Path(DATA_DIR).mkdir(parents=True, exist_ok=True)
    app.config.setdefault("BRIDGE_ALLOWED_ORIGINS", ALLOWED_ORIGINS)
    app.config.setdefault("BRIDGE_PROFILE_DIR", PROFILE_DIR)
    from .routes import scrape
    app.register_blueprint(scrape.bp)
    # Werkzeug reloader forks: chỉ start worker trong child (hoặc khi không debug)
    # — không thì 2 threads scrape song song.
    if not app.debug or os.environ.get("WERKZEUG_RUN_MAIN") == "true":
        from .services import bg_worker
        bg_worker.start(app.config["BRIDGE_PROFILE_DIR"])

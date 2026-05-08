"""Bridge feature: Playwright scrape Review 360° → canonical tasks JSON."""
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

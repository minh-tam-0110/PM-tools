"""Flask app factory + auto-discovery cho features."""
import importlib
import logging
from pathlib import Path

from flask import Flask, send_from_directory

logger = logging.getLogger(__name__)

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "frontend" / "dist"


def _discover_features():
    features_dir = Path(__file__).parent / "features"
    if not features_dir.exists():
        return
    for entry in sorted(features_dir.iterdir()):
        if entry.is_dir() and not entry.name.startswith("_") and (entry / "feature.py").exists():
            mod = importlib.import_module(f"backend.features.{entry.name}.feature")
            yield mod


def create_app(dev: bool = False) -> Flask:
    app = Flask(__name__, static_folder=None)
    app.config["DEV"] = dev
    app.config["DIST_DIR"] = str(DIST)

    for mod in _discover_features():
        try:
            mod.register(app)
            logger.info("registered feature: %s", getattr(mod, "NAME", mod.__name__))
        except Exception:
            logger.exception("failed to register feature %s", mod.__name__)

    if not dev:
        @app.get("/", defaults={"path": ""})
        @app.get("/<path:path>")
        def spa(path: str):
            target = DIST / path
            if path and target.exists() and target.is_file():
                return send_from_directory(DIST, path)
            return send_from_directory(DIST, "index.html")

    return app

"""Bridge endpoints: login (headed), scrape (headless), dump (debug), status."""
import logging

from flask import Blueprint, current_app, jsonify

from ..bridge_config import LAST_DOM_DUMP_PATH
from ..services import scraper

logger = logging.getLogger(__name__)

bp = Blueprint("bridge_scrape", __name__)


@bp.get("/api/bridge/status")
def status():
    return jsonify(scraper.state_status(current_app.config["BRIDGE_PROFILE_DIR"]))


@bp.post("/api/bridge/login")
def login():
    """Block ~vài chục giây tới vài phút — user phải login tay trong Chromium popup."""
    try:
        result = scraper.login_persist(current_app.config["BRIDGE_PROFILE_DIR"])
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 503
    except Exception as exc:
        logger.exception("login_persist failed")
        return jsonify({"error": str(exc)}), 500
    return jsonify(result)


@bp.post("/api/bridge/scrape")
def scrape():
    try:
        result = scraper.scrape_my_work(current_app.config["BRIDGE_PROFILE_DIR"])
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 503
    except Exception as exc:
        logger.exception("scrape_my_work failed")
        return jsonify({"error": str(exc)}), 500
    return jsonify(result)


@bp.post("/api/bridge/dump-html")
def dump_html():
    """Lưu raw DOM /my-work ra file để debug selector."""
    try:
        result = scraper.dump_html(current_app.config["BRIDGE_PROFILE_DIR"], LAST_DOM_DUMP_PATH)
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 503
    except Exception as exc:
        logger.exception("dump_html failed")
        return jsonify({"error": str(exc)}), 500
    return jsonify(result)

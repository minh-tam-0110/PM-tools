"""Bridge endpoints: login (headed), scrape (headless), dump (debug), status."""
import logging
from datetime import datetime, timezone

from flask import Blueprint, current_app, jsonify, request

from ..bridge_config import CACHE_MAX_AGE_SEC, LAST_DOM_DUMP_PATH
from ..services import bg_worker, scraper
from ..services.cache import hash_tasks, load_last_scrape, save_last_scrape
from ..services.scraper import scrape_lock

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
    """Scrape /my-work — returns cached result if fresh enough, unless force=true."""
    force = request.args.get("force") == "true"

    if not force:
        cached = load_last_scrape()
        if cached is not None:
            extracted_at = cached.get("extractedAt")
            if extracted_at:
                try:
                    ts = datetime.fromisoformat(extracted_at)
                    age = (datetime.now(timezone.utc) - ts).total_seconds()
                    if age <= CACHE_MAX_AGE_SEC:
                        cached["from_cache"] = True
                        return jsonify(cached)
                except (ValueError, TypeError):
                    pass  # malformed timestamp — fall through to live scrape

    # Cache stale or force=true — try to acquire scrape lock
    acquired = scrape_lock.acquire(blocking=False)
    if not acquired:
        # Background worker is currently scraping
        cached = load_last_scrape()
        if cached is not None:
            cached["from_cache"] = True
            return jsonify(cached)
        return jsonify({"error": "scrape in progress, try again"}), 503

    try:
        result = scraper.scrape_my_work(current_app.config["BRIDGE_PROFILE_DIR"])
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 503
    except Exception as exc:
        logger.exception("scrape_my_work failed")
        return jsonify({"error": str(exc)}), 500
    finally:
        scrape_lock.release()

    result["hash"] = hash_tasks(result.get("tasks", []))
    result["from_cache"] = False
    save_last_scrape(result)
    return jsonify(result)


@bp.get("/api/bridge/last")
def last_scrape():
    """Trả về kết quả scrape gần nhất (cached). 204 nếu chưa có."""
    cached = load_last_scrape()
    if cached is None:
        return ("", 204)
    return jsonify(cached)


@bp.get("/api/bridge/bg-status")
def bg_status():
    """Return background worker state."""
    return jsonify(bg_worker.get_status())


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

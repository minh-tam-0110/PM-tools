"""Bridge endpoints: login (headed), scrape (headless), dump (debug), status."""
import hashlib
import json
import logging
from pathlib import Path

from flask import Blueprint, current_app, jsonify

from ..bridge_config import LAST_DOM_DUMP_PATH, LAST_SCRAPE_PATH
from ..services import scraper


def _hash_tasks(tasks: list[dict]) -> str:
    """Stable hash của task list — sort theo id, chỉ field nội dung user-facing."""
    canon = sorted(
        (
            {
                "id": t.get("id", ""),
                "title": t.get("title", ""),
                "status": t.get("status", ""),
                "module": t.get("module", ""),
                "assignee": t.get("assignee", ""),
                "deadline": t.get("deadline", ""),
                "priority": t.get("priority", ""),
                "sprint": t.get("sprint", ""),
            }
            for t in tasks
        ),
        key=lambda x: x["id"],
    )
    blob = json.dumps(canon, ensure_ascii=False, sort_keys=True).encode("utf-8")
    return hashlib.sha256(blob).hexdigest()[:16]


def _save_last_scrape(result: dict) -> None:
    """Persist scrape result to disk. Best-effort — errors logged, không raise."""
    try:
        path = Path(LAST_SCRAPE_PATH)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(result, ensure_ascii=False), encoding="utf-8")
    except OSError:
        logger.warning("failed to persist last scrape", exc_info=True)


def _load_last_scrape() -> dict | None:
    path = Path(LAST_SCRAPE_PATH)
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        logger.warning("failed to load last scrape", exc_info=True)
        return None

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
    result["hash"] = _hash_tasks(result.get("tasks", []))
    _save_last_scrape(result)
    return jsonify(result)


@bp.get("/api/bridge/last")
def last_scrape():
    """Trả về kết quả scrape gần nhất (cached). 204 nếu chưa có."""
    cached = _load_last_scrape()
    if cached is None:
        return ("", 204)
    return jsonify(cached)


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

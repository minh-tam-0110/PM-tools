"""Cache helpers for bridge scrape results.

Pure stdlib — no Flask, no Playwright. Shared between routes/scrape.py and
services/bg_worker.py to avoid circular imports.
"""
from __future__ import annotations

import hashlib
import json
import logging
from pathlib import Path

from ..bridge_config import LAST_SCRAPE_PATH

logger = logging.getLogger(__name__)


def hash_tasks(tasks: list[dict]) -> str:
    """Stable SHA-256 (truncated 16 hex) of task list — sorts by id, user-facing fields only."""
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


def save_last_scrape(result: dict) -> None:
    """Persist scrape result to disk. Best-effort — errors logged, không raise."""
    try:
        path = Path(LAST_SCRAPE_PATH)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(result, ensure_ascii=False), encoding="utf-8")
    except OSError:
        logger.warning("failed to persist last scrape", exc_info=True)


def load_last_scrape() -> dict | None:
    """Load cached scrape result from disk. Returns None if missing or corrupt."""
    path = Path(LAST_SCRAPE_PATH)
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        logger.warning("failed to load last scrape", exc_info=True)
        return None

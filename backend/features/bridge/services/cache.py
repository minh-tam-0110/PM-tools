"""Cache helpers for bridge scrape results.

Pure stdlib — no Flask, no Playwright. Shared between routes/scrape.py and
services/bg_worker.py to avoid circular imports.
"""
from __future__ import annotations

import hashlib
import json
import logging
import time
from pathlib import Path

from ..bridge_config import ACTIVE_SPRINTS_CACHE_PATH, ACTIVE_SPRINTS_TTL_SEC, LAST_SCRAPE_PATH

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


def load_active_sprints_cache() -> dict[str, str] | None:
    """Load cached active sprints mapping. Returns None if missing/corrupt/expired."""
    path = Path(ACTIVE_SPRINTS_CACHE_PATH)
    if not path.exists():
        return None
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        logger.warning("failed to load active sprints cache", exc_info=True)
        return None
    ts = raw.get("savedAt", 0)
    age = time.time() - ts
    if age > ACTIVE_SPRINTS_TTL_SEC:
        logger.info("active sprints cache stale (age %.0fs > %ds)", age, ACTIVE_SPRINTS_TTL_SEC)
        return None
    mapping = raw.get("mapping")
    return mapping if isinstance(mapping, dict) else None


def save_active_sprints_cache(mapping: dict[str, str]) -> None:
    """Persist active sprints mapping with timestamp. Best-effort."""
    if not mapping:
        return  # don't cache empty (often means collection failed)
    try:
        path = Path(ACTIVE_SPRINTS_CACHE_PATH)
        path.parent.mkdir(parents=True, exist_ok=True)
        payload = {"savedAt": time.time(), "mapping": mapping}
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    except OSError:
        logger.warning("failed to persist active sprints cache", exc_info=True)

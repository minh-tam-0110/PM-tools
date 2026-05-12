"""Background daemon thread: runs scrape_my_work every N seconds.

Public API
----------
start(profile_dir)  — idempotent; no-op if already running or interval == 0.
stop()              — signal thread to exit; daemon dies with process anyway.
get_status()        — return a copy of current state dict.

Design notes
------------
- Uses scrape_lock (from scraper) non-blocking: skips cycle if scraper is
  already busy (e.g. a manual POST /scrape is in flight).
- Saves result via cache.save_last_scrape — same path as the route handler.
- Catches ALL exceptions so the daemon never dies from a scraper error.
- stop_event.wait(interval) is used instead of time.sleep so shutdown is
  responsive (Flask dev-server SIGINT is handled within seconds).
"""
from __future__ import annotations

import logging
import threading
from datetime import datetime, timezone

from ..bridge_config import BG_FETCH_FULL_DESCRIPTIONS, BG_SCRAPE_INTERVAL_SEC
from .cache import hash_tasks, load_last_scrape, save_last_scrape
from .scraper import scrape_lock, scrape_my_work

logger = logging.getLogger(__name__)

# ── Module-level state ────────────────────────────────────────────────────────

_state_lock = threading.Lock()
_state: dict = {
    "enabled": False,
    "interval": BG_SCRAPE_INTERVAL_SEC,
    "last_run": None,       # ISO string or None
    "last_error": None,     # last exception str or None
    "in_progress": False,
}

_thread: threading.Thread | None = None
_stop_event: threading.Event = threading.Event()


# ── Internal helpers ──────────────────────────────────────────────────────────

def _set_state(**kwargs) -> None:
    with _state_lock:
        _state.update(kwargs)


def _run_scrape(profile_dir: str, interval: int) -> None:
    """Main loop executed inside the daemon thread."""
    logger.info("bg_worker: started (interval=%ds)", interval)

    # First cycle: skip wait if no cache exists yet → scrape immediately.
    # Otherwise wait the full interval before first scrape.
    cache = load_last_scrape()
    if cache is not None:
        logger.debug("bg_worker: cache exists, waiting %ds before first scrape", interval)
        _stop_event.wait(interval)

    while not _stop_event.is_set():
        if interval <= 0:
            logger.info("bg_worker: interval=0, exiting")
            break

        acquired = scrape_lock.acquire(blocking=False)
        if not acquired:
            logger.debug("bg_worker: scrape_lock busy, skipping cycle")
            _stop_event.wait(interval)
            continue

        _set_state(in_progress=True, last_error=None)
        try:
            logger.debug("bg_worker: starting scrape (full_desc=%s)", BG_FETCH_FULL_DESCRIPTIONS)
            result = scrape_my_work(profile_dir, fetch_full_descriptions=BG_FETCH_FULL_DESCRIPTIONS)
            # Safety net: preserve longer descriptions from prior cache khi full_desc=false
            # hoặc một task fetch fail và rơi về truncated. Tránh clobber data tốt sẵn có.
            prev = load_last_scrape()
            if prev:
                prev_desc = {
                    t.get("id"): t.get("description") or ""
                    for t in prev.get("tasks", [])
                    if t.get("id")
                }
                for t in result.get("tasks", []):
                    old_d = prev_desc.get(t.get("id"), "")
                    new_d = t.get("description") or ""
                    if len(old_d) > len(new_d):
                        t["description"] = old_d
            result["hash"] = hash_tasks(result.get("tasks", []))
            save_last_scrape(result)
            now_iso = datetime.now(timezone.utc).isoformat()
            _set_state(last_run=now_iso, last_error=None)
            logger.info(
                "bg_worker: scrape done — %d tasks, hash=%s",
                result.get("count", 0),
                result.get("hash", ""),
            )
        except Exception as exc:
            err = str(exc)
            logger.exception("bg_worker: scrape raised: %s", err)
            _set_state(last_error=err)
        finally:
            _set_state(in_progress=False)
            scrape_lock.release()

        _stop_event.wait(interval)

    _set_state(enabled=False, in_progress=False)
    logger.info("bg_worker: stopped")


# ── Public API ────────────────────────────────────────────────────────────────

def start(profile_dir: str) -> None:
    """Start the daemon thread. Idempotent — returns immediately if already running."""
    global _thread, _stop_event

    interval = BG_SCRAPE_INTERVAL_SEC
    if interval <= 0:
        logger.info("bg_worker: BG_SCRAPE_INTERVAL_SEC=0, worker disabled")
        return

    if _thread is not None and _thread.is_alive():
        logger.debug("bg_worker: already running, ignoring start()")
        return

    _stop_event = threading.Event()
    _set_state(enabled=True, interval=interval)

    _thread = threading.Thread(
        target=_run_scrape,
        args=(profile_dir, interval),
        name="bg_scrape_worker",
        daemon=True,
    )
    _thread.start()
    logger.info("bg_worker: daemon thread started (profile=%s)", profile_dir)


def stop() -> None:
    """Signal the worker to exit after the current cycle. No join — daemon dies with process."""
    _stop_event.set()
    logger.info("bg_worker: stop signal sent")


def get_status() -> dict:
    """Return a snapshot of the current worker state."""
    with _state_lock:
        return dict(_state)

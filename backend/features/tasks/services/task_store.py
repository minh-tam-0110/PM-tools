"""Pure logic — JSON file persistence cho tasks."""
import json
import threading
from pathlib import Path

_lock = threading.Lock()


def load(path: str) -> list[dict]:
    p = Path(path)
    if not p.exists():
        return []
    return json.loads(p.read_text(encoding="utf-8"))


def _write(path: str, items: list[dict]) -> None:
    Path(path).write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")


def save_one(path: str, task: dict) -> dict:
    with _lock:
        items = load(path)
        items.append(task)
        _write(path, items)
    return task


def update_one(path: str, task_id: str, patch: dict) -> dict:
    with _lock:
        items = load(path)
        for i, t in enumerate(items):
            if t.get("id") == task_id:
                items[i] = {**t, **patch}
                _write(path, items)
                return items[i]
    raise KeyError(task_id)


def delete_one(path: str, task_id: str) -> None:
    with _lock:
        items = load(path)
        new = [t for t in items if t.get("id") != task_id]
        if len(new) == len(items):
            raise KeyError(task_id)
        _write(path, new)

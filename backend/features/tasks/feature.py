"""Tasks: persist + serve PM tasks (JSON file backend)."""
from pathlib import Path

from .tasks_config import DEFAULT_STORE_PATH

NAME = "tasks"
LABEL = "Task Storage"
URL_PREFIX = "/api/tasks"
DESCRIPTION = "Persist + serve PM tasks"
ICON = "📋"
COLOR = "#7C6AEF"
ORDER = 10


def register(app):
    Path(DEFAULT_STORE_PATH).parent.mkdir(parents=True, exist_ok=True)
    app.config.setdefault("TASKS_STORE_PATH", DEFAULT_STORE_PATH)
    from .routes import crud
    app.register_blueprint(crud.bp)

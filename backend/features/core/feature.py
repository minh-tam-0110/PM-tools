"""Core: shared infra (CORS, error handlers). Không expose tab UI."""
NAME = "core"
LABEL = "Core"
URL_PREFIX = "/api/core"
ORDER = -1


def register(app):
    try:
        from flask_cors import CORS
        CORS(app, resources={r"/api/*": {"origins": "*"}})
    except ImportError:
        pass

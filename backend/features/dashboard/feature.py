"""Dashboard meta + health endpoints."""
from flask import Blueprint, jsonify

NAME = "dashboard"
LABEL = "Dashboard Meta"
URL_PREFIX = "/api/dashboard"
DESCRIPTION = "Health + meta info cho PM Dashboard"
ICON = "📊"
COLOR = "#7C6AEF"
ORDER = 0

bp = Blueprint("dashboard_meta", __name__)


@bp.get("/api/dashboard/health")
def health():
    return jsonify({"status": "ok"})


@bp.get("/api/dashboard/features")
def features():
    # populated lazily — feature manifests ghi vào app.config["FEATURES_META"] khi register.
    from flask import current_app
    return jsonify(current_app.config.get("FEATURES_META", []))


def register(app):
    app.config.setdefault("FEATURES_META", [])
    app.config["FEATURES_META"].append({
        "name": NAME, "label": LABEL, "url_prefix": URL_PREFIX,
        "icon": ICON, "color": COLOR, "order": ORDER,
    })
    app.register_blueprint(bp)

"""Tasks CRUD endpoints."""
from flask import Blueprint, current_app, jsonify, request

from ..services import task_store

bp = Blueprint("tasks_crud", __name__)


@bp.get("/api/tasks")
def list_tasks():
    return jsonify(task_store.load(current_app.config["TASKS_STORE_PATH"]))


@bp.post("/api/tasks")
def create_task():
    data = request.get_json(silent=True) or {}
    if not data.get("title"):
        return jsonify({"error": "title required"}), 400
    saved = task_store.save_one(current_app.config["TASKS_STORE_PATH"], data)
    return jsonify(saved), 201


@bp.put("/api/tasks/<task_id>")
def update_task(task_id: str):
    data = request.get_json(silent=True) or {}
    try:
        updated = task_store.update_one(current_app.config["TASKS_STORE_PATH"], task_id, data)
    except KeyError:
        return jsonify({"error": "not found"}), 404
    return jsonify(updated)


@bp.delete("/api/tasks/<task_id>")
def delete_task(task_id: str):
    try:
        task_store.delete_one(current_app.config["TASKS_STORE_PATH"], task_id)
    except KeyError:
        return jsonify({"error": "not found"}), 404
    return ("", 204)

"""Entry point: dev / production launcher cho Wolffun PM Dashboard."""
import argparse
import logging
import threading
import time
import webbrowser
from pathlib import Path

from backend.app import create_app


def _open_browser(url: str, delay: float = 1.0) -> None:
    def _open():
        time.sleep(delay)
        webbrowser.open(url)
    threading.Thread(target=_open, daemon=True).start()


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--dev", action="store_true", help="Dev mode (debug, không serve dist)")
    p.add_argument("--port", type=int, default=5000)
    p.add_argument("--host", default="127.0.0.1")
    p.add_argument("--no-browser", action="store_true")
    args = p.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

    app = create_app(dev=args.dev)
    url = f"http://{args.host}:{args.port}/"
    if not args.no_browser and not args.dev:
        _open_browser(url)

    app.run(host=args.host, port=args.port, debug=args.dev, use_reloader=args.dev)


if __name__ == "__main__":
    main()

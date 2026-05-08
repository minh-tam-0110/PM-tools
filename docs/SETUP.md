# Setup

## Yêu cầu

- Node.js 20+ và npm 10+
- Python 3.10+ (chỉ cần khi chạy backend)
- Git

## Frontend

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173 (Vite)
npm run build        # build → frontend/dist/
npm run preview      # preview built bundle
npm run lint         # eslint + tsc --noEmit
```

Khi chạy `npm run dev`, mọi request `/api/*` sẽ proxy sang Flask `:5000` (xem `frontend/vite.config.ts`).

## Backend

Backend cần khi muốn **persist** task hoặc dùng **Playwright bridge** scrape Review 360°.

```bash
python -m venv .venv
. .venv/Scripts/activate            # Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt

# Lần đầu: cài Chromium cho Playwright (~150MB)
playwright install chromium

python run.py --dev                 # Flask :5000 (dev, debug=True)
python run.py                       # production: serve frontend/dist + API
python run.py --port 8080
python run.py --no-browser          # headless
```

### Login Review 360° (lần đầu)

```bash
curl -X POST http://localhost:5000/api/bridge/login
# → Chromium headed mở ra, login bằng tài khoản Wolffun → tự đóng khi xong
```

State lưu tại `backend/data/review360_state.json`. Lần sau scrape headless luôn không cần login lại.

### Scrape

```bash
curl -X POST http://localhost:5000/api/bridge/scrape | jq .
```

## Production (single process)

```bash
cd frontend && npm run build
python run.py                       # auto-opens browser
```

Flask serve `frontend/dist/index.html` cho mọi route ngoài `/api/*` (SPA fallback).

## Tests

```bash
pip install -r backend/requirements-dev.txt
pytest backend/tests/ -v

cd frontend && npm test             # vitest (khi có)
```

## Smoke test trước khi commit

```bash
python run.py --no-browser &
curl -s http://localhost:5000/                       # SPA HTML
curl -s http://localhost:5000/api/dashboard/health   # {"status":"ok"}
```

## Iframe bridge (Review 360°)

1. Chạy dashboard ở mode dev hoặc production.
2. Mở Connect modal → tab **Auto (iframe)**.
3. Đăng nhập Wolffun account trong iframe.
4. Nếu Firebase Hosting block iframe (`X-Frame-Options: DENY`), fallback sang tab **Manual (paste JSON)**.

Allowed origins cho `postMessage` được khai báo tại `frontend/src/lib/constants.ts` (mirror với `backend/features/bridge/bridge_config.py` nếu BE on).

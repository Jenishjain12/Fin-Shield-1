# FIN-SHIELD

FIN-SHIELD is an investigation aid for financial advertising. It helps an investigator collect submitted advertisement material, extract observable entities, apply explainable rules-based risk indicators, review supporting evidence, and examine stored relationships between records.

It is **not** a fraud verdict engine. A risk score is a configured triage signal, not a probability of crime or a finding of fraud. Relationships represent available shared evidence or conservative text similarity; they do not establish ownership or coordination. Seeded records are synthetic demonstration data.

## What is included

- Advertisement analysis from text, an optional image, and optional reference URL string.
- OCR integration when Tesseract is installed; image storage and an honest limitation state when it is not.
- Deterministic, explainable risk indicators with evidence for each contribution.
- Entity extraction for phones, URLs, domains, emails, payment handles, account-like strings, and phrase patterns.
- Evidence-backed relationships, campaign clusters, alerts, analyst notes, and review status.
- Discovery Agent with source status, run history, progress events, and strict URL-security controls.
- Grounded AI Investigation Copilot, enabled only when an authorized provider key is configured.
- A dark-first investigation workspace with a light theme, responsive drawer navigation, and accessible states.
- A cinematic **Intelligence Field** introduction with an optional, clearly labeled synthetic Signal Map demonstration.

## Architecture

| Layer | Technology | Responsibility |
| --- | --- | --- |
| Frontend | React 18, TypeScript, Vite, Tailwind | Investigation workspace, visualization, routing, themes |
| Backend | FastAPI, SQLAlchemy, Pydantic | Analysis API, records, discovery runs, Copilot orchestration |
| Storage | SQLite by default | Investigations, entities, signals, relationships, notes, alerts |
| Visualizations | Recharts, `@xyflow/react` | Dashboard metrics and evidence networks |

## Requirements

- Python 3.12
- Node.js 20 or later
- npm

Python 3.14 is not supported by this project’s pinned `pydantic-core` and Pillow runtime. On macOS with Homebrew, use `/opt/homebrew/opt/python@3.12/bin/python3.12`.

No API key is required for the main local demonstration. OCR and the AI Copilot are optional capabilities.

## Quick start

From the repository root:

```bash
cd backend
/opt/homebrew/opt/python@3.12/bin/python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cd ../frontend
npm install
```

Seed the synthetic demonstration dataset:

```bash
cd backend
source .venv/bin/activate
python seed.py
```

Seeding is idempotent: records with an existing `seed_key` are skipped.

Start the backend in one terminal:

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

Start the frontend in another terminal:

```bash
cd frontend
npm run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173).

## Navigation and entry flow

| URL | Experience |
| --- | --- |
| `/` | Intelligence Field on a first visit; otherwise redirects to the overview |
| `/welcome` | Replays the optional cinematic introduction |
| `/overview` | Direct access to the live dashboard |
| `/analyze` | Submit an advertisement for analysis |
| `/investigations` | Browse, filter, and open records |
| `/investigations/:adId` | Review evidence, indicators, notes, and related records |
| `/campaigns` | Inspect evidence-backed relationship clusters and Signal Maps |
| `/alerts` | Review stored rule alerts |
| `/discovery` | Configure and launch a Discovery Agent run |
| `/copilot` | Use the grounded AI Investigation Copilot when configured |

The introduction never calls an analysis workflow. Its Signal Map uses explicitly labeled illustrative synthetic content. The dashboard and Campaign Intelligence screens use records returned by the API.

## Signal Map

The shared Signal Map component is used in two contexts:

1. The Intelligence Field introduces the concept with clearly labeled illustrative data.
2. Campaign Intelligence passes actual campaign advertisements and stored relationship records to the same component.

Nodes can be selected to inspect their record summary; edges reveal relationship evidence. Text summaries, keyboard-focusable controls, responsive sizing, and reduced-motion support are included.

## Optional capabilities

### OCR

Text submissions work without OCR. To enable image text extraction, install Tesseract and then install the optional `pytesseract` package in the backend virtual environment. If unavailable, the app keeps the image and explains the limitation rather than fabricating extracted text.

### Discovery browser

Discovery uses Playwright and applies source authorization and URL-security controls. Install its browser runtime after activating the backend environment:

```bash
cd backend
source .venv/bin/activate
playwright install chromium
```

Some constrained or sandboxed macOS environments prevent a headless Chromium process from registering with the OS. In that case, browser-backed Discovery tests cannot run there; run them on a normal local development machine or CI runner with Playwright browser support.

### AI Investigation Copilot

Create `backend/.env` only when you have an authorized provider credential. Never commit this file.

```dotenv
# Primary provider
NVIDIA_API_KEY=replace_with_authorized_key
NVIDIA_MODEL=nvidia/nemotron-3.5-lightning-30b-a3b
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1

# Optional alternative provider
# GEMINI_API_KEY=replace_with_authorized_key
# GEMINI_MODEL=gemini-3.8-flash
```

The Copilot is grounded in the selected authorized record and returns a configuration or provider error if it cannot answer. It does not change deterministic risk scores.

## Configuration

`backend/.env` accepts the following common settings:

```dotenv
DATABASE_URL=sqlite:////absolute/path/to/data/finshield.db
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
SIMILARITY_THRESHOLD=0.72
```

For local Vite development, leave `VITE_API_BASE_URL` empty or omit it. Vite proxies `/api` and `/uploads` to `http://127.0.0.1:8000`.

## Tests and build

Frontend production build:

```bash
cd frontend
npm run build
```

Backend tests:

```bash
cd backend
source .venv/bin/activate
pytest -q
```

The browser-backed Discovery tests require a Playwright-capable host. All other tests can run without a Playwright browser process.

## API

The local API base URL is `http://127.0.0.1:8000`. Core endpoints include:

- `GET /api/dashboard/summary`
- `GET /api/ads`, `GET /api/ads/{ad_id}`, `POST /api/analyze`
- `PATCH /api/ads/{ad_id}/review`, `POST /api/ads/{ad_id}/notes`
- `GET /api/campaigns`, `GET /api/campaigns/{campaign_id}`
- `GET /api/alerts`, `PATCH /api/alerts/{alert_id}`
- `GET /api/discovery/sources`, `POST /api/discovery/runs`, `GET /api/discovery/runs/{run_id}/stream`
- `GET /api/copilot/status`, `POST /api/copilot/message`

See [docs/api.md](docs/api.md) for endpoint details.

## Safety and data handling

- Do not treat any score, relationship, or Copilot response as proof of fraud or criminality.
- Do not fetch arbitrary user-supplied URLs outside the controlled Discovery workflow.
- Do not commit keys, local databases, or uploaded material.
- Keep synthetic demonstration data visibly labeled.
- Review evidence and applicable policy before acting on a result.

## Project layout

```text
backend/                 FastAPI app, services, database models, tests
frontend/                React application
  src/pages/             Workspace, investigation, discovery, and intro routes
  src/components/        Shared UI including SignalMap
docs/                    Architecture, API, and development notes
```

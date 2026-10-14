# FIN-SHIELD API

Base URL (local): `http://127.0.0.1:8000`

All JSON responses. CORS is configured for the Vite dev server.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Liveness |
| GET | `/api/dashboard/summary` | Database-backed dashboard metrics |
| GET | `/api/ads` | Paginated investigations (`q`, `risk`, `review_status`, `page`, `page_size`) |
| GET | `/api/ads/{ad_id}` | Investigation detail |
| POST | `/api/analyze` | `multipart/form-data`: `text`, `source`, `source_url`, `image` |
| GET | `/api/ads/{ad_id}/relationships` | Evidence-backed edges |
| GET | `/api/campaigns` | Connected clusters |
| GET | `/api/campaigns/{campaign_id}` | Cluster members and edges |
| GET | `/api/alerts` | Stored alerts (`unread_only`) |
| PATCH | `/api/alerts/{alert_id}` | `{ "is_read": true }` |
| PATCH | `/api/ads/{ad_id}/review` | `{ "review_status": "unreviewed\|under_review\|escalated\|closed" }` |
| POST | `/api/ads/{ad_id}/notes` | `{ "content": "..." }` |
| GET | `/api/discovery/sources` | Available source adapters and authorization status |
| POST | `/api/discovery/runs` | Start a bounded discovery run |
| GET | `/api/discovery/runs` | Recent discovery runs |
| GET | `/api/discovery/runs/{run_id}` | Run detail, candidates, and linked analyses |
| GET | `/api/discovery/runs/{run_id}/stream` | Server-sent discovery progress events |
| GET | `/api/copilot/status` | Copilot provider configuration status, without exposing a key |
| POST | `/api/copilot/message` | Evidence-grounded Copilot query for an authorized record |

Review updates do not modify `risk_score`.

Analyze requires text or an image. Images: JPEG/PNG/WebP, max 5 MB. Reference URLs are parsed as strings only.

Discovery run creation accepts `query`, `sources`, `max_candidates` (1–20), and `min_risk_threshold` (0–100). The response only represents a started run; the client must inspect its returned status or progress stream before treating it as complete.

Copilot queries accept `message`, an optional `advertisement_id`, an optional `compare_ad_id`, and recent conversation history. The Copilot is unavailable until an authorized provider is configured; an unavailable provider returns a structured error rather than a fabricated answer.

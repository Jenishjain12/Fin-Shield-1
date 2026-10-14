import logging
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api import ads, alerts, analyze, campaigns, copilot, dashboard, discovery, health
from app.core.config import get_settings
from app.db.base import Base
from app.db.session import engine
from app.models import Alert, AnalystNote, Advertisement, AdvertisementRelationship, DiscoveryCandidate, DiscoveryRun, ExtractedEntity, RiskSignal  # noqa: F401

logger = logging.getLogger("finshield")
settings = get_settings()
Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
Base.metadata.create_all(bind=engine)


def migrate_schema(db_engine):
    """Ensure database schema includes all necessary columns for backward compatibility."""
    from sqlalchemy import text
    try:
        with db_engine.begin() as conn:
            runs_cols = [r[1] for r in conn.execute(text("PRAGMA table_info(discovery_runs)")).fetchall()]
            if runs_cols and "min_risk_threshold" not in runs_cols:
                conn.execute(text("ALTER TABLE discovery_runs ADD COLUMN min_risk_threshold INTEGER DEFAULT 0"))

            cand_cols = [r[1] for r in conn.execute(text("PRAGMA table_info(discovery_candidates)")).fetchall()]
            if cand_cols and "source_type" not in cand_cols:
                conn.execute(text("ALTER TABLE discovery_candidates ADD COLUMN source_type VARCHAR(50) DEFAULT 'web'"))
    except Exception as exc:
        logger.warning("Schema migration notice: %s", exc)


migrate_schema(engine)

app = FastAPI(title="FIN-SHIELD", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(ads.router, prefix="/api")
app.include_router(analyze.router, prefix="/api")
app.include_router(campaigns.router, prefix="/api")
app.include_router(alerts.router, prefix="/api")
app.include_router(discovery.router, prefix="/api")
app.include_router(copilot.router, prefix="/api")

app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")


@app.exception_handler(Exception)
async def unhandled_exception(request: Request, exc: Exception) -> JSONResponse:
    if isinstance(exc, HTTPException):
        raise exc
    logger.exception("Unhandled server exception on %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(status_code=500, content={"detail": "An unexpected server error occurred."})

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileText,
  Globe,
  Image as ImageIcon,
  KeyRound,
  Layers,
  Link2,
  Loader2,
  Play,
  RefreshCw,
  Search,
  Shield,
  Sliders,
  Sparkles,
  X,
  XCircle,
} from "lucide-react";
import { api } from "../services/api";
import type {
  DiscoveryCandidate,
  DiscoveryRun,
  DiscoveryRunDetail,
  DiscoverySSEEvent,
  CandidateAnalysis,
  SourceInfo,
} from "../types/api";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { Skeleton } from "../components/Skeleton";
import { ErrorBanner } from "../components/ErrorBanner";
import { riskClass } from "../lib/format";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "";

// ── Status helpers ────────────────────────────────────────────────────────

function runStatusLabel(status: string) {
  switch (status) {
    case "pending":     return "Pending";
    case "searching":   return "Searching…";
    case "processing":  return "Processing…";
    case "completed":   return "Completed";
    case "failed":      return "Failed";
    case "cancelled":   return "Cancelled";
    default:            return status;
  }
}

function runStatusColor(status: string) {
  switch (status) {
    case "completed":  return "text-ok";
    case "failed":     return "text-danger";
    case "searching":
    case "processing": return "text-accent";
    default:           return "text-sub";
  }
}

function candidateStatusIcon(status: string) {
  switch (status) {
    case "analyzed":  return <CheckCircle2 size={14} className="text-ok" />;
    case "captured":  return <ImageIcon size={14} className="text-accent" />;
    case "failed":    return <XCircle size={14} className="text-danger" />;
    case "skipped":   return <XCircle size={14} className="text-dim" />;
    case "duplicate": return <RefreshCw size={14} className="text-warn" />;
    default:          return <Clock size={14} className="text-sub" />;
  }
}

// ── Main Page ─────────────────────────────────────────────────────────────

export function DiscoveryPage() {
  // ── State ──────────────────────────────────────────────────────────────
  const [query, setQuery] = useState("");
  const [maxCandidates, setMaxCandidates] = useState(5);
  const [minRiskThreshold, setMinRiskThreshold] = useState(0);
  const [selectedSources, setSelectedSources] = useState<string[]>(["web", "synthetic_testbed"]);
  const [availableSources, setAvailableSources] = useState<SourceInfo[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [activeRun, setActiveRun] = useState<DiscoveryRun | null>(null);
  const [runDetail, setRunDetail] = useState<DiscoveryRunDetail | null>(null);
  const [sseMessages, setSseMessages] = useState<DiscoverySSEEvent[]>([]);

  const [pastRuns, setPastRuns] = useState<DiscoveryRun[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const logRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // ── Load sources and past runs ─────────────────────────────────────────
  const loadSources = useCallback(async () => {
    try {
      const sources = await api.discoverySources();
      setAvailableSources(sources);
    } catch {
      /* ignore */
    }
  }, []);

  const loadRuns = useCallback(async () => {
    try {
      const runs = await api.discoveryRuns();
      setPastRuns(runs);

      const active = runs.find((r) =>
        ["pending", "searching", "processing"].includes(r.status)
      );
      if (active && !activeRun) {
        setActiveRun(active);
        connectSSE(active.id);
      }
    } catch {
      /* ignore */
    } finally {
      setLoadingRuns(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadSources();
    loadRuns();
    return () => {
      eventSourceRef.current?.close();
    };
  }, [loadSources, loadRuns]);

  // ── SSE connection ─────────────────────────────────────────────────────
  function connectSSE(runId: string) {
    eventSourceRef.current?.close();
    const es = new EventSource(`${BASE}/api/discovery/runs/${runId}/stream`);
    eventSourceRef.current = es;

    es.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data) as DiscoverySSEEvent;
        setSseMessages((prev) => [...prev, data]);

        requestAnimationFrame(() => {
          logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
        });

        if (data.event_type === "done" || data.status === "completed" || data.status === "failed") {
          es.close();
          api.discoveryRun(runId).then((detail) => {
            setRunDetail(detail);
            setActiveRun((prev) => prev ? {
              ...prev,
              status: detail.status,
              candidates_found: detail.candidates_found,
              candidates_analyzed: detail.candidates_analyzed,
            } : null);
          });
          loadRuns();
        } else {
          setActiveRun((prev) => prev ? {
            ...prev,
            status: data.status || prev.status,
            progress_message: data.message,
            candidates_found: data.candidates_found ?? prev.candidates_found,
            candidates_analyzed: data.candidates_analyzed ?? prev.candidates_analyzed,
          } : null);
        }
      } catch {
        /* ignore parse errors */
      }
    };

    es.onerror = () => {
      es.close();
      api.discoveryRun(runId).then((detail) => {
        setRunDetail(detail);
        setActiveRun((prev) => prev ? { ...prev, status: detail.status } : null);
      }).catch(() => {});
    };
  }

  // ── Start discovery ────────────────────────────────────────────────────
  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim() || selectedSources.length === 0) return;
    setIsSubmitting(true);
    setSubmitError(null);
    setSseMessages([]);
    setRunDetail(null);

    try {
      const sourcesParam = selectedSources.join(",");
      const run = await api.startDiscovery(query.trim(), sourcesParam, maxCandidates, minRiskThreshold);
      setActiveRun(run);
      connectSSE(run.id);
    } catch (err: any) {
      setSubmitError(err?.message || "Failed to start discovery run.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Toggle Source ──────────────────────────────────────────────────────
  function toggleSource(sourceId: string) {
    setSelectedSources((prev) =>
      prev.includes(sourceId)
        ? prev.filter((id) => id !== sourceId)
        : [...prev, sourceId]
    );
  }

  // ── View a past run ────────────────────────────────────────────────────
  async function viewRun(runId: string) {
    try {
      const detail = await api.discoveryRun(runId);
      setRunDetail(detail);
      setActiveRun(detail);
      setSseMessages([]);
    } catch {
      /* ignore */
    }
  }

  function getAnalysis(candidateId: string): CandidateAnalysis | undefined {
    return runDetail?.candidate_analyses?.find((a) => a.candidate_id === candidateId);
  }

  const isActive = activeRun && ["pending", "searching", "processing"].includes(activeRun.status);

  // ── Filter candidates by threshold if desired ──────────────────────────
  const candidatesToDisplay = runDetail?.candidates.filter((c) => {
    if (minRiskThreshold <= 0) return true;
    const ad = getAnalysis(c.id)?.advertisement;
    return !ad || ad.risk_score >= minRiskThreshold;
  }) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Autonomous Discovery Agent"
        description="Autonomous browsing agent that searches public web sources, discovers financial advertisements, captures screenshots, and runs OCR and risk analysis without manual upload."
      />

      {/* ── Configuration Form ──────────────────────────────────────── */}
      <form onSubmit={handleStart} className="rounded border border-line bg-panel p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <Bot size={18} className="text-accent" />
            <div>
              <h2 className="text-sm font-semibold text-paper">Configure Discovery Run</h2>
              <p className="text-2xs text-sub">Set an objective, choose source adapters, and prioritize by risk.</p>
            </div>
          </div>
          <span className="text-2xs font-mono text-dim">Playwright Chromium · Headless Sandbox</span>
        </div>

        <div className="space-y-4">
          {/* Query input */}
          <div>
            <label htmlFor="discovery-query" className="block text-2xs font-medium uppercase tracking-[0.08em] text-sub mb-1.5">
              Search Objective / Financial Promotion Topic
            </label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dim" />
              <input
                id="discovery-query"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder='e.g. "guaranteed 30% monthly returns double money India" or "instant loan no credit check advance fee"'
                className="w-full rounded border border-line bg-surface pl-9 pr-3 py-2 text-sm text-paper
                           placeholder:text-dim focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30"
                disabled={!!isActive}
                maxLength={500}
              />
            </div>
          </div>

          {/* Source Selection Adapters */}
          <div>
            <label className="block text-2xs font-medium uppercase tracking-[0.08em] text-sub mb-1.5 flex items-center gap-1.5">
              <Layers size={12} className="text-accent" />
              Supported Source Adapters
            </label>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {availableSources.length === 0 ? (
                <div className="col-span-full text-2xs text-dim">Loading sources…</div>
              ) : (
                availableSources.map((source) => {
                  const isChecked = selectedSources.includes(source.source_id);
                  const isAvailable = source.status === "available";
                  return (
                    <button
                      key={source.source_id}
                      type="button"
                      disabled={!!isActive}
                      onClick={() => {
                        if (!isAvailable) {
                          setSubmitError(
                            `${source.name} requires platform credentials. ${source.notes}`
                          );
                          return;
                        }
                        setSubmitError(null);
                        toggleSource(source.source_id);
                      }}
                      className={`text-left rounded border p-2.5 transition-colors ${
                        isChecked
                          ? "border-accent/50 bg-accent/[0.08]"
                          : isAvailable
                          ? "border-line bg-surface/50 hover:border-line-hover"
                          : "border-line/60 bg-surface/30 opacity-60 cursor-pointer"
                      } ${isActive ? "cursor-not-allowed opacity-50" : ""}`}
                    >
                      <div className="flex items-center justify-between gap-1.5 mb-1">
                        <span className="text-xs font-semibold text-paper flex items-center gap-1.5">
                          {source.source_id === "synthetic_testbed" ? (
                            <Sparkles size={12} className="text-accent" />
                          ) : (
                            <Globe size={12} className="text-sub" />
                          )}
                          {source.name}
                        </span>
                        {isAvailable ? (
                          <span className="inline-flex items-center rounded-full bg-ok/10 px-1.5 py-0.2 text-3xs font-medium text-ok">
                            Ready
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-warn/10 px-1.5 py-0.2 text-3xs font-medium text-warn">
                            <KeyRound size={8} /> Auth Required
                          </span>
                        )}
                      </div>
                      <p className="text-3xs text-dim line-clamp-2 leading-relaxed">
                        {isAvailable ? source.description : source.notes}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Limits and Thresholds */}
          <div className="grid gap-4 sm:grid-cols-3 pt-1">
            <div>
              <label htmlFor="max-candidates" className="block text-2xs font-medium uppercase tracking-[0.08em] text-sub mb-1.5">
                Max Discovery Candidates
              </label>
              <select
                id="max-candidates"
                value={maxCandidates}
                onChange={(e) => setMaxCandidates(Number(e.target.value))}
                className="w-full rounded border border-line bg-surface px-3 py-2 text-sm text-paper
                           focus:outline-none focus:border-accent/50"
                disabled={!!isActive}
              >
                {[1, 2, 3, 5, 10, 15, 20].map((n) => (
                  <option key={n} value={n}>{n} candidate{n !== 1 ? "s" : ""}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="min-risk" className="block text-2xs font-medium uppercase tracking-[0.08em] text-sub mb-1.5 flex items-center gap-1">
                <Sliders size={11} className="text-accent" />
                Prioritization Threshold
              </label>
              <select
                id="min-risk"
                value={minRiskThreshold}
                onChange={(e) => setMinRiskThreshold(Number(e.target.value))}
                className="w-full rounded border border-line bg-surface px-3 py-2 text-sm text-paper
                           focus:outline-none focus:border-accent/50"
                disabled={!!isActive}
              >
                <option value={0}>All candidates (0+)</option>
                <option value={25}>Medium risk and above (25+)</option>
                <option value={50}>High risk and above (50+)</option>
                <option value={75}>Critical priority only (75+)</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={!!isActive || isSubmitting || !query.trim() || selectedSources.length === 0}
                className="w-full flex items-center justify-center gap-2 rounded bg-accent px-4 py-2 text-sm font-medium text-white
                           hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Play size={14} />
                )}
                {isActive ? "Browsing Active…" : "Launch Autonomous Agent"}
              </button>
            </div>
          </div>
        </div>

        {submitError && <ErrorBanner message={submitError} />}

        <div className="flex items-start gap-2 pt-1 border-t border-line/60">
          <AlertTriangle size={12} className="mt-0.5 shrink-0 text-warn/80" />
          <p className="text-2xs text-dim leading-relaxed">
            <strong>Security & Compliance:</strong> Browsing strictly enforces SSRF protection, loopback/private-IP blocking, and DNS pre-resolution.
            Webpage content is treated strictly as data. The agent respects platform access controls and does not bypass CAPTCHAs or authentication walls.
          </p>
        </div>
      </form>

      {/* ── Active Run Live Progress ─────────────────────────────────── */}
      {activeRun && (
        <div className="rounded border border-line bg-panel overflow-hidden">
          {/* Run header */}
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <div className="flex items-center gap-3">
              {isActive ? (
                <Loader2 size={16} className="animate-spin text-accent" />
              ) : activeRun.status === "completed" ? (
                <CheckCircle2 size={16} className="text-ok" />
              ) : (
                <XCircle size={16} className="text-danger" />
              )}
              <div>
                <p className="text-sm font-medium text-paper flex items-center gap-2">
                  <span>{activeRun.query}</span>
                  <span className="text-2xs font-normal text-dim font-mono">[{activeRun.sources}]</span>
                </p>
                <p className="text-2xs text-sub mt-0.5">
                  <span className={runStatusColor(activeRun.status)}>{runStatusLabel(activeRun.status)}</span>
                  {" · "}
                  {activeRun.candidates_found} candidate{activeRun.candidates_found !== 1 ? "s" : ""} captured
                  {" · "}
                  {activeRun.candidates_analyzed} passed through OCR & risk engine
                </p>
              </div>
            </div>
            {!isActive && (
              <button
                type="button"
                onClick={() => { setActiveRun(null); setRunDetail(null); setSseMessages([]); }}
                className="text-2xs text-dim hover:text-sub transition-colors"
              >
                Dismiss
              </button>
            )}
          </div>

          {/* Live Progress Log */}
          {sseMessages.length > 0 && (
            <div
              ref={logRef}
              className="max-h-52 overflow-y-auto border-b border-line bg-bg px-5 py-3 space-y-1 font-mono text-2xs"
            >
              {sseMessages.map((msg, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="shrink-0 text-dim tabular">{String(i + 1).padStart(3, "0")}</span>
                  <span className={
                    msg.event_type === "error" ? "text-danger" :
                    msg.event_type === "done" ? "text-ok" :
                    msg.event_type === "candidate_found" ? "text-accent font-semibold" :
                    msg.event_type === "source_status" ? "text-warn" :
                    "text-sub"
                  }>
                    {msg.message}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Discovered Candidates Grid */}
          {runDetail && candidatesToDisplay.length > 0 && (
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-sub">
                  Captured Evidence & Risk Analysis ({candidatesToDisplay.length})
                </h3>
                {minRiskThreshold > 0 && (
                  <span className="text-2xs text-accent">
                    Filtered by risk score ≥ {minRiskThreshold}
                  </span>
                )}
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {candidatesToDisplay.map((candidate) => (
                  <CandidateCard
                    key={candidate.id}
                    candidate={candidate}
                    analysis={getAnalysis(candidate.id)}
                    onOpenPreview={(filename) => setPreviewImage(filename)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Discovery History ───────────────────────────────────────── */}
      <div className="rounded border border-line bg-panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <div className="flex items-center gap-2">
            <Clock size={15} className="text-sub" />
            <h2 className="text-sm font-semibold text-paper">Investigation Discovery Runs</h2>
          </div>
          <button
            type="button"
            onClick={loadRuns}
            className="text-2xs text-dim hover:text-sub transition-colors flex items-center gap-1"
          >
            <RefreshCw size={11} /> Refresh
          </button>
        </div>

        {loadingRuns ? (
          <div className="p-5 space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : pastRuns.length === 0 ? (
          <div className="p-8 text-center">
            <Globe size={32} className="mx-auto text-dim mb-3" />
            <p className="text-sm text-sub">No discovery runs recorded</p>
            <p className="text-2xs text-dim mt-1">
              Launch the autonomous agent above to search public web sources for financial promotions.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {pastRuns.map((run) => (
              <button
                key={run.id}
                type="button"
                onClick={() => viewRun(run.id)}
                className="w-full flex items-center justify-between gap-4 px-5 py-3
                           hover:bg-surface/50 transition-colors text-left"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-paper truncate">{run.query}</p>
                  <p className="text-2xs text-dim mt-0.5">
                    {new Date(run.created_at).toLocaleString()} · Sources: <span className="text-sub">{run.sources}</span>
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-2xs text-sub tabular">
                    {run.candidates_found} found · {run.candidates_analyzed} analyzed
                  </span>
                  <span className={`text-2xs font-medium ${runStatusColor(run.status)}`}>
                    {runStatusLabel(run.status)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Image Preview Modal ─────────────────────────────────────── */}
      {previewImage && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-surface rounded border border-line overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-2 right-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/90 transition-colors"
            >
              <X size={18} />
            </button>
            <img
              src={`${BASE}/uploads/${previewImage}`}
              alt="High resolution captured screenshot evidence"
              className="max-h-[85vh] w-auto object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Candidate Card ───────────────────────────────────────────────────────

function CandidateCard({
  candidate,
  analysis,
  onOpenPreview,
}: {
  candidate: DiscoveryCandidate;
  analysis?: CandidateAnalysis;
  onOpenPreview: (filename: string) => void;
}) {
  const ad = analysis?.advertisement;
  const relationships = ad?.relationships ?? [];

  return (
    <div className="rounded border border-line bg-surface overflow-hidden flex flex-col justify-between">
      <div>
        {/* Screenshot preview */}
        {candidate.screenshot_filename ? (
          <div className="relative border-b border-line bg-bg group">
            <img
              src={`${BASE}/uploads/${candidate.screenshot_filename}`}
              alt={`Screenshot evidence for ${candidate.page_title || candidate.source_url}`}
              className="w-full h-44 object-cover object-top"
              loading="lazy"
            />
            <button
              type="button"
              onClick={() => onOpenPreview(candidate.screenshot_filename!)}
              className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-medium gap-1"
            >
              <Eye size={14} /> Click to enlarge screenshot
            </button>
            <div className="absolute top-2 right-2 flex gap-1.5">
              {candidate.source_type && (
                <span className="rounded bg-black/60 backdrop-blur px-1.5 py-0.5 text-3xs font-mono text-white/90 uppercase">
                  {candidate.source_type}
                </span>
              )}
              {ad && (
                <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5
                                  text-2xs font-semibold ${riskClass(ad.risk_category)}`}>
                  <Shield size={11} />
                  Risk: {ad.risk_score}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="h-24 bg-bg border-b border-line flex items-center justify-center text-dim text-xs">
            <ImageIcon size={18} className="mr-1.5" /> No screenshot available
          </div>
        )}

        <div className="p-4 space-y-3">
          {/* Title and source link */}
          <div>
            <p className="text-sm font-semibold text-paper truncate" title={candidate.page_title || "Untitled"}>
              {candidate.page_title || "Discovered Promotion Page"}
            </p>
            <a
              href={candidate.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-2xs text-accent hover:underline mt-0.5 truncate max-w-full"
            >
              <ExternalLink size={10} className="shrink-0" />
              <span className="truncate">{candidate.source_url}</span>
            </a>
          </div>

          {/* Discovery selection reason */}
          <div className="rounded bg-bg/80 border border-line p-2 text-2xs text-sub leading-relaxed">
            <span className="text-dim font-medium uppercase tracking-wider text-3xs block mb-0.5">Selection Reason</span>
            {candidate.selection_reason}
          </div>

          {/* Relevance score */}
          <div className="flex items-center gap-2">
            <span className="text-2xs text-sub">Promotion relevance:</span>
            <div className="flex-1 h-1.5 rounded-full bg-line overflow-hidden">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${Math.round(candidate.ad_relevance_score * 100)}%` }}
              />
            </div>
            <span className="text-2xs font-mono text-sub">{Math.round(candidate.ad_relevance_score * 100)}%</span>
          </div>

          {/* Pipeline Status Badges */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="inline-flex items-center gap-1 rounded bg-panel border border-line px-2 py-0.5 text-3xs text-sub">
              {candidateStatusIcon(candidate.status)}
              Capture: {candidate.status}
            </span>
            {ad && (
              <>
                <span className="inline-flex items-center gap-1 rounded bg-panel border border-line px-2 py-0.5 text-3xs text-sub">
                  <FileText size={10} className="text-accent" />
                  OCR: {ad.ocr_status}
                </span>
                <span className="inline-flex items-center gap-1 rounded bg-panel border border-line px-2 py-0.5 text-3xs text-sub">
                  <Shield size={10} className="text-ok" />
                  Pipeline: Analyzed
                </span>
              </>
            )}
          </div>

          {/* Risk analysis & triggered signals */}
          {ad && (
            <div className="border-t border-line pt-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xs font-semibold uppercase tracking-wider text-sub">Risk Assessment</span>
                <StatusBadge value={ad.risk_category} />
              </div>

              {/* Signals */}
              {ad.signals.length > 0 && (
                <div className="space-y-1">
                  {ad.signals.slice(0, 3).map((s) => (
                    <div key={s.id} className="rounded bg-panel/70 border border-line p-1.5 text-2xs space-y-0.5">
                      <div className="flex items-center justify-between text-paper font-medium">
                        <span className="flex items-center gap-1">
                          <AlertTriangle size={11} className="text-warn shrink-0" />
                          {s.title}
                        </span>
                        <span className="text-3xs text-dim">+{s.contribution}</span>
                      </div>
                      <p className="text-3xs text-dim leading-snug">{s.explanation}</p>
                    </div>
                  ))}
                  {ad.signals.length > 3 && (
                    <p className="text-3xs text-sub">+{ad.signals.length - 3} additional risk indicator(s)</p>
                  )}
                </div>
              )}

              {/* Extracted Entities */}
              {ad.entities.length > 0 && (
                <div className="text-2xs">
                  <span className="text-dim text-3xs block mb-1">Observable Identifiers:</span>
                  <div className="flex flex-wrap gap-1">
                    {ad.entities.slice(0, 4).map((ent) => (
                      <span key={ent.id} className="rounded border border-line bg-surface px-1.5 py-0.5 text-3xs font-mono text-paper">
                        {ent.entity_type}: {ent.normalized_value}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Triggered Related Ads / Anomalies */}
              {relationships.length > 0 && (
                <div className="rounded border border-accent/30 bg-accent/[0.05] p-2 text-2xs space-y-1">
                  <span className="font-semibold text-accent flex items-center gap-1">
                    <Link2 size={11} /> Coordinated Campaign Anomaly:
                  </span>
                  <p className="text-3xs text-sub">
                    Linked to {relationships.length} other advertisement(s) via shared contact or text similarity.
                  </p>
                </div>
              )}

              {/* Collapsible Extracted OCR Text */}
              {ad.ocr_text && (
                <details className="text-2xs">
                  <summary className="text-sub cursor-pointer hover:text-paper transition-colors py-0.5">
                    View extracted copy ({ad.ocr_text.length} chars)
                  </summary>
                  <p className="mt-1 rounded bg-bg border border-line p-2 text-dim font-mono whitespace-pre-wrap max-h-24 overflow-y-auto text-3xs">
                    {ad.ocr_text}
                  </p>
                </details>
              )}
            </div>
          )}

          {candidate.error_message && (
            <p className="text-2xs text-danger">{candidate.error_message}</p>
          )}
        </div>
      </div>

      {/* Card Footer Actions */}
      <div className="border-t border-line px-4 py-2.5 bg-panel/50 flex items-center justify-between">
        <span className="text-3xs text-dim">
          {candidate.captured_at ? new Date(candidate.captured_at).toLocaleTimeString() : ""}
        </span>
        {ad ? (
          <Link
            to={`/investigations/${ad.id}`}
            className="inline-flex items-center gap-1 text-2xs font-medium text-accent hover:underline"
          >
            Open Investigation Detail →
          </Link>
        ) : (
          <span className="text-3xs text-dim">Analysis pending</span>
        )}
      </div>
    </div>
  );
}

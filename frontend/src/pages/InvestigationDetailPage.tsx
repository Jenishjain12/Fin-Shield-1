import { FormEvent, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Bot,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  MessageSquare,
  Send,
  ShieldAlert,
  AlertTriangle,
} from "lucide-react";
import { Breadcrumb } from "../components/Breadcrumb";
import { EntityPanel } from "../components/EntityPanel";
import { ErrorBanner } from "../components/ErrorBanner";
import { EmptyState } from "../components/EmptyState";
import { RiskScore } from "../components/RiskGauge";
import { SignalCard } from "../components/SignalCard";
import { Skeleton } from "../components/Skeleton";
import { useToast } from "../components/Toast";
import { useAsync } from "../hooks/useAsync";
import { formatDate, relationshipLabel, riskBg, truncate } from "../lib/format";
import { api } from "../services/api";
import type { ReviewStatus } from "../types/api";

const REVIEW_OPTIONS: { status: ReviewStatus; label: string; Icon: typeof Clock }[] = [
  { status: "unreviewed",  label: "Unreviewed",  Icon: Clock },
  { status: "under_review",label: "Under review", Icon: ShieldAlert },
  { status: "escalated",   label: "Escalated",    Icon: ShieldAlert },
  { status: "closed",      label: "Closed",       Icon: CheckCircle2 },
];

const REVIEW_ACTIVE: Record<ReviewStatus, string> = {
  unreviewed:   "border-dim/40 bg-surface text-sub",
  under_review: "border-warn/40 bg-warn/[0.07] text-warn",
  escalated:    "border-danger/40 bg-danger/[0.07] text-danger",
  closed:       "border-ok/40 bg-ok/[0.07] text-ok",
};

export function InvestigationDetailPage() {
  const { adId } = useParams();
  const toast = useToast();
  const { data, error, loading, reload, setData } = useAsync(
    () => api.ad(adId!),
    [adId]
  );
  const [note, setNote]         = useState("");
  const [noteBusy, setNoteBusy] = useState(false);

  async function submitNote(event: FormEvent) {
    event.preventDefault();
    if (!note.trim() || !data) return;
    setNoteBusy(true);
    try {
      const newNote = await api.addNote(data.id, note.trim());
      setData({ ...data, notes: [...data.notes, newNote] });
      setNote("");
      toast("Note saved.");
    } catch {
      toast("Failed to save note.", "err");
    } finally {
      setNoteBusy(false);
    }
  }

  async function setReview(status: ReviewStatus) {
    if (!data) return;
    try {
      const updated = await api.updateReview(data.id, status);
      setData(updated);
      toast(`Status updated to "${status}".`);
    } catch {
      toast("Failed to update review status.", "err");
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-36" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-48 lg:col-span-2" />
          <Skeleton className="h-48" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }
  if (error) return <ErrorBanner message={error} onRetry={reload} />;
  if (!data) return null;

  return (
    <div className="space-y-5">
      {/* ── Breadcrumb ─────────────────────────────────────────────────── */}
      <Breadcrumb
        items={[
          { label: "Investigations", to: "/investigations" },
          { label: truncate(data.text, 55) },
        ]}
      />

      {/* ── Header: Score + Meta + Status ─────────────────────────────── */}
      <section
        className="rounded border border-line bg-panel p-5 animate-fade-in"
        aria-labelledby="investigation-title"
      >
        <div className="grid gap-5 md:grid-cols-[1fr,240px]">
          {/* Left: meta + status */}
          <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 id="investigation-title" className="text-xl font-semibold text-paper">
                    Investigation record
                  </h1>
                  {data.is_seed ? (
                    <span className="rounded border border-line bg-surface px-2 py-0.5 text-2xs text-dim">
                      synthetic demonstration data
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-sub">
                  Analyzed {formatDate(data.created_at)}
                  {data.source ? ` · Source: ${data.source}` : ""}
                </p>
              </div>
              <Link
                to={`/copilot?adId=${data.id}`}
                className="inline-flex items-center gap-1.5 rounded border border-brand/40 bg-brand/10 px-3 py-1.5 text-xs font-medium text-brand hover:bg-brand/20 transition-colors shadow-sm"
              >
                <Bot size={13} aria-hidden="true" />
                <span>Investigate with Copilot</span>
              </Link>
            </div>

            {/* Review status */}
            <div>
              <p className="mb-2 text-2xs font-semibold uppercase tracking-[0.08em] text-sub">
                Review status
              </p>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Set review status">
                {REVIEW_OPTIONS.map((opt) => {
                  const isActive = data.review_status === opt.status;
                  return (
                    <button
                      key={opt.status}
                      type="button"
                      onClick={() => setReview(opt.status)}
                      aria-pressed={isActive}
                      className={`flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs
                                  font-medium transition-all ${
                        isActive
                          ? REVIEW_ACTIVE[opt.status]
                          : "border-line text-sub hover:bg-surface hover:text-paper"
                      }`}
                    >
                      <opt.Icon size={11} aria-hidden="true" />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Investigative guidance */}
            {data.recommendation ? (
              <div className="rounded border border-line-subtle bg-surface px-4 py-3">
                <p className="text-2xs font-semibold uppercase tracking-[0.08em] text-sub mb-1.5">
                  Investigative guidance
                </p>
                <p className="text-sm leading-relaxed text-paper/80">
                  {data.recommendation}
                </p>
              </div>
            ) : null}
          </div>

          {/* Right: Risk score */}
          <div>
            <RiskScore score={data.risk_score} category={data.risk_category} />
          </div>
        </div>
      </section>

      {/* ── Submitted content ─────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <section
          className="rounded border border-line bg-panel p-5 lg:col-span-2 animate-fade-in-d1"
          aria-labelledby="copy-heading"
        >
          <div className="flex items-center gap-2 mb-3">
            <FileText size={13} className="text-dim" aria-hidden="true" />
            <h2 id="copy-heading" className="text-sm font-semibold text-paper">
              Submitted copy
            </h2>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-paper/75 font-mono">
            {data.text}
          </p>
          {data.ocr_text ? (
            <div className="mt-4 rounded border border-line-subtle bg-bg px-4 py-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <ImageIcon size={12} className="text-dim" aria-hidden="true" />
                <p className="text-2xs font-semibold uppercase tracking-[0.08em] text-sub">
                  OCR-extracted text
                </p>
              </div>
              <p className="font-mono text-xs leading-relaxed text-paper/55">
                {data.ocr_text}
              </p>
            </div>
          ) : null}
        </section>

        {data.image_filename ? (
          <section
            className="rounded border border-line bg-panel p-4 animate-fade-in-d2"
            aria-labelledby="image-heading"
          >
            <h2 id="image-heading" className="text-sm font-semibold text-paper mb-3">
              Submitted image
            </h2>
            <img
              src={`/uploads/${data.image_filename}`}
              alt="Submitted advertisement image"
              className="rounded border border-line w-full object-contain"
            />
          </section>
        ) : null}
      </div>

      {/* ── Caveat ────────────────────────────────────────────────────── */}
      <div
        className="flex items-start gap-2.5 rounded border border-warn/20 bg-warn/[0.04] px-4 py-3 animate-fade-in-d1"
        role="note"
      >
        <AlertTriangle size={13} className="mt-px shrink-0 text-warn/70" aria-hidden="true" />
        <p className="text-xs leading-relaxed text-sub">
          Risk indicators below are based on configured rules, not trained models.
          Detected indicators represent observable patterns, not verified evidence of fraud.
          Human review is required before any investigative action.
        </p>
      </div>

      {/* ── Risk indicators + Entities ────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section
          className="rounded border border-line bg-panel p-5 animate-fade-in-d2"
          aria-labelledby="signals-heading"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 id="signals-heading" className="text-sm font-semibold text-paper">
              Risk indicators
            </h2>
            <span className="text-2xs text-sub">{data.signals.length} detected</span>
          </div>

          {data.signals.length === 0 ? (
            <EmptyState
              title="No elevated indicators detected"
              body="Absence of rule hits does not confirm the advertisement is legitimate. Manual review is still advised."
            />
          ) : (
            <div className="space-y-2">
              {data.signals.map((signal) => (
                <SignalCard key={signal.id} signal={signal} />
              ))}
            </div>
          )}

          {data.limitations ? (
            <div className="mt-4 rounded border border-line-subtle bg-bg px-3 py-2.5">
              <p className="text-2xs font-semibold uppercase tracking-[0.08em] text-sub mb-1">
                Assessment limitations
              </p>
              <p className="text-xs text-dim leading-relaxed">{data.limitations}</p>
            </div>
          ) : null}
        </section>

        <section
          className="rounded border border-line bg-panel p-5 animate-fade-in-d3"
          aria-labelledby="entities-heading"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 id="entities-heading" className="text-sm font-semibold text-paper">
              Extracted entities
            </h2>
            <span className="text-2xs text-sub">
              {data.entities.filter((e) => e.entity_type !== "phrase").length} actionable
            </span>
          </div>
          <EntityPanel entities={data.entities} />
        </section>
      </div>

      {/* ── Related advertisements ────────────────────────────────────── */}
      {data.relationships && data.relationships.length > 0 ? (
        <section
          className="rounded border border-line bg-panel p-5 animate-fade-in-d3"
          aria-labelledby="related-heading"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 id="related-heading" className="text-sm font-semibold text-paper">
              Related advertisements
            </h2>
            <span className="text-2xs text-sub">{data.relationships.length} relationship{data.relationships.length !== 1 ? "s" : ""}</span>
          </div>
          <p className="mb-3 text-xs text-sub leading-relaxed">
            Relationships are based on observed shared identifiers or inferred text
            similarity. They do not establish that these advertisements belong to
            the same operation.
          </p>
          <div className="divide-y divide-line/60">
            {data.relationships.map((rel) => {
              const relatedId =
                rel.source_ad_id === data.id ? rel.target_ad_id : rel.source_ad_id;
              return (
                <div key={rel.id} className={`flex items-center gap-3 py-3 border-l-2 pl-3 ${riskBg("MEDIUM")}`}>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-sub">
                      {relationshipLabel(rel.relationship_type)}
                    </p>
                    {rel.evidence ? (
                      <p className="mt-0.5 font-mono text-xs text-dim truncate">
                        {rel.evidence}
                      </p>
                    ) : null}
                    {rel.similarity_score != null ? (
                      <p className="mt-0.5 text-2xs text-dim">
                        Similarity score: {(rel.similarity_score * 100).toFixed(0)}%
                        <span className="ml-1.5 text-dim/60">(approximate)</span>
                      </p>
                    ) : null}
                  </div>
                  <Link
                    to={`/investigations/${relatedId}`}
                    className="flex shrink-0 items-center gap-1.5 text-xs font-medium
                               text-accent hover:text-accent/80 transition-colors"
                    aria-label={`Open related advertisement ${relatedId.slice(0, 8)}`}
                  >
                    Open <ExternalLink size={11} aria-hidden="true" />
                  </Link>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* ── Analyst notes ─────────────────────────────────────────────── */}
      <section
        className="rounded border border-line bg-panel p-5 animate-fade-in-d4"
        aria-labelledby="notes-heading"
      >
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare size={13} className="text-dim" aria-hidden="true" />
          <h2 id="notes-heading" className="text-sm font-semibold text-paper">
            Analyst notes
          </h2>
          <span className="text-2xs text-sub ml-1">({data.notes.length})</span>
        </div>

        {data.notes.length > 0 ? (
          <div className="mb-4 space-y-2">
            {data.notes.map((n) => (
              <div
                key={n.id}
                className="rounded border border-line-subtle bg-bg px-4 py-3"
              >
                <p className="text-sm leading-relaxed text-paper/80">{n.content}</p>
                <p className="mt-1.5 text-2xs text-dim">{formatDate(n.created_at)}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mb-3 text-xs text-sub">No analyst notes yet.</p>
        )}

        <form onSubmit={submitNote} className="flex gap-2" aria-label="Add analyst note">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add an observation or verification step…"
            aria-label="Note content"
            className="flex-1 rounded border border-line bg-bg px-4 py-2.5
                       text-sm text-paper placeholder:text-dim outline-none
                       focus:border-accent focus:ring-1 focus:ring-accent/25 transition-colors"
          />
          <button
            type="submit"
            disabled={noteBusy || !note.trim()}
            className="flex items-center gap-1.5 rounded bg-accent px-4 py-2.5
                       text-sm font-semibold text-bg
                       hover:bg-accent/90 transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Submit note"
          >
            <Send size={13} aria-hidden="true" />
          </button>
        </form>
      </section>
    </div>
  );
}

import { FormEvent, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, ArrowRight, X, Info, AlertTriangle } from "lucide-react";
import { EntityPanel } from "../components/EntityPanel";
import { ErrorBanner } from "../components/ErrorBanner";
import { PageHeader } from "../components/PageHeader";
import { ProcessingOverlay } from "../components/ProcessingOverlay";
import { RiskScore } from "../components/RiskGauge";
import { SignalCard } from "../components/SignalCard";
import { useToast } from "../components/Toast";
import { api } from "../services/api";
import { ApiError, type AdvertisementDetail } from "../types/api";

const SOURCE_CHANNELS = [
  { value: "",             label: "Select source channel…" },
  { value: "social",       label: "Social media" },
  { value: "messaging",    label: "Messaging app" },
  { value: "website",      label: "Website / landing page" },
  { value: "sms",          label: "SMS / text message" },
  { value: "email",        label: "Email" },
  { value: "print_scan",   label: "Print scan / photograph" },
  { value: "other",        label: "Other" },
];

export function AnalyzePage() {
  const toast     = useToast();
  const navigate  = useNavigate();
  const resultRef = useRef<HTMLDivElement>(null);

  const [text,      setText]      = useState("");
  const [source,    setSource]    = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [file,      setFile]      = useState<File | null>(null);
  const [busy,      setBusy]      = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [result,    setResult]    = useState<AdvertisementDetail | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!text.trim() && !file) {
      setError("Provide advertisement text or an image file.");
      return;
    }
    if (file && file.size > 5 * 1024 * 1024) {
      setError("Image must be 5 MB or smaller.");
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);

    const form = new FormData();
    form.set("text", text);
    form.set("source", source);
    form.set("source_url", sourceUrl);
    if (file) form.set("image", file);

    try {
      const analysis = await api.analyze(form);
      setResult(analysis);
      toast("Analysis completed and stored.");
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Analysis failed. Check connection and retry.";
      setError(message);
      toast(message, "err");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader
        title="Analyze Advertisement"
        description="Submit advertisement content for rule-based risk assessment. URLs are recorded as text only — they are never fetched."
      />

      {/* ── Submission form ──────────────────────────────────────────────── */}
      <form
        onSubmit={onSubmit}
        aria-label="Advertisement analysis form"
        className="space-y-4 rounded border border-line bg-panel p-5 animate-fade-in"
      >
        {/* Text input */}
        <div>
          <label htmlFor="ad-text" className="block text-sm font-medium text-paper mb-1.5">
            Advertisement text
            <span className="ml-1.5 text-xs font-normal text-sub">(required if no image)</span>
          </label>
          <textarea
            id="ad-text"
            className="h-36 w-full rounded border border-line bg-bg px-4 py-3
                       text-sm text-paper placeholder:text-dim outline-none font-mono
                       resize-y transition-colors
                       focus:border-accent focus:ring-1 focus:ring-accent/25"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste advertisement copy — include claimed returns, contact numbers, payment handles, and URLs."
            aria-required="false"
            aria-describedby="ad-text-hint"
          />
          <p id="ad-text-hint" className="mt-1 text-2xs text-dim">
            Include the full text of the advertisement as it appears. Do not paraphrase.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Source channel */}
          <div>
            <label htmlFor="source-channel" className="block text-sm font-medium text-paper mb-1.5">
              Source channel
            </label>
            <select
              id="source-channel"
              className="w-full rounded border border-line bg-bg px-3 py-2.5
                         text-sm text-paper outline-none
                         focus:border-accent focus:ring-1 focus:ring-accent/25
                         transition-colors"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              {SOURCE_CHANNELS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-panel">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Reference URL */}
          <div>
            <label htmlFor="source-url" className="block text-sm font-medium text-paper mb-1.5">
              Reference URL
              <span className="ml-1.5 text-xs font-normal text-sub">(optional — not fetched)</span>
            </label>
            <input
              id="source-url"
              type="text"
              className="w-full rounded border border-line bg-bg px-3 py-2.5
                         text-sm text-paper placeholder:text-dim outline-none
                         focus:border-accent focus:ring-1 focus:ring-accent/25
                         transition-colors"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://example.com/ad"
              aria-describedby="url-hint"
            />
            <p id="url-hint" className="mt-1 text-2xs text-dim">
              For record purposes only. The URL is never retrieved.
            </p>
          </div>
        </div>

        {/* Image upload */}
        <div>
          <p className="block text-sm font-medium text-paper mb-1.5">
            Advertisement image
            <span className="ml-1.5 text-xs font-normal text-sub">(optional, PNG / JPEG / WebP, max 5 MB)</span>
          </p>
          {file ? (
            <div className="flex items-center gap-3 rounded border border-line bg-surface px-3 py-2">
              <Upload size={13} className="text-sub shrink-0" aria-hidden="true" />
              <span className="flex-1 truncate text-sm text-paper">{file.name}</span>
              <span className="text-xs text-dim shrink-0">
                {(file.size / 1024).toFixed(0)} KB
              </span>
              <button
                type="button"
                onClick={() => setFile(null)}
                className="text-dim hover:text-paper transition-colors"
                aria-label="Remove selected image"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <label
              className="flex cursor-pointer items-center gap-2.5 rounded border border-dashed
                         border-line bg-bg px-4 py-3 text-sm text-sub
                         hover:border-accent/40 hover:text-paper transition-colors"
            >
              <Upload size={14} aria-hidden="true" />
              Choose image file
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                aria-label="Upload advertisement image"
              />
            </label>
          )}
          <p className="mt-1 text-2xs text-dim flex items-center gap-1">
            <Info size={10} className="shrink-0" aria-hidden="true" />
            OCR is applied only if a local OCR engine is configured on the server.
          </p>
        </div>

        {error ? <ErrorBanner message={error} /> : null}

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={busy}
            className="flex items-center gap-2 rounded bg-accent px-5 py-2.5
                       text-sm font-semibold text-bg
                       hover:bg-accent/90 transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
            aria-busy={busy}
          >
            {busy ? "Analyzing…" : "Run analysis"}
          </button>
          {result && !busy ? (
            <span className="text-xs text-ok">
              ✓ Analysis complete
            </span>
          ) : null}
        </div>
      </form>

      {/* Processing indicator */}
      {busy ? <ProcessingOverlay /> : null}

      {/* ── Results ──────────────────────────────────────────────────────── */}
      {result ? (
        <div ref={resultRef} className="space-y-4 animate-fade-in" aria-label="Analysis results">

          {/* Caveat banner */}
          <div className="flex items-start gap-2.5 rounded border border-warn/25 bg-warn/[0.05] px-4 py-3">
            <AlertTriangle size={14} className="mt-px shrink-0 text-warn" aria-hidden="true" />
            <p className="text-xs leading-relaxed text-paper/70">
              The score below is a configured rules-based triage signal. A high score
              indicates risk indicators warranting review — it does not establish that any
              crime has been committed.
            </p>
          </div>

          {/* Score + Recommendation */}
          <div className="grid gap-4 md:grid-cols-[260px,1fr]">
            <RiskScore score={result.risk_score} category={result.risk_category} />
            {result.recommendation ? (
              <div className="rounded border border-line bg-panel p-4">
                <p className="text-2xs font-semibold uppercase tracking-[0.1em] text-sub mb-2">
                  Investigative guidance
                </p>
                <p className="text-sm leading-relaxed text-paper/80">
                  {result.recommendation}
                </p>
              </div>
            ) : null}
          </div>

          {/* Indicators + Entities */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Risk indicators */}
            <section aria-labelledby="signals-heading">
              <div className="flex items-baseline justify-between mb-3">
                <h2 id="signals-heading" className="text-sm font-semibold text-paper">
                  Risk indicators
                </h2>
                <span className="text-2xs text-sub">{result.signals.length} detected</span>
              </div>
              {result.signals.length === 0 ? (
                <div className="rounded border border-line bg-panel px-4 py-6 text-center">
                  <p className="text-sm text-sub">No elevated rule-based indicators detected.</p>
                  <p className="text-xs text-dim mt-1">
                    Absence of indicators does not confirm the advertisement is legitimate.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {result.signals.map((signal) => (
                    <SignalCard key={signal.id} signal={signal} />
                  ))}
                </div>
              )}
            </section>

            {/* Extracted entities */}
            <section aria-labelledby="entities-heading">
              <div className="flex items-baseline justify-between mb-3">
                <h2 id="entities-heading" className="text-sm font-semibold text-paper">
                  Extracted entities
                </h2>
                <span className="text-2xs text-sub">
                  {result.entities.length} found
                </span>
              </div>
              <div className="rounded border border-line bg-panel px-4 py-3">
                <EntityPanel entities={result.entities} />
              </div>
            </section>
          </div>

          {/* Navigate to full investigation */}
          <div className="flex items-center justify-between rounded border border-line bg-panel px-4 py-3">
            <div>
              <p className="text-sm font-medium text-paper">Investigation record created</p>
              <p className="text-xs text-sub mt-0.5">
                This analysis has been stored. Open the full record to review related advertisements.
              </p>
            </div>
            <button
              type="button"
              className="flex shrink-0 items-center gap-2 rounded border border-accent/30
                         bg-accent/[0.07] px-4 py-2 text-sm font-medium text-accent
                         hover:bg-accent/[0.14] transition-colors"
              onClick={() => navigate(`/investigations/${result.id}`)}
            >
              Open investigation
              <ArrowRight size={14} aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Bot,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Info,
  KeyRound,
  Layers,
  Lightbulb,
  Loader2,
  Send,
  Shield,
  Sparkles,
  Trash2,
  User,
  X,
} from "lucide-react";
import { api } from "../services/api";
import type {
  AdvertisementDetail,
  AdvertisementSummary,
  CopilotMessage,
  CopilotStatus,
} from "../types/api";
import { ErrorBanner } from "../components/ErrorBanner";
import { riskClass } from "../lib/format";

const SUGGESTED_QUESTIONS = [
  "Why did this advertisement receive its risk score?",
  "Which extracted claims triggered risk indicators?",
  "Explain the detected anomalies and campaign linkages.",
  "What evidence should an investigator collect or verify next?",
  "Draft a concise investigation summary for case documentation.",
  "Does this copy use high-pressure urgency or advance fee solicitation?",
];

export function CopilotPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlAdId = searchParams.get("adId");

  const [copilotStatus, setCopilotStatus] = useState<CopilotStatus | null>(null);
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active advertisement context
  const [selectedAdId, setSelectedAdId] = useState<string | null>(urlAdId);
  const [adDetail, setAdDetail] = useState<AdvertisementDetail | null>(null);
  const [recentAds, setRecentAds] = useState<AdvertisementSummary[]>([]);
  const [showAdPicker, setShowAdPicker] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Load status & initial ad context ──────────────────────────────────
  useEffect(() => {
    api.copilotStatus().then(setCopilotStatus).catch(() => {});
    api.ads({ page: 1, page_size: 10 }).then((res) => setRecentAds(res.items)).catch(() => {});
  }, []);

  useEffect(() => {
    if (urlAdId) {
      setSelectedAdId(urlAdId);
    }
  }, [urlAdId]);

  useEffect(() => {
    if (selectedAdId) {
      api.ad(selectedAdId)
        .then((detail) => {
          setAdDetail(detail);
          setError(null);
        })
        .catch(() => {
          setAdDetail(null);
        });
    } else {
      setAdDetail(null);
    }
  }, [selectedAdId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ── Send message ──────────────────────────────────────────────────────
  async function handleSend(textToSend?: string) {
    const queryText = (textToSend ?? input).trim();
    if (!queryText || loading) return;

    const userMessage: CopilotMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: queryText,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setError(null);

    // Build bounded history
    const history = messages.slice(-6).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const response = await api.copilotMessage(
        queryText,
        selectedAdId,
        null,
        history
      );

      if (response.error) {
        setError(response.error);
        const errorMessage: CopilotMessage = {
          id: `bot-${Date.now()}`,
          role: "assistant",
          content: `⚠️ ${response.error}`,
          timestamp: new Date().toLocaleTimeString(),
          error: response.error,
        };
        setMessages((prev) => [...prev, errorMessage]);
      } else {
        const botMessage: CopilotMessage = {
          id: `bot-${Date.now()}`,
          role: "assistant",
          content: response.answer,
          timestamp: new Date().toLocaleTimeString(),
          evidence_references: response.evidence_references,
          model_used: response.model_used,
        };
        setMessages((prev) => [...prev, botMessage]);
      }
    } catch (err: any) {
      const errorText = err?.message || "Failed to communicate with AI Copilot.";
      setError(errorText);
      const errorMessage: CopilotMessage = {
        id: `bot-${Date.now()}`,
        role: "assistant",
        content: `Error: ${errorText}`,
        timestamp: new Date().toLocaleTimeString(),
        error: errorText,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function clearChat() {
    setMessages([]);
    setError(null);
  }

  function handleSelectAd(adId: string) {
    setSelectedAdId(adId);
    setSearchParams(adId ? { adId } : {});
    setShowAdPicker(false);
  }

  function handleRemoveContext() {
    setSelectedAdId(null);
    setAdDetail(null);
    setSearchParams({});
  }

  return (
    <div className="space-y-4 max-w-5xl mx-auto flex flex-col h-[calc(100vh-6.5rem)]">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center justify-between border-b border-line pb-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded border border-accent/40 bg-accent/10 text-accent">
              <Sparkles size={15} />
            </div>
            <h1 className="text-lg font-semibold text-paper">AI Investigation Copilot</h1>
            {copilotStatus && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-3xs font-medium font-mono ${
                  copilotStatus.is_configured
                    ? "bg-ok/10 text-ok border border-ok/30"
                    : "bg-warn/10 text-warn border border-warn/30"
                }`}
              >
                {copilotStatus.is_configured ? (
                  <>
                    <CheckCircle2 size={10} /> {copilotStatus.model}
                  </>
                ) : (
                  <>
                    <KeyRound size={10} /> Key Unconfigured
                  </>
                )}
              </span>
            )}
          </div>
          <p className="text-2xs text-sub mt-0.5">
            Evidence-grounded assistant for risk triage, anomaly analysis, and investigation reports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={clearChat}
              className="flex items-center gap-1 rounded border border-line bg-surface px-2.5 py-1 text-2xs text-sub hover:text-paper transition-colors"
            >
              <Trash2 size={12} /> Clear Chat
            </button>
          )}
        </div>
      </div>

      {/* ── Context & Status Bar ────────────────────────────────────── */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 rounded border border-line bg-panel p-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-2xs font-semibold uppercase tracking-wider text-dim shrink-0">
            Grounded Context:
          </span>
          {adDetail ? (
            <div className="flex items-center gap-2 min-w-0">
              <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-3xs font-semibold ${riskClass(adDetail.risk_category)}`}>
                <Shield size={10} /> {adDetail.risk_score} {adDetail.risk_category}
              </span>
              <span className="text-2xs text-paper font-medium truncate max-w-xs" title={adDetail.text}>
                {adDetail.text ? adDetail.text.slice(0, 45) + "…" : "Ad Record " + adDetail.id.slice(0, 8)}
              </span>
              <Link
                to={`/investigations/${adDetail.id}`}
                target="_blank"
                className="text-2xs text-accent hover:underline flex items-center gap-0.5 shrink-0"
              >
                <ExternalLink size={10} /> View Record
              </Link>
              <button
                type="button"
                onClick={handleRemoveContext}
                title="Remove advertisement context"
                className="text-dim hover:text-danger transition-colors p-0.5"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <span className="text-2xs text-sub italic">
              General FIN-SHIELD compliance and fraud analysis (no specific ad attached)
            </span>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowAdPicker(!showAdPicker)}
            className="flex items-center gap-1 rounded border border-line bg-surface px-2.5 py-1 text-2xs font-medium text-paper hover:bg-surface/80 transition-colors"
          >
            <Layers size={11} className="text-accent" />
            {adDetail ? "Switch Advertisement" : "Select Advertisement"}
          </button>

          {/* Ad Picker Dropdown */}
          {showAdPicker && (
            <div className="absolute right-0 top-full mt-1 w-80 rounded border border-line bg-surface shadow-xl z-30 p-2 space-y-1">
              <p className="text-3xs font-semibold uppercase tracking-wider text-dim px-2 py-1">
                Recent Advertisements
              </p>
              <div className="max-h-56 overflow-y-auto space-y-1">
                {recentAds.map((ad) => (
                  <button
                    key={ad.id}
                    type="button"
                    onClick={() => handleSelectAd(ad.id)}
                    className={`w-full text-left rounded p-2 text-2xs flex items-center justify-between gap-2 hover:bg-panel transition-colors ${
                      selectedAdId === ad.id ? "bg-accent/10 border border-accent/30" : ""
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-paper font-medium truncate">{ad.text || "Untitled Ad"}</p>
                      <p className="text-3xs text-dim">{new Date(ad.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-3xs font-bold ${riskClass(ad.risk_category)}`}>
                      {ad.risk_score}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Key Unconfigured Banner ─────────────────────────────────── */}
      {copilotStatus && !copilotStatus.is_configured && (
        <div className="shrink-0 rounded border border-warn/40 bg-warn/[0.08] p-3 text-2xs text-sub space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-warn">
            <KeyRound size={13} />
            <span>GEMINI_API_KEY is not configured in backend environment</span>
          </div>
          <p className="text-dim leading-relaxed">
            To enable the AI Copilot, add your Google Gemini API key to <code className="font-mono bg-bg px-1 py-0.5 rounded text-paper">backend/.env</code>:
            <br />
            <code className="font-mono text-accent">GEMINI_API_KEY=your_key_here</code>
          </p>
        </div>
      )}

      {error && <ErrorBanner message={error} />}

      {/* ── Messages Feed ───────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto rounded border border-line bg-panel p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="h-12 w-12 rounded-full border border-accent/40 bg-accent/10 flex items-center justify-center text-accent">
              <Sparkles size={24} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-paper">FIN-SHIELD Investigation Copilot</h2>
              <p className="text-2xs text-sub mt-1 max-w-md mx-auto leading-relaxed">
                Ask questions about risk indicators, verified contact details, detected anomalies, or request an evidence-grounded case summary.
              </p>
            </div>

            {/* Suggested Prompts */}
            <div className="w-full max-w-xl space-y-1.5 text-left pt-2">
              <p className="text-3xs font-semibold uppercase tracking-wider text-dim flex items-center gap-1">
                <Lightbulb size={11} className="text-accent" /> Suggested Questions
              </p>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {SUGGESTED_QUESTIONS.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(q)}
                    className="rounded border border-line bg-surface p-2 text-2xs text-sub hover:text-paper hover:border-accent/40 hover:bg-surface/80 transition-all text-left flex items-start gap-1.5"
                  >
                    <ChevronRight size={12} className="text-accent shrink-0 mt-0.5" />
                    <span>{q}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-accent/40 bg-accent/10 text-accent">
                  <Bot size={14} />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded p-3.5 space-y-2 text-xs leading-relaxed ${
                  msg.role === "user"
                    ? "bg-accent text-white font-medium"
                    : "bg-surface border border-line text-paper"
                }`}
              >
                {/* Message Header */}
                <div className="flex items-center justify-between gap-2 text-3xs opacity-75 border-b border-white/10 pb-1 mb-1">
                  <span className="font-semibold uppercase tracking-wider">
                    {msg.role === "user" ? "Investigator" : "Copilot"}
                  </span>
                  <span>{msg.timestamp}</span>
                </div>

                {/* Message Content */}
                <div className="whitespace-pre-wrap font-sans space-y-1">
                  {msg.content}
                </div>

                {/* Evidence References */}
                {msg.evidence_references && msg.evidence_references.length > 0 && (
                  <div className="pt-2 border-t border-line/60 space-y-1">
                    <span className="text-3xs font-semibold uppercase tracking-wider text-dim flex items-center gap-1">
                      <Info size={10} /> Verified Grounded Evidence
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {msg.evidence_references.map((ref, idx) => (
                        <span
                          key={idx}
                          className="rounded bg-panel border border-line px-1.5 py-0.5 text-3xs font-mono text-sub"
                        >
                          {ref.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {msg.role === "user" && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-line bg-surface text-sub">
                  <User size={14} />
                </div>
              )}
            </div>
          ))
        )}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-accent/40 bg-accent/10 text-accent animate-pulse">
              <Bot size={14} />
            </div>
            <div className="rounded border border-line bg-surface px-4 py-3 text-xs text-sub flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-accent" />
              <span>Copilot is reviewing verified records and generating response…</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input Bar ───────────────────────────────────────────────── */}
      <div className="shrink-0 rounded border border-line bg-panel p-3 space-y-2">
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              selectedAdId
                ? "Ask anything about this advertisement's risk score, entities, or anomalies…"
                : "Ask about financial fraud patterns, regulatory guidance, or select an advertisement above…"
            }
            rows={2}
            className="flex-1 rounded border border-line bg-surface p-2.5 text-xs text-paper
                       placeholder:text-dim focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 resize-none"
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="flex items-center justify-center h-10 w-10 rounded bg-accent text-white
                       hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
            title="Send Message"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>

        <div className="flex items-center justify-between text-3xs text-dim">
          <span>Press <strong>Enter</strong> to send, <strong>Shift+Enter</strong> for newline</span>
          <span>Grounded strictly on FIN-SHIELD investigation records</span>
        </div>
      </div>
    </div>
  );
}

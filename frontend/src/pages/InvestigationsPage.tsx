import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ChevronLeft, ChevronRight, Search, X, FolderSearch
} from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { ErrorBanner } from "../components/ErrorBanner";
import { PageHeader } from "../components/PageHeader";
import { Skeleton } from "../components/Skeleton";
import { StatusBadge } from "../components/StatusBadge";
import { useAsync } from "../hooks/useAsync";
import { formatDateShort, riskBg, riskColor } from "../lib/format";
import { api } from "../services/api";

const RISK_OPTIONS = ["", "LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
const PAGE_SIZE = 15;

export function InvestigationsPage() {
  const [params, setParams] = useSearchParams();
  const q    = params.get("q")    ?? "";
  const risk = params.get("risk") ?? "";
  const page = Number(params.get("page") ?? "1");
  const [search, setSearch] = useState(q);

  // Debounced search → URL sync
  useEffect(() => {
    const id = setTimeout(() => {
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        if (search) next.set("q", search); else next.delete("q");
        next.set("page", "1");
        return next;
      });
    }, 350);
    return () => clearTimeout(id);
  }, [search, setParams]);

  const { data, error, loading, reload } = useAsync(
    () => api.ads({ q, risk, page, page_size: PAGE_SIZE }),
    [q, risk, page]
  );

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  function setParam(key: string, value: string) {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value); else next.delete(key);
      next.set("page", "1");
      return next;
    });
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Investigations"
        description="Browse and filter analyzed advertisements. Each row links to a full investigation record."
      />

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 animate-fade-in">
        {/* Search */}
        <div className="relative min-w-[200px] flex-1 max-w-xs">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-dim"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ad text, entities…"
            aria-label="Search investigations"
            className="w-full rounded border border-line bg-panel py-2 pl-8 pr-8
                       text-sm text-paper placeholder:text-dim outline-none
                       focus:border-accent focus:ring-1 focus:ring-accent/25 transition-colors"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-dim hover:text-sub transition-colors"
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          ) : null}
        </div>

        {/* Risk filter pills */}
        <div className="flex items-center gap-1.5" role="group" aria-label="Filter by risk level">
          {RISK_OPTIONS.map((opt) => {
            const isActive = risk === opt;
            const color = opt ? riskColor(opt) : undefined;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setParam("risk", opt)}
                aria-pressed={isActive}
                className={`rounded border px-3 py-1.5 text-xs font-medium transition-all ${
                  isActive
                    ? "border-accent/30 bg-accent/[0.08] text-accent"
                    : "border-line text-sub hover:bg-surface hover:text-paper"
                }`}
                style={isActive && color ? { borderColor: `${color}40`, backgroundColor: `${color}0D`, color } : {}}
              >
                {opt || "All"}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Table / states ───────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-1.5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-11" />
          ))}
        </div>
      ) : error ? (
        <ErrorBanner message={error} onRetry={reload} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          title="No investigations match current filters"
          body="Try adjusting your search query or risk filter. Investigations are created when advertisements are submitted for analysis."
          icon={<FolderSearch size={20} />}
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded border border-line animate-fade-in">
            <table className="w-full text-sm" aria-label="Investigations table">
              <thead>
                <tr className="border-b border-line bg-panel">
                  {[
                    ["Advertisement", ""],
                    ["Score", "w-20 text-right"],
                    ["Risk", "w-28"],
                    ["Entities", "w-16 text-right"],
                    ["Related", "w-16 text-right"],
                    ["Analyzed", "w-40"],
                  ].map(([label, cls]) => (
                    <th
                      key={label}
                      className={`px-4 py-2.5 text-left text-2xs font-semibold uppercase tracking-[0.07em] text-sub ${cls}`}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.items.map((ad) => (
                  <tr
                    key={ad.id}
                    className={`group border-t border-line/60 transition-colors
                                hover:bg-surface border-l-2 ${riskBg(ad.risk_category)}`}
                  >
                    <td className="px-4 py-2.5 max-w-xs">
                      <Link
                        to={`/investigations/${ad.id}`}
                        className="line-clamp-1 text-paper/90 group-hover:text-accent transition-colors"
                        aria-label={`Open investigation: ${ad.text.slice(0, 80)}`}
                      >
                        {ad.text}
                      </Link>
                      {ad.is_seed ? (
                        <span className="ml-2 rounded bg-surface border border-line/60 px-1.5 py-0.5 text-2xs text-dim">
                          synthetic
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-sm font-semibold tabular text-paper/80">
                      {ad.risk_score}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge value={ad.risk_category} />
                    </td>
                    <td className="px-4 py-2.5 text-right text-sm tabular text-sub">
                      {ad.entity_count}
                    </td>
                    <td className="px-4 py-2.5 text-right text-sm tabular text-sub">
                      {ad.related_count}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-dim whitespace-nowrap">
                      {formatDateShort(ad.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 ? (
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-sub">
                Page {data.page} of {totalPages}
                <span className="text-dim"> · {data.total.toLocaleString()} total</span>
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setParam("page", String(page - 1))}
                  className="flex items-center gap-1 rounded border border-line px-3 py-1.5
                             text-xs text-sub hover:bg-surface hover:text-paper
                             transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={12} /> Prev
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setParam("page", String(page + 1))}
                  className="flex items-center gap-1 rounded border border-line px-3 py-1.5
                             text-xs text-sub hover:bg-surface hover:text-paper
                             transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Next page"
                >
                  Next <ChevronRight size={12} />
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

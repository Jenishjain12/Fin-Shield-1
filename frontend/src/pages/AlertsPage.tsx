import { useState } from "react";
import { CheckCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { ErrorBanner } from "../components/ErrorBanner";
import { PageHeader } from "../components/PageHeader";
import { Skeleton } from "../components/Skeleton";
import { StatusBadge } from "../components/StatusBadge";
import { useToast } from "../components/Toast";
import { useAsync } from "../hooks/useAsync";
import { formatDateShort, riskBg } from "../lib/format";
import { api } from "../services/api";

export function AlertsPage() {
  const toast = useToast();
  const { data, error, loading, reload, setData } = useAsync(
    () => api.alerts(),
    []
  );
  const [filter, setFilter] = useState<"all" | "unread">("all");

  async function markRead(id: string) {
    if (!data) return;
    try {
      const updated = await api.markAlert(id, true);
      setData(data.map((a) => (a.id === id ? updated : a)));
    } catch {
      toast("Failed to update alert.", "err");
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-7 w-32" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }
  if (error) return <ErrorBanner message={error} onRetry={reload} />;
  if (!data) return null;

  const unreadCount = data.filter((a) => !a.is_read).length;
  const filtered    = filter === "unread" ? data.filter((a) => !a.is_read) : data;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title="Alerts"
        description="Rule-based alert notifications. Duplicate suppression is applied using idempotency keys."
        badge={
          unreadCount > 0 ? (
            <span
              className="rounded border border-danger/30 bg-danger/[0.08] px-2 py-0.5
                         text-2xs font-semibold text-danger"
              aria-label={`${unreadCount} unread alerts`}
            >
              {unreadCount} unread
            </span>
          ) : null
        }
      />

      {/* ── Filter tabs ──────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-0 rounded border border-line overflow-hidden w-fit animate-fade-in"
        role="tablist"
        aria-label="Alert filter"
      >
        {(["all", "unread"] as const).map((opt) => (
          <button
            key={opt}
            role="tab"
            type="button"
            aria-selected={filter === opt}
            onClick={() => setFilter(opt)}
            className={`px-4 py-2 text-xs font-medium transition-colors border-r border-line last:border-0 ${
              filter === opt
                ? "bg-surface text-paper"
                : "bg-panel text-sub hover:text-paper"
            }`}
          >
            {opt === "all"
              ? `All (${data.length})`
              : `Unread (${unreadCount})`}
          </button>
        ))}
      </div>

      {/* ── Alert list ───────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <EmptyState
          title={filter === "unread" ? "All alerts marked as read" : "No alerts generated"}
          body={
            filter === "unread"
              ? 'Switch to “All” to see the full history.'
              : "Alerts are generated when the analysis engine detects high-risk or anomalous content."
          }
          icon={<CheckCheck size={20} />}
        />
      ) : (
        <div className="space-y-2 stagger-children" role="list" aria-label="Alert list">
          {filtered.map((alert) => (
            <article
              key={alert.id}
              role="listitem"
              className={`rounded border border-line bg-panel overflow-hidden
                          transition-colors hover:bg-surface border-l-2 ${riskBg(alert.severity)}`}
              aria-label={`${alert.severity} alert: ${alert.alert_type.replaceAll("_", " ")}`}
            >
              <div className="px-4 py-3.5">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge value={alert.severity} />
                    <span className="text-sm font-medium text-paper">
                      {alert.alert_type.replaceAll("_", " ")}
                    </span>
                    {!alert.is_read ? (
                      <span
                        className="inline-block h-1.5 w-1.5 rounded-full bg-accent animate-pulse_subtle"
                        aria-label="Unread"
                        title="Unread"
                      />
                    ) : null}
                  </div>
                  <span className="shrink-0 text-xs text-dim whitespace-nowrap">
                    {formatDateShort(alert.created_at)}
                  </span>
                </div>

                {/* Reason */}
                <p className="mt-2 text-sm leading-relaxed text-sub">
                  {alert.reason}
                </p>

                {/* Actions */}
                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
                  {alert.advertisement_id ? (
                    <Link
                      to={`/investigations/${alert.advertisement_id}`}
                      className="font-medium text-accent hover:text-accent/80 transition-colors"
                      aria-label="Open related investigation"
                    >
                      Open investigation →
                    </Link>
                  ) : null}
                  {alert.campaign_id ? (
                    <Link
                      to={`/campaigns/${alert.campaign_id}`}
                      className="font-medium text-accent hover:text-accent/80 transition-colors"
                      aria-label="Open related cluster"
                    >
                      Open cluster →
                    </Link>
                  ) : null}
                  {!alert.is_read ? (
                    <button
                      type="button"
                      onClick={() => markRead(alert.id)}
                      className="text-dim hover:text-sub transition-colors ml-auto"
                      aria-label="Mark this alert as read"
                    >
                      Mark as read
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

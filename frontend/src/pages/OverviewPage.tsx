import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  AlertTriangle,
  ShieldAlert,
  GitFork,
  ScanSearch,
} from "lucide-react";
import { ErrorBanner } from "../components/ErrorBanner";
import { PageHeader } from "../components/PageHeader";
import { Skeleton } from "../components/Skeleton";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { useAsync } from "../hooks/useAsync";
import { formatDateShort, riskColor } from "../lib/format";
import { api } from "../services/api";

// Category order and display names for the bar chart
const RISK_ORDER = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
const RISK_LABEL: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Med",
  HIGH: "High",
  CRITICAL: "Crit",
};

export function OverviewPage() {
  const { data, error, loading, reload } = useAsync(() => api.dashboard(), []);

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-7 w-52" />
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-5">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64 lg:col-span-3" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }
  if (error) return <ErrorBanner message={error} onRetry={reload} />;
  if (!data) return null;

  const total = data.total_advertisements;

  // Build chart data in a fixed order
  const chartData = RISK_ORDER.map((cat) => ({
    name: RISK_LABEL[cat],
    value: data.risk_distribution[cat] ?? 0,
    fill: riskColor(cat),
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Intelligence Overview"
        description={
          `Real-time metrics from the local database.` +
          (data.seed_advertisement_count
            ? ` ${data.seed_advertisement_count} records are synthetic demonstration data.`
            : "")
        }
        action={
          <Link
            to="/analyze"
            className="flex items-center gap-2 rounded bg-accent px-4 py-2 text-sm
                       font-semibold text-bg hover:bg-accent/90 transition-colors"
          >
            <ScanSearch size={14} aria-hidden="true" />
            New analysis
          </Link>
        }
      />

      {/* ── KPI cards ─────────────────────────────────────────────────── */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 stagger-children">
        <StatCard
          label="Advertisements analyzed"
          value={data.total_advertisements}
          icon={<BarChart3 size={16} />}
          accentClass="border-l-accent"
        />
        <StatCard
          label="Potentially suspicious"
          value={data.potentially_suspicious}
          icon={<AlertTriangle size={16} />}
          accentClass="border-l-warn"
          subtitle={
            total
              ? `${Math.round((data.potentially_suspicious / total) * 100)}% of total`
              : undefined
          }
        />
        <StatCard
          label="High / critical risk"
          value={data.high_risk}
          icon={<ShieldAlert size={16} />}
          accentClass="border-l-danger"
          subtitle={
            total
              ? `${Math.round((data.high_risk / total) * 100)}% of total`
              : undefined
          }
        />
        <StatCard
          label="Detected relationships"
          value={data.relationship_count}
          icon={<GitFork size={16} />}
          accentClass="border-l-accent"
        />
      </div>

      {/* ── Chart + Clusters ──────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-5 stagger-children">

        {/* Risk distribution bar chart */}
        <section
          className="rounded border border-line bg-panel p-5 lg:col-span-2 animate-fade-in"
          aria-labelledby="dist-heading"
        >
          <h2 id="dist-heading" className="text-sm font-semibold text-paper">
            Risk distribution
          </h2>
          <p className="mt-0.5 text-2xs text-sub">Advertisements by triage category</p>
          <div className="mt-4 h-52" aria-label="Bar chart showing risk distribution">
            {total === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-xs text-dim">No advertisements analyzed yet.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barCategoryGap="30%" margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="var(--chart-grid)" vertical={false} strokeDasharray="0" />
                  <XAxis
                    dataKey="name"
                    stroke="var(--chart-axis)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    fontFamily="Inter, sans-serif"
                  />
                  <YAxis
                    stroke="var(--chart-axis)"
                    fontSize={11}
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    fontFamily="Inter, sans-serif"
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--chart-tooltip-bg)",
                      border: "1px solid var(--chart-tooltip-border)",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontFamily: "Inter, sans-serif",
                      color: "var(--chart-tooltip-color)",
                    }}
                    cursor={{ fill: "rgba(128,128,128,0.06)" }}
                    formatter={(value: number) => [value, "Advertisements"]}
                  />
                  <Bar dataKey="value" radius={[3, 3, 0, 0]} maxBarSize={56}>
                    {chartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* Cluster activity */}
        <section
          className="rounded border border-line bg-panel p-5 lg:col-span-3 animate-fade-in"
          aria-labelledby="clusters-heading"
        >
          <h2 id="clusters-heading" className="text-sm font-semibold text-paper">
            Potentially coordinated clusters
          </h2>
          <p className="mt-0.5 text-2xs text-sub mb-4">
            Clusters are derived from observed shared identifiers, not confirmed associations.
          </p>
          {data.campaign_activity.length === 0 ? (
            <div className="flex h-32 items-center justify-center">
              <p className="text-xs text-dim">
                No relationship clusters detected yet.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-line/60">
              {data.campaign_activity.map((c, i) => {
                const cat = c.max_risk_score >= 75 ? "CRITICAL"
                  : c.max_risk_score >= 50 ? "HIGH"
                  : c.max_risk_score >= 25 ? "MEDIUM"
                  : "LOW";
                return (
                  <Link
                    key={c.id}
                    to={`/campaigns/${c.id}`}
                    className="flex items-center justify-between gap-3 py-3 -mx-1 px-1
                               rounded transition-colors hover:bg-surface group"
                    aria-label={`Cluster ${i + 1}: ${c.member_count} advertisements, max score ${c.max_risk_score}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-paper group-hover:text-accent transition-colors">
                        {c.label}
                      </p>
                      <p className="text-2xs text-sub mt-0.5">
                        {c.member_count} advertisement{c.member_count !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className="font-mono text-xs font-semibold"
                        style={{ color: riskColor(cat) }}
                        aria-label={`Max score: ${c.max_risk_score}`}
                      >
                        {c.max_risk_score}
                      </span>
                      <StatusBadge value={cat} />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>


      {/* ── Recent activity ───────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Recent analyses */}
        <section
          className="rounded border border-line bg-panel p-5 animate-fade-in"
          aria-labelledby="recent-heading"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 id="recent-heading" className="text-sm font-semibold text-paper">
              Recent analyses
            </h2>
            <Link
              to="/investigations"
              className="text-2xs text-accent hover:text-accent/80 transition-colors"
            >
              View all →
            </Link>
          </div>
          <div className="divide-y divide-line/60">
            {data.recent_advertisements.length === 0 ? (
              <p className="py-4 text-xs text-dim">No analyses yet.</p>
            ) : (
              data.recent_advertisements.map((ad) => (
                <Link
                  key={ad.id}
                  to={`/investigations/${ad.id}`}
                  className="flex items-center justify-between gap-3 py-2.5 -mx-1 px-1
                             rounded transition-colors hover:bg-surface group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm text-paper/85 group-hover:text-paper transition-colors">
                      {ad.text}
                    </p>
                    <p className="mt-0.5 text-2xs text-dim">
                      {formatDateShort(ad.created_at)}
                      {ad.is_seed ? " · synthetic" : ""}
                    </p>
                  </div>
                  <StatusBadge value={ad.risk_category} />
                </Link>
              ))
            )}
          </div>
        </section>

        {/* Recent alerts */}
        <section
          className="rounded border border-line bg-panel p-5 animate-fade-in"
          aria-labelledby="alerts-heading"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 id="alerts-heading" className="text-sm font-semibold text-paper">
              Recent alerts
            </h2>
            <Link
              to="/alerts"
              className="text-2xs text-accent hover:text-accent/80 transition-colors"
            >
              View all →
            </Link>
          </div>
          <div className="divide-y divide-line/60">
            {data.recent_alerts.length === 0 ? (
              <p className="py-4 text-xs text-dim">No rule alerts yet.</p>
            ) : (
              data.recent_alerts.map((alert) => (
                <Link
                  key={alert.id}
                  to={
                    alert.advertisement_id
                      ? `/investigations/${alert.advertisement_id}`
                      : "/alerts"
                  }
                  className="flex items-center justify-between gap-3 py-2.5 -mx-1 px-1
                             rounded transition-colors hover:bg-surface group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-paper/85 group-hover:text-paper transition-colors">
                      {alert.alert_type.replaceAll("_", " ")}
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-2xs text-dim">
                      {alert.reason}
                    </p>
                  </div>
                  <StatusBadge value={alert.severity} />
                </Link>
              ))
            )}
          </div>
        </section>
      </div>

      {/* ── Disclaimer ────────────────────────────────────────────────── */}
      <div className="flex items-start gap-2 pt-2">
        <AlertTriangle size={11} className="mt-px shrink-0 text-dim" aria-hidden="true" />
        <p className="text-2xs leading-relaxed text-dim">
          FIN-SHIELD provides rule-based triage indicators to support investigation.
          Scores and detected relationships are not proof of fraud or criminality.
          All findings require human review and verification before any investigative action.
        </p>
      </div>
    </div>
  );
}

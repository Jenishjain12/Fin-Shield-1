import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeMouseHandler,
  type EdgeMouseHandler,
  MarkerType,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ExternalLink,
  Eye,
  EyeOff,
  GitFork,
  Info,
} from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { ErrorBanner } from "../components/ErrorBanner";
import { PageHeader } from "../components/PageHeader";
import { RiskScore } from "../components/RiskGauge";
import { Skeleton } from "../components/Skeleton";
import { StatusBadge } from "../components/StatusBadge";
import { useAsync } from "../hooks/useAsync";
import { relationshipLabel, riskColor } from "../lib/format";
import { api } from "../services/api";
import { SignalMap } from "../components/SignalMap";
import type {
  AdvertisementSummary,
  CampaignDetail,
  Relationship,
} from "../types/api";

function riskCat(score: number): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  if (score >= 75) return "CRITICAL";
  if (score >= 50) return "HIGH";
  if (score >= 25) return "MEDIUM";
  return "LOW";
}

function buildGraph(
  campaign: CampaignDetail,
  showSimilarity: boolean,
  nodeBg: string,
  nodeText: string
): { nodes: Node[]; edges: Edge[] } {
  const count   = campaign.advertisements.length;
  const cols    = Math.max(1, Math.ceil(Math.sqrt(count)));
  const spacing = 240;

  const nodes: Node[] = campaign.advertisements.map((ad, index) => {
    const row   = Math.floor(index / cols);
    const col   = index % cols;
    const cat   = riskCat(ad.risk_score);
    const color = riskColor(cat);

    return {
      id: ad.id,
      position: { x: col * spacing, y: row * spacing },
      data: { label: `${cat} · ${ad.risk_score}`, ad },
      style: {
        background: nodeBg,
        border: `1.5px solid ${color}50`,
        borderRadius: "6px",
        padding: "8px 12px",
        color: nodeText,
        fontSize: "11px",
        fontFamily: "Inter, sans-serif",
        fontWeight: 500,
        minWidth: "110px",
        textAlign: "center" as const,
      },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    };
  });

  const edges: Edge[]  = [];
  const seen = new Set<string>();

  for (const rel of campaign.relationships) {
    const isSimilarity = rel.relationship_type === "text_similarity";
    if (isSimilarity && !showSimilarity) continue;

    const key = [rel.source_ad_id, rel.target_ad_id].sort().join("|");
    if (seen.has(key)) continue;
    seen.add(key);

    edges.push({
      id: rel.id,
      source: rel.source_ad_id,
      target: rel.target_ad_id,
      type: "default",
      animated: isSimilarity,
      style: {
        stroke: isSimilarity ? "#D4923D" : "#4DB8D4",
        strokeWidth: isSimilarity ? 1 : 1.5,
        opacity: 0.65,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: isSimilarity ? "#D4923D" : "#4DB8D4",
        width: 10,
        height: 10,
      },
      data: { rel },
    });
  }

  return { nodes, edges };
}

type InspectorData =
  | { kind: "node"; ad: AdvertisementSummary }
  | { kind: "edge"; rel: Relationship };

export function CampaignsPage() {
  const { campaignId } = useParams();
  const { theme } = useTheme();
  const { data: campaigns, error, loading, reload } = useAsync(
    () => api.campaigns(),
    []
  );

  const [selectedId,     setSelectedId]     = useState<string | null>(campaignId ?? null);
  const [showSimilarity, setShowSimilarity] = useState(false);
  const [inspector,      setInspector]      = useState<InspectorData | null>(null);

  const { data: detail, loading: detailLoading } = useAsync(
    () => (selectedId ? api.campaign(selectedId) : Promise.resolve(null)),
    [selectedId]
  );

  useEffect(() => {
    if (campaigns?.length && !selectedId) setSelectedId(campaigns[0].id);
  }, [campaigns, selectedId]);

  // Read CSS variable values at render time so graph nodes re-theme on switch
  const nodeBg   = getComputedStyle(document.documentElement).getPropertyValue("--c-panel").trim()  || "#0E1219";
  const nodeText = getComputedStyle(document.documentElement).getPropertyValue("--c-paper").trim()  || "#DFE3EA";
  const rfDot    = getComputedStyle(document.documentElement).getPropertyValue("--rf-dot").trim()   || "#1E2535";

  const { nodes: initNodes, edges: initEdges } = useMemo(() => {
    if (!detail) return { nodes: [], edges: [] };
    return buildGraph(detail, showSimilarity, nodeBg, nodeText);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail, showSimilarity, theme]);  // re-build when theme changes

  const [nodes, setNodes, onNodesChange] = useNodesState(initNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initEdges);

  useEffect(() => {
    setNodes(initNodes);
    setEdges(initEdges);
  }, [initNodes, initEdges, setNodes, setEdges]);

  const onNodeClick: NodeMouseHandler = useCallback((_e, node) => {
    setInspector({ kind: "node", ad: node.data.ad as AdvertisementSummary });
  }, []);

  const onEdgeClick: EdgeMouseHandler = useCallback((_e, edge) => {
    if (edge.data?.rel) setInspector({ kind: "edge", rel: edge.data.rel as Relationship });
  }, []);

  // ── Loading / error ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-7 w-52" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-28" />
          ))}
        </div>
        <Skeleton className="h-[520px]" />
      </div>
    );
  }
  if (error) return <ErrorBanner message={error} onRetry={reload} />;
  if (!campaigns) return null;

  if (campaigns.length === 0) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Campaign Intelligence"
          description="Clusters are derived from stored relationship evidence. No fabricated connections are drawn."
        />
        <EmptyState
          title="No relationship clusters found"
          body="Clusters appear when the system detects shared identifiers or similar text across multiple advertisements. Submit more advertisements to build relationship evidence."
          icon={<GitFork size={20} />}
        />
      </div>
    );
  }

  const selectedCampaign = campaigns.find((c) => c.id === selectedId);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Campaign Intelligence"
        description="Clusters are connected components derived from stored relationship evidence. Edges require observed shared identifiers or text similarity."
      />

      {/* ── Cluster selector ─────────────────────────────────────────── */}
      <div
        className="flex flex-wrap gap-2 animate-fade-in"
        role="tablist"
        aria-label="Select cluster"
      >
        {campaigns.map((c, i) => (
          <button
            key={c.id}
            role="tab"
            type="button"
            aria-selected={selectedId === c.id}
            onClick={() => { setSelectedId(c.id); setInspector(null); }}
            className={`rounded border px-3 py-2 text-xs font-medium transition-all ${
              selectedId === c.id
                ? "border-accent/30 bg-accent/[0.07] text-accent"
                : "border-line text-sub hover:bg-surface hover:text-paper"
            }`}
          >
            Cluster {i + 1}
            <span className="ml-1.5 text-2xs opacity-70">
              {c.member_count} ads · max {c.max_risk_score}
            </span>
          </button>
        ))}
      </div>

      {/* ── Graph + Inspector ─────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-[1fr,280px]">

        {/* Graph panel */}
        <div className="rounded border border-line bg-panel overflow-hidden animate-fade-in">
          {/* Toolbar */}
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <div className="flex items-center gap-4 text-xs text-sub">
              <span className="flex items-center gap-1.5">
                <span className="h-px w-5 bg-accent/70 inline-block" />
                Shared identifier
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-px w-5 bg-warn/70 inline-block border-t border-dashed border-warn/70" style={{ height: 1 }} />
                Text similarity
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowSimilarity((v) => !v)}
              className="flex items-center gap-1.5 rounded border border-line px-2.5 py-1.5
                         text-xs font-medium text-sub hover:bg-surface hover:text-paper
                         transition-colors"
              aria-pressed={showSimilarity}
            >
              {showSimilarity
                ? <><EyeOff size={12} aria-hidden="true" /> Hide similarity</>
                : <><Eye    size={12} aria-hidden="true" /> Show similarity</>
              }
            </button>
          </div>

          {/* Canvas */}
          <div style={{ height: 520 }} aria-label="Relationship graph" role="img">
            {detailLoading ? (
              <div className="flex h-full items-center justify-center">
                <Skeleton className="h-10 w-40" />
              </div>
            ) : (
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={onNodeClick}
                onEdgeClick={onEdgeClick}
                fitView
                fitViewOptions={{ padding: 0.35 }}
                proOptions={{ hideAttribution: true }}
                minZoom={0.25}
                maxZoom={2}
              >
                <Background gap={20} size={1} color={rfDot} />
                <Controls showInteractive={false} />
              </ReactFlow>
            )}
          </div>
        </div>

        {/* Inspector panel */}
        <div
          className="rounded border border-line bg-panel p-4 animate-fade-in-d1"
          aria-label="Evidence inspector"
          aria-live="polite"
        >
          <h3 className="text-sm font-semibold text-paper mb-1">Inspector</h3>
          <p className="text-2xs text-sub mb-4">
            Select a node or edge in the graph.
          </p>

          {!inspector ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Info size={16} className="text-dim" aria-hidden="true" />
              <p className="text-xs text-sub">
                Click a node to inspect an advertisement, or click an edge to
                view relationship evidence.
              </p>
            </div>
          ) : inspector.kind === "node" ? (
            <div className="space-y-4">
              <RiskScore
                score={inspector.ad.risk_score}
                category={inspector.ad.risk_category}
                variant="block"
              />
              <div>
                <p className="text-2xs font-semibold uppercase tracking-[0.08em] text-sub mb-1.5">
                  Advertisement text
                </p>
                <p className="text-xs leading-relaxed text-paper/70 line-clamp-5">
                  {inspector.ad.text}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <StatusBadge value={inspector.ad.risk_category} />
                <span className="text-dim">{inspector.ad.entity_count} entities</span>
              </div>
              <Link
                to={`/investigations/${inspector.ad.id}`}
                className="flex items-center gap-1.5 text-xs font-medium text-accent
                           hover:text-accent/80 transition-colors"
                aria-label="Open full investigation record"
              >
                Open investigation <ExternalLink size={11} aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-2xs font-semibold uppercase tracking-[0.08em] text-sub mb-1">
                  Relationship type
                </p>
                <p className="text-sm text-paper font-medium">
                  {relationshipLabel(inspector.rel.relationship_type)}
                </p>
              </div>
              {inspector.rel.explanation ? (
                <div>
                  <p className="text-2xs font-semibold uppercase tracking-[0.08em] text-sub mb-1">
                    Explanation
                  </p>
                  <p className="text-xs text-paper/70 leading-relaxed">
                    {inspector.rel.explanation}
                  </p>
                </div>
              ) : null}
              {inspector.rel.evidence ? (
                <div>
                  <p className="text-2xs font-semibold uppercase tracking-[0.08em] text-sub mb-1">
                    Shared evidence
                  </p>
                  <p className="font-mono text-xs text-accent/80 bg-bg rounded px-3 py-2 border border-line/60 break-all">
                    {inspector.rel.evidence}
                  </p>
                </div>
              ) : null}
              {inspector.rel.similarity_score != null ? (
                <div>
                  <p className="text-2xs font-semibold uppercase tracking-[0.08em] text-sub mb-1">
                    Similarity
                  </p>
                  <p className="text-sm font-mono text-warn">
                    {(inspector.rel.similarity_score * 100).toFixed(0)}%
                    <span className="ml-1.5 text-2xs font-sans text-dim font-normal">
                      (approximate, not a certainty)
                    </span>
                  </p>
                </div>
              ) : null}
              <p className="text-2xs text-dim leading-relaxed pt-1 border-t border-line">
                Shared identifiers or text similarity alone do not establish that
                these advertisements are part of the same operation.
              </p>
            </div>
          )}
        </div>
      </div>

      {detail && !detailLoading ? (
        <section className="rounded border border-line bg-panel p-4 animate-fade-in" aria-labelledby="shared-signal-map-heading">
          <div className="mb-3">
            <h2 id="shared-signal-map-heading" className="text-sm font-semibold text-paper">Signal Map</h2>
            <p className="mt-0.5 text-2xs text-sub">A focused, reusable view of the selected cluster. Nodes and edges are supplied by stored campaign records.</p>
          </div>
          <SignalMap advertisements={detail.advertisements} relationships={detail.relationships} compact />
        </section>
      ) : null}

      {/* Accessible text alternative for the graph */}
      {selectedCampaign ? (
        <details className="rounded border border-line bg-panel text-xs">
          <summary className="cursor-pointer px-4 py-2.5 text-sub hover:text-paper transition-colors select-none">
            Text summary of selected cluster
          </summary>
          <div className="border-t border-line px-4 py-3 text-sub space-y-1">
            <p>
              <strong className="text-paper">{selectedCampaign.member_count}</strong> advertisement
              {selectedCampaign.member_count !== 1 ? "s" : ""} in this cluster.
              Highest triage score: <strong className="text-paper">{selectedCampaign.max_risk_score}</strong>.
            </p>
            <p>
              Use the graph or open individual investigation records to review
              relationship evidence.
            </p>
          </div>
        </details>
      ) : null}
    </div>
  );
}

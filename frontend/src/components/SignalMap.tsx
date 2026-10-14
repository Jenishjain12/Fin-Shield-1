import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Background,
  Controls,
  ReactFlow,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ExternalLink, Info, Network, X } from "lucide-react";
import { relationshipLabel, riskColor } from "../lib/format";
import type { AdvertisementSummary, Relationship } from "../types/api";

type SignalMapProps = {
  advertisements: AdvertisementSummary[];
  relationships: Relationship[];
  /** Demo maps never link to an investigation record. */
  demo?: boolean;
  compact?: boolean;
  className?: string;
};

type Selection =
  | { type: "advertisement"; value: AdvertisementSummary }
  | { type: "relationship"; value: Relationship };

function makeGraph(advertisements: AdvertisementSummary[], relationships: Relationship[]) {
  const limit = advertisements.slice(0, 18);
  const radius = Math.max(170, limit.length * 21);
  const center = 260;
  const nodes: Node[] = limit.map((ad, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(limit.length, 1) - Math.PI / 2;
    const color = riskColor(ad.risk_category);
    return {
      id: ad.id,
      position: {
        x: center + Math.cos(angle) * radius,
        y: center + Math.sin(angle) * radius,
      },
      data: { ad, label: `${ad.risk_category} · ${ad.risk_score}` },
      style: {
        background: "var(--c-panel)",
        border: `1px solid ${color}99`,
        borderRadius: "4px",
        boxShadow: "0 0 0 1px var(--c-line-subtle), 0 8px 24px rgba(0,0,0,.18)",
        color: "var(--c-paper)",
        fontFamily: "Inter, sans-serif",
        fontSize: "10px",
        fontWeight: 600,
        minWidth: "116px",
        padding: "9px 10px",
        textAlign: "center" as const,
      },
      ariaLabel: `${ad.risk_category} risk advertisement with score ${ad.risk_score}`,
    };
  });
  const ids = new Set(limit.map((ad) => ad.id));
  const edges: Edge[] = relationships
    .filter((relationship) => ids.has(relationship.source_ad_id) && ids.has(relationship.target_ad_id))
    .slice(0, 32)
    .map((relationship) => {
      const similarity = relationship.relationship_type === "text_similarity";
      return {
        id: relationship.id,
        source: relationship.source_ad_id,
        target: relationship.target_ad_id,
        data: { relationship },
        animated: similarity,
        style: {
          stroke: similarity ? "#D4923D" : "#4DB8D4",
          strokeDasharray: similarity ? "5 4" : undefined,
          strokeWidth: similarity ? 1 : 1.4,
          opacity: 0.72,
        },
      };
    });
  return { nodes, edges };
}

/**
 * Shared evidence-network view. It only draws supplied records and relationships;
 * the same component is also used in the opening sequence with labeled demo data.
 */
export function SignalMap({ advertisements, relationships, demo = false, compact = false, className = "" }: SignalMapProps) {
  const { nodes, edges } = useMemo(
    () => makeGraph(advertisements, relationships),
    [advertisements, relationships]
  );
  const [selection, setSelection] = useState<Selection | null>(null);
  const [showSimilarity, setShowSimilarity] = useState(true);

  const visibleEdges = useMemo(
    () => showSimilarity ? edges : edges.filter((edge) => (edge.data?.relationship as Relationship).relationship_type !== "text_similarity"),
    [edges, showSimilarity]
  );
  const selectedId = selection?.type === "advertisement" ? selection.value.id : null;
  const onNodeClick: NodeMouseHandler = (_event, node) => {
    setSelection({ type: "advertisement", value: node.data.ad as AdvertisementSummary });
  };

  if (!advertisements.length) {
    return (
      <div className={`signal-map-empty ${className}`}>
        <Network size={18} aria-hidden="true" />
        <p>No connected evidence records are available yet.</p>
      </div>
    );
  }

  return (
    <section className={`signal-map ${compact ? "signal-map--compact" : ""} ${className}`} aria-label={demo ? "Illustrative signal map" : "Evidence signal map"}>
      <div className="signal-map__toolbar">
        <div>
          <p className="signal-map__eyebrow">{demo ? "Illustrative synthetic example" : "Evidence signal map"}</p>
          <p className="signal-map__legend">
            <span><i className="signal-map__key signal-map__key--shared" /> Shared evidence</span>
            <span><i className="signal-map__key signal-map__key--similar" /> Text similarity</span>
          </p>
        </div>
        <button type="button" className="signal-map__filter" onClick={() => setShowSimilarity((visible) => !visible)} aria-pressed={showSimilarity}>
          {showSimilarity ? "Hide" : "Show"} similarity
        </button>
      </div>
      <div className="signal-map__canvas">
        <ReactFlow
          nodes={nodes.map((node) => ({ ...node, selected: node.id === selectedId }))}
          edges={visibleEdges}
          onNodeClick={onNodeClick}
          onEdgeClick={(_event, edge) => setSelection({ type: "relationship", value: edge.data?.relationship as Relationship })}
          fitView
          fitViewOptions={{ padding: 0.24 }}
          nodesDraggable={!compact}
          nodesConnectable={false}
          elementsSelectable
          panOnDrag={!compact}
          zoomOnScroll={!compact}
          minZoom={0.4}
          maxZoom={1.8}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={22} size={1} color="var(--rf-dot)" />
          {!compact && <Controls showInteractive={false} />}
        </ReactFlow>
      </div>
      <div className="signal-map__accessibility">
        <details>
          <summary>Text summary of this evidence network</summary>
          <p>{advertisements.length} record{advertisements.length === 1 ? "" : "s"} and {relationships.length} supplied relationship{relationships.length === 1 ? "" : "s"} are represented.</p>
        </details>
      </div>
      {selection && (
        <aside className="signal-map__inspector" aria-live="polite" aria-label="Selected evidence detail">
          <button type="button" onClick={() => setSelection(null)} className="signal-map__close" aria-label="Close evidence detail"><X size={14} /></button>
          {selection.type === "advertisement" ? (
            <>
              <p className="signal-map__eyebrow">Advertisement record</p>
              <p className="signal-map__score" style={{ color: riskColor(selection.value.risk_category) }}>{selection.value.risk_category} · {selection.value.risk_score}</p>
              <p className="signal-map__copy">{selection.value.text}</p>
              <p className="signal-map__meta">{selection.value.entity_count} extracted entities · {selection.value.related_count} related records</p>
              {!demo && <Link to={`/investigations/${selection.value.id}`} className="signal-map__open">Open investigation <ExternalLink size={12} /></Link>}
            </>
          ) : (
            <>
              <p className="signal-map__eyebrow">Relationship evidence</p>
              <p className="signal-map__score">{relationshipLabel(selection.value.relationship_type)}</p>
              <p className="signal-map__copy">{selection.value.explanation || "Relationship supplied by the evidence record."}</p>
              {selection.value.evidence && <p className="signal-map__evidence">{selection.value.evidence}</p>}
              <p className="signal-map__meta"><Info size={12} /> Connections describe available evidence, not a confirmed association.</p>
            </>
          )}
        </aside>
      )}
    </section>
  );
}

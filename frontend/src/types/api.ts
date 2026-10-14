export type RiskCategory = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type ReviewStatus = "unreviewed" | "under_review" | "escalated" | "closed";

export interface Entity {
  id: string;
  entity_type: string;
  raw_value: string;
  normalized_value: string;
  source_text: string;
  extraction_method: string;
  confidence: number;
}

export interface Signal {
  id: string;
  signal_type: string;
  title: string;
  explanation: string;
  evidence: string;
  contribution: number;
}

export interface Note {
  id: string;
  content: string;
  created_at: string;
}

export interface Relationship {
  id: string;
  source_ad_id: string;
  target_ad_id: string;
  relationship_type: string;
  evidence: string;
  explanation: string;
  similarity_score: number | null;
}

export interface AdvertisementSummary {
  id: string;
  is_seed: boolean;
  text: string;
  source: string | null;
  source_url: string | null;
  analysis_status: string;
  review_status: ReviewStatus;
  risk_score: number;
  risk_category: RiskCategory;
  created_at: string;
  entity_count: number;
  related_count: number;
}

export interface AdvertisementDetail extends AdvertisementSummary {
  image_filename: string | null;
  ocr_text: string | null;
  ocr_status: string;
  limitations: string | null;
  recommendation: string | null;
  analyzed_at: string | null;
  entities: Entity[];
  signals: Signal[];
  notes: Note[];
  relationships: Relationship[];
}

export interface AlertItem {
  id: string;
  alert_type: string;
  severity: string;
  advertisement_id: string | null;
  campaign_id: string | null;
  reason: string;
  is_read: boolean;
  created_at: string;
}

export interface CampaignSummary {
  id: string;
  label: string;
  member_count: number;
  high_risk_count: number;
  max_risk_score: number;
  member_ids: string[];
}

export interface CampaignDetail extends CampaignSummary {
  advertisements: AdvertisementSummary[];
  relationships: Relationship[];
}

export interface DashboardSummary {
  total_advertisements: number;
  potentially_suspicious: number;
  high_risk: number;
  relationship_count: number;
  seed_advertisement_count: number;
  risk_distribution: Record<string, number>;
  recent_advertisements: AdvertisementSummary[];
  recent_alerts: AlertItem[];
  campaign_activity: CampaignSummary[];
}

export interface PaginatedAds {
  items: AdvertisementSummary[];
  total: number;
  page: number;
  page_size: number;
}

// ── Discovery Agent Types ────────────────────────────────────────────────

export interface SourceInfo {
  source_id: string;
  name: string;
  status: "available" | "auth_required" | "rate_limited" | "planned";
  description: string;
  is_authenticated: boolean;
  requires_credentials: boolean;
  notes: string;
}

export interface DiscoveryCandidate {
  id: string;
  source_type?: string;
  source_url: string;
  page_title: string | null;
  selection_reason: string;
  screenshot_filename: string | null;
  ad_relevance_score: number;
  status: string;
  error_message: string | null;
  advertisement_id: string | null;
  is_duplicate: boolean;
  captured_at: string | null;
  created_at: string;
}

export interface DiscoveryRun {
  id: string;
  query: string;
  sources: string;
  max_candidates: number;
  min_risk_threshold?: number;
  status: string;
  progress_message: string | null;
  candidates_found: number;
  candidates_analyzed: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface CandidateAnalysis {
  candidate_id: string;
  advertisement: AdvertisementDetail;
}

export interface DiscoveryRunDetail extends DiscoveryRun {
  candidates: DiscoveryCandidate[];
  candidate_analyses: CandidateAnalysis[];
}

export interface DiscoverySSEEvent {
  event_type: string;
  message: string;
  status?: string;
  candidates_found?: number;
  candidates_analyzed?: number;
}

// ── AI Investigation Copilot Types ───────────────────────────────────────

export interface CopilotStatus {
  is_configured: boolean;
  model: string;
  description: string;
}

export interface CopilotEvidenceRef {
  type: string;
  label: string;
  value: string;
}

export interface CopilotResponse {
  answer: string;
  evidence_references: CopilotEvidenceRef[];
  advertisement_id: string | null;
  model_used: string;
  error: string | null;
}

export interface CopilotMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  evidence_references?: CopilotEvidenceRef[];
  model_used?: string;
  error?: string | null;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

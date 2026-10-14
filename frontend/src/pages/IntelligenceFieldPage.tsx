import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowDown, ArrowUpRight, Crosshair, ScanLine, Shield, Sparkles } from "lucide-react";
import { SignalMap } from "../components/SignalMap";
import type { AdvertisementSummary, Relationship } from "../types/api";

const INTRO_KEY = "fin-shield-intelligence-field-seen";

const demoAdvertisements: AdvertisementSummary[] = [
  { id: "demo-ad-1", is_seed: true, text: "Promotion fragment / record captured for review", source: "Illustrative", source_url: null, analysis_status: "illustrative", review_status: "unreviewed", risk_score: 54, risk_category: "HIGH", created_at: "", entity_count: 3, related_count: 2 },
  { id: "demo-ad-2", is_seed: true, text: "Entity fragment / identifier observed in submitted copy", source: "Illustrative", source_url: null, analysis_status: "illustrative", review_status: "unreviewed", risk_score: 30, risk_category: "MEDIUM", created_at: "", entity_count: 2, related_count: 1 },
  { id: "demo-ad-3", is_seed: true, text: "Source fragment / comparison record", source: "Illustrative", source_url: null, analysis_status: "illustrative", review_status: "unreviewed", risk_score: 18, risk_category: "LOW", created_at: "", entity_count: 1, related_count: 1 },
  { id: "demo-ad-4", is_seed: true, text: "Risk indicator / available evidence requires review", source: "Illustrative", source_url: null, analysis_status: "illustrative", review_status: "unreviewed", risk_score: 68, risk_category: "HIGH", created_at: "", entity_count: 4, related_count: 2 },
];

const demoRelationships: Relationship[] = [
  { id: "demo-link-1", source_ad_id: "demo-ad-1", target_ad_id: "demo-ad-2", relationship_type: "shared_identifier", evidence: "illustrative shared entity", explanation: "Illustrative relationship shown only to explain the map.", similarity_score: null },
  { id: "demo-link-2", source_ad_id: "demo-ad-2", target_ad_id: "demo-ad-3", relationship_type: "text_similarity", evidence: "illustrative text comparison", explanation: "Illustrative relationship shown only to explain the map.", similarity_score: 0.72 },
  { id: "demo-link-3", source_ad_id: "demo-ad-1", target_ad_id: "demo-ad-4", relationship_type: "shared_identifier", evidence: "illustrative evidence link", explanation: "Illustrative relationship shown only to explain the map.", similarity_score: null },
];

function rememberIntro() {
  try { localStorage.setItem(INTRO_KEY, "true"); } catch { /* storage may be unavailable */ }
}

export function shouldShowIntelligenceField() {
  try { return localStorage.getItem(INTRO_KEY) !== "true"; } catch { return true; }
}

export function IntelligenceFieldPage() {
  const navigate = useNavigate();
  const sectionsRef = useRef<HTMLDivElement>(null);
  const transitionTimer = useRef<number | null>(null);
  const [isEntering, setIsEntering] = useState(false);
  const fragments = useMemo(() => ["COPY / 01", "SOURCE / 02", "ENTITY / 03", "SIGNAL / 04"], []);
  const apertureTicks = useMemo(() => Array.from({ length: 16 }), []);

  useEffect(() => {
    const container = sectionsRef.current;
    if (!container || !window.IntersectionObserver) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.target.classList.toggle("is-visible", entry.isIntersecting));
    }, { threshold: 0.2 });
    container.querySelectorAll("[data-reveal]").forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => {
    if (transitionTimer.current !== null) window.clearTimeout(transitionTimer.current);
  }, []);

  function enterDashboard() {
    if (isEntering) return;
    rememberIntro();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      navigate("/overview");
      return;
    }
    setIsEntering(true);
    transitionTimer.current = window.setTimeout(() => navigate("/overview"), 680);
  }

  return (
    <main className={`intelligence-field ${isEntering ? "is-entering" : ""}`} ref={sectionsRef} aria-busy={isEntering}>
      <div className="intelligence-field__grid" aria-hidden="true" />
      <div className="intelligence-transition" aria-hidden="true"><span>FOCUSING EVIDENCE</span></div>
      <button type="button" className="intelligence-field__skip" onClick={enterDashboard} disabled={isEntering}>Skip introduction <ArrowUpRight size={14} /></button>

      <section className="intelligence-hero" aria-labelledby="intelligence-title">
        <div className="intelligence-hero__mark" aria-hidden="true"><Shield size={17} /><span>FS / 01</span></div>
        <div className="intelligence-hero__content" data-reveal>
          <p className="intelligence-kicker">FIN-SHIELD <span>—</span> BEYOND THE SIGNAL</p>
          <h1 id="intelligence-title">INFORMATION IS<br />EVERYWHERE.<br /><em>THE SIGNAL ISN'T.</em></h1>
          <p className="intelligence-hero__summary">Financial advertising intelligence that turns scattered information into structured, evidence-based investigation.</p>
          <div className="intelligence-hero__actions">
            <button type="button" onClick={enterDashboard} className="intelligence-primary" disabled={isEntering}>Enter intelligence center <ArrowUpRight size={16} /></button>
            <a href="#signal-scan" className="intelligence-secondary">Scroll to explore <ArrowDown size={15} /></a>
          </div>
        </div>
        <div className="intelligence-hero__coordinates" aria-hidden="true"><span>FIELD / 01</span><span>AVAILABLE EVIDENCE</span><span>SCROLL ↓</span></div>
      </section>

      <section id="signal-scan" className="intelligence-section intelligence-scan" aria-labelledby="scan-title">
        <div className="intelligence-section__intro" data-reveal>
          <p className="intelligence-kicker">01 / SIGNAL SCAN</p>
          <h2 id="scan-title">The noise resolves into <em>reviewable fragments.</em></h2>
          <p>FIN-SHIELD keeps submitted advertising material, extracted entities, and rule-based indicators distinct—so each finding can be inspected in context.</p>
        </div>
        <div className="scan-field" data-reveal aria-label="Illustrative scan of information fragments">
          <div className="scan-field__line" aria-hidden="true" />
          {fragments.map((fragment, index) => <div key={fragment} className={`scan-fragment scan-fragment--${index + 1}`}><span>{fragment}</span><b>{index === 0 ? "submitted copy" : index === 1 ? "source record" : index === 2 ? "extracted entity" : "configured indicator"}</b></div>)}
          <p className="scan-field__note">Illustrative fragments — no analysis is run by this animation.</p>
        </div>
      </section>

      <section className="intelligence-section intelligence-network" aria-labelledby="network-title">
        <div className="intelligence-section__intro" data-reveal>
          <p className="intelligence-kicker">02 / EVIDENCE NETWORK</p>
          <h2 id="network-title">Connections are useful only when their <em>evidence is visible.</em></h2>
          <p>Explore a labeled demonstration of the Signal Map. In the intelligence workspace, every edge comes from a stored relationship record.</p>
        </div>
        <div data-reveal><SignalMap advertisements={demoAdvertisements} relationships={demoRelationships} demo compact /></div>
      </section>

      <section className="intelligence-lens" aria-labelledby="lens-title">
        <div className="evidence-aperture" aria-hidden="true">
          <div className="evidence-aperture__orbit evidence-aperture__orbit--outer">
            {apertureTicks.map((_, index) => <i key={index} style={{ "--turn": `${index * 22.5}deg` } as CSSProperties} />)}
          </div>
          <div className="evidence-aperture__orbit evidence-aperture__orbit--inner">
            {apertureTicks.slice(0, 8).map((_, index) => <i key={index} style={{ "--turn": `${index * 45 + 22.5}deg` } as CSSProperties} />)}
          </div>
          <div className="evidence-aperture__core"><Crosshair size={21} /><span>FOCUS</span></div>
        </div>
        <div className="intelligence-lens__content" data-reveal>
          <p className="intelligence-kicker">03 / EVIDENCE APERTURE</p>
          <h2 id="lens-title">Bring the signal into <em>focus.</em></h2>
          <p>The aperture closes around the available evidence, then opens into the workspace—where every conclusion remains open to investigator review.</p>
          <button type="button" onClick={enterDashboard} className="intelligence-primary" disabled={isEntering}>{isEntering ? "Focusing evidence…" : "Enter through the aperture"} <ScanLine size={16} /></button>
        </div>
        <div className="intelligence-lens__footer"><Sparkles size={13} /> SYNTHETIC DEMONSTRATION DATA IS LABELED THROUGHOUT</div>
      </section>
      <Link to="/overview" onClick={rememberIntro} className="sr-only">Skip to FIN-SHIELD overview</Link>
    </main>
  );
}

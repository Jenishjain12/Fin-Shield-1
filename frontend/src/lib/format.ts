import type { RiskCategory } from "../types/api";

/** Hex color for charts and SVG elements that cannot use Tailwind classes */
export function riskColor(category: RiskCategory | string): string {
  switch (category) {
    case "CRITICAL": return "#9E2B2B";
    case "HIGH":     return "#C94040";
    case "MEDIUM":   return "#D4923D";
    default:         return "#3DAB6E";
  }
}

/** Tailwind class string: text + bg + border for risk badges.
 *  Uses semantic status tokens — same hue in both light and dark themes. */
export function riskClass(category: RiskCategory | string): string {
  switch (category) {
    case "CRITICAL":
      return "text-crit bg-crit-dim border-crit/30";
    case "HIGH":
      return "text-danger bg-danger-dim border-danger/30";
    case "MEDIUM":
      return "text-warn bg-warn-dim border-warn/30";
    default:
      return "text-ok bg-ok-dim border-ok/30";
  }
}

/** Left border accent class for table rows and list items */
export function riskBg(category: RiskCategory | string): string {
  switch (category) {
    case "CRITICAL": return "border-l-red-700";
    case "HIGH":     return "border-l-rose-600";
    case "MEDIUM":   return "border-l-amber-600";
    default:         return "border-l-emerald-700";
  }
}

/** Contribution band label from a numeric contribution value */
export function contributionLabel(value: number): string {
  if (value >= 20) return "Major contributor";
  if (value >= 10) return "Moderate contributor";
  if (value >= 1)  return "Minor contributor";
  return "Informational";
}

/** Entity type — returns a short lucide icon name string for lookup */
export function entityTypeLabel(type: string): string {
  switch (type) {
    case "phone":        return "Phone";
    case "url":          return "Link";
    case "domain":       return "Globe";
    case "email":        return "Mail";
    case "upi":          return "CreditCard";
    case "account_like": return "Landmark";
    case "phrase":       return "Quote";
    default:             return "Tag";
  }
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateShort(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function maskValue(type: string, value: string): string {
  if (type !== "account_like" || value.length < 8) return value;
  return `${value.slice(0, 2)}••••${value.slice(-4)}`;
}

export function relationshipLabel(type: string): string {
  const labels: Record<string, string> = {
    shared_phone:        "Shared phone number",
    shared_url:          "Shared URL",
    shared_domain:       "Shared domain",
    shared_email:        "Shared email address",
    shared_upi:          "Shared UPI handle",
    shared_entity:       "Shared identifier",
    text_similarity:     "Similar text content",
  };
  return labels[type] ?? type.replaceAll("_", " ");
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "…";
}

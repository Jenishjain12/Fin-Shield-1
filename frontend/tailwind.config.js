/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",        // ← theme class on <html>
  theme: {
    extend: {
      // ─── Design Tokens ────────────────────────────────────────────────────
      // All color tokens are defined as CSS variables in index.css and mapped
      // here so Tailwind utilities (bg-bg, text-paper, etc.) work for both
      // dark and light mode. The CSS variables are set per-theme on <html>.
      colors: {
        bg:            "var(--c-bg)",
        ink:           "var(--c-bg)",          // compat alias
        panel:         "var(--c-panel)",
        surface:       "var(--c-surface)",
        overlay:       "var(--c-overlay)",

        line:          "var(--c-line)",
        "line-subtle": "var(--c-line-subtle)",

        paper:         "var(--c-paper)",
        sub:           "var(--c-sub)",
        mute:          "var(--c-sub)",          // compat alias
        dim:           "var(--c-dim)",

        // Accent — ice-blue — same in both themes
        accent:           "#4DB8D4",
        "accent-dim":     "rgba(77,184,212,0.10)",
        "accent-border":  "rgba(77,184,212,0.20)",

        // Semantic status — same hues in both themes
        ok:            "#3DAB6E",
        "ok-dim":      "rgba(61,171,110,0.12)",
        warn:          "#D4923D",
        "warn-dim":    "rgba(212,146,61,0.12)",
        danger:        "#C94040",
        "danger-dim":  "rgba(201,64,64,0.12)",
        crit:          "#9E2B2B",
        "crit-dim":    "rgba(158,43,43,0.12)",

        // Backward-compat aliases
        high:          "#C94040",
        critical:      "#9E2B2B",
        mid:           "#D4923D",
        low:           "#3DAB6E",
      },

      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },

      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
        xs:    ["0.75rem",   { lineHeight: "1.125rem" }],
        sm:    ["0.8125rem", { lineHeight: "1.25rem" }],
        base:  ["0.875rem",  { lineHeight: "1.375rem" }],
        md:    ["0.9375rem", { lineHeight: "1.5rem" }],
        lg:    ["1rem",      { lineHeight: "1.5rem" }],
        xl:    ["1.125rem",  { lineHeight: "1.625rem" }],
        "2xl": ["1.25rem",   { lineHeight: "1.75rem" }],
        "3xl": ["1.5rem",    { lineHeight: "2rem" }],
      },

      borderRadius: {
        none:    "0",
        sm:      "4px",
        DEFAULT: "6px",
        md:      "8px",
        lg:      "10px",
        xl:      "14px",
        full:    "9999px",
      },

      boxShadow: {
        panel:        "var(--shadow-panel)",
        modal:        "var(--shadow-modal)",
        glow:         "0 0 0 1px rgba(77,184,212,0.25), 0 0 16px rgba(77,184,212,0.08)",
        "glow-danger":"0 0 0 1px rgba(201,64,64,0.25), 0 0 16px rgba(201,64,64,0.08)",
        focus:        "0 0 0 2px rgba(77,184,212,0.35)",
        card:         "var(--shadow-card)",
      },

      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-fast": {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition:  "400px 0" },
        },
        "score-fill": {
          from: { "stroke-dashoffset": "251" },
        },
        pulse_subtle: {
          "0%, 100%": { opacity: "1" },
          "50%":       { opacity: "0.5" },
        },
        "slide-in": {
          from: { opacity: "0", transform: "translateX(-8px)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
      },

      animation: {
        "fade-in":      "fade-in 0.3s ease-out both",
        "fade-in-d1":   "fade-in 0.3s 0.05s ease-out both",
        "fade-in-d2":   "fade-in 0.3s 0.10s ease-out both",
        "fade-in-d3":   "fade-in 0.3s 0.15s ease-out both",
        "fade-in-d4":   "fade-in 0.3s 0.20s ease-out both",
        "fade-in-fast": "fade-in-fast 0.2s ease-out both",
        shimmer:        "shimmer 1.6s ease-in-out infinite",
        "score-fill":   "score-fill 0.8s ease-out both",
        pulse_subtle:   "pulse_subtle 2.4s ease-in-out infinite",
        "slide-in":     "slide-in 0.25s ease-out both",
      },

      transitionDuration: {
        DEFAULT: "150ms",
      },

      spacing: {
        sidebar: "224px",
      },
    },
  },
  plugins: [],
};

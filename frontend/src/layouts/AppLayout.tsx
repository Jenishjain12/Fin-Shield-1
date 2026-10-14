import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  AlertTriangle,
  Bell,
  Bot,
  FolderSearch,
  GitFork,
  LayoutDashboard,
  Menu,
  ScanSearch,
  Shield,
  Sparkles,
  X,
} from "lucide-react";
import { ThemeSwitcher } from "../components/ThemeSwitcher";

const PRIMARY_NAV = [
  { to: "/overview",       label: "Overview",             icon: LayoutDashboard, end: true  },
  { to: "/analyze",        label: "Analyze",              icon: ScanSearch,      end: false },
  { to: "/investigations", label: "Investigations",       icon: FolderSearch,    end: false },
  { to: "/campaigns",      label: "Campaign Intelligence",icon: GitFork,         end: false },
  { to: "/alerts",         label: "Alerts",               icon: Bell,            end: false },
  { to: "/discovery",      label: "Discovery Agent",      icon: Bot,             end: false },
  { to: "/copilot",        label: "AI Copilot",           icon: Sparkles,        end: false },
];

// ─── Shared sidebar content ────────────────────────────────────────────────
function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
  return (
    <>
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-5 border-b border-line">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded
                     border border-accent-border bg-accent-dim text-accent"
          aria-hidden="true"
        >
          <Shield size={15} strokeWidth={2.5} />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-[0.12em] text-paper">
            FIN-SHIELD
          </p>
          <p className="text-2xs text-sub mt-0.5">Advertisement Intelligence</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5" aria-label="Main menu">
        {PRIMARY_NAV.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            onClick={onNavClick}
            className={({ isActive }) =>
              `group relative flex items-center gap-2.5 rounded px-2.5 py-2 text-sm
               font-medium transition-all duration-150 outline-none
               focus-visible:ring-2 focus-visible:ring-accent/50
               ${isActive
                 ? "bg-accent/[0.07] text-accent"
                 : "text-sub hover:bg-surface hover:text-paper"
               }`
            }
          >
            {({ isActive }) => (
              <>
                {/* Active indicator bar */}
                <span
                  className={`absolute left-0 h-5 w-[3px] rounded-r transition-all ${
                    isActive ? "bg-accent opacity-100" : "opacity-0"
                  }`}
                  aria-hidden="true"
                />
                <link.icon
                  size={15}
                  strokeWidth={isActive ? 2.5 : 2}
                  aria-hidden="true"
                />
                <span>{link.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Disclaimer */}
      <div className="border-t border-line px-5 py-4">
        <div className="flex items-start gap-2">
          <AlertTriangle
            size={11}
            className="mt-px shrink-0 text-warn/70"
            aria-hidden="true"
          />
          <p className="text-2xs leading-relaxed text-dim">
            Scores are configured triage indicators. They are not proof of fraud
            or criminality and require investigator review.
          </p>
        </div>
      </div>
    </>
  );
}

// ─── Main layout ──────────────────────────────────────────────────────────
export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const drawerRef = useRef<HTMLElement>(null);

  // Close drawer on route change (NavLink onClick alone isn't enough for
  // programmatic navigation or back-button navigations)
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Escape key closes the mobile drawer
  useEffect(() => {
    if (!mobileOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  // Prevent body scroll while drawer is open on mobile
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="flex min-h-screen bg-bg text-paper">

      {/* ── Desktop sidebar — always visible ≥ lg ────────────────────── */}
      <aside
        className="hidden lg:flex fixed inset-y-0 left-0 z-20 w-sidebar flex-col
                   border-r border-line bg-panel"
        aria-label="Primary navigation"
      >
        <SidebarContent />
      </aside>

      {/* ── Mobile drawer ────────────────────────────────────────────── */}
      {/* Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-[2px] lg:hidden"
          aria-hidden="true"
          onClick={closeMobile}
        />
      )}

      {/* Drawer panel */}
      <aside
        ref={drawerRef}
        id="mobile-nav"
        className={`fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col
                    border-r border-line bg-panel
                    transition-transform duration-200 ease-out
                    lg:hidden
                    ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
        aria-label="Mobile navigation"
        aria-hidden={!mobileOpen}
      >
        {/* Close button inside drawer */}
        <button
          type="button"
          onClick={closeMobile}
          className="absolute top-3 right-3 flex items-center justify-center
                     h-8 w-8 rounded border border-line text-sub
                     hover:bg-surface hover:text-paper transition-colors"
          aria-label="Close navigation menu"
        >
          <X size={15} />
        </button>

        <SidebarContent onNavClick={closeMobile} />
      </aside>

      {/* ── Main content area ─────────────────────────────────────────── */}
      <div className="flex min-h-screen flex-1 flex-col lg:ml-sidebar">

        {/* Top bar */}
        <header
          className="sticky top-0 z-10 flex items-center justify-between
                     border-b border-line bg-bg/90 px-4 py-2.5 backdrop-blur-sm
                     lg:px-6"
          aria-label="Application header"
        >
          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex items-center justify-center h-8 w-8 rounded
                       border border-line text-sub hover:bg-surface hover:text-paper
                       transition-colors lg:hidden"
            aria-label="Open navigation menu"
            aria-controls="mobile-nav"
            aria-expanded={mobileOpen}
          >
            <Menu size={16} />
          </button>

          {/* Workspace descriptor — not an operational-status claim. */}
          <div
            className="flex items-center gap-2"
            role="status"
            aria-live="polite"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
            <span className="text-2xs font-medium uppercase tracking-[0.15em] text-dim">
              Evidence workspace
            </span>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            {/* Dataset notice */}
            <div
              className="flex items-center gap-1.5 rounded border border-line bg-panel
                         px-2.5 py-1 text-2xs text-dim"
              role="note"
              aria-label="Dataset notice"
            >
              <AlertTriangle size={11} className="text-warn/70" aria-hidden="true" />
              <span className="hidden sm:inline">Synthetic demonstration data</span>
              <span className="sm:hidden">Synthetic data</span>
            </div>

            {/* Theme switcher */}
            <ThemeSwitcher />
          </div>
        </header>

        {/* Page content */}
        <main
          className="flex-1 px-4 py-6 max-w-[1280px] w-full mx-auto lg:px-6"
          id="main-content"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}

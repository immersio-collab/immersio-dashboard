"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  FileText,
  Globe,
  LogOut,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Bell,
  Clock,
  CalendarClock,
  Calendar,
  ChevronRight,
} from "lucide-react";
import { logout } from "@/lib/auth";

/* ------------------------------------------------------------------ */
/* Nav item definitions                                                 */
/* ------------------------------------------------------------------ */

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  disabled?: boolean;
  soon?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Vue d'ensemble",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Leads",
    href: "/dashboard/leads",
    icon: Users,
  },
  {
    label: "Portfolio",
    href: "/dashboard/portfolio",
    icon: FolderOpen,
  },
  {
    label: "Blog",
    href: "/dashboard/blog",
    icon: FileText,
  },
  {
    label: "Tours",
    href: "/dashboard/tours",
    icon: Globe,
  },
];

/* ------------------------------------------------------------------ */
/* Sidebar content (shared between desktop and mobile drawer)           */
/* ------------------------------------------------------------------ */

function SidebarContent({
  pathname,
  onNavClick,
  isCollapsed = false,
  onToggleCollapse,
}: {
  pathname: string;
  onNavClick?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Logo and Collapse Button */}
      <div className={`h-14 border-b border-border flex items-center flex-shrink-0 transition-all ${isCollapsed ? 'justify-center px-0' : 'px-4 justify-between'}`}>
        {!isCollapsed && (
          <span className="font-semibold text-accent tracking-tight truncate">
            Immersio
          </span>
        )}
        {onToggleCollapse && (
          <button
            type="button"
            className="p-1.5 rounded text-text-muted hover:text-text hover:bg-surface-muted transition-colors"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? "Ouvrir la sidebar" : "Réduire la sidebar"}
          >
            {isCollapsed ? <PanelLeftOpen size={18} aria-hidden="true" /> : <PanelLeftClose size={18} aria-hidden="true" />}
          </button>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {NAV_ITEMS.map((item) => {
          const isActive =
            !item.disabled &&
            (item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href));

          const Icon = item.icon;

          if (item.disabled) {
            return (
              <div
                key={item.href}
                className={`flex items-center gap-3 py-2 text-sm rounded text-text-subtle cursor-not-allowed select-none transition-all ${isCollapsed ? 'justify-center px-0' : 'px-3'}`}
                aria-disabled="true"
                title={isCollapsed ? item.label : undefined}
              >
                <Icon size={15} className="flex-shrink-0" aria-hidden="true" />
                {!isCollapsed && <span className="flex-1 truncate">{item.label}</span>}
                {!isCollapsed && item.soon && (
                  <span className="text-[10px] font-medium tracking-wide text-text-subtle border border-border rounded px-1 py-0.5 leading-none">
                    Bientôt
                  </span>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavClick}
              title={isCollapsed ? item.label : undefined}
              className={[
                "flex items-center gap-3 py-2 text-sm rounded transition-all",
                isActive
                  ? "bg-surface-subtle text-accent font-medium"
                  : "text-text-muted hover:bg-surface-muted hover:text-text",
                isCollapsed ? 'justify-center px-0' : 'px-3'
              ].join(" ")}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon size={15} className="flex-shrink-0" aria-hidden="true" />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: Déconnexion */}
      <div className="p-3 border-t border-border flex-shrink-0">
        <form action={logout}>
          <button
            type="submit"
            id="sidebar-logout-btn"
            title={isCollapsed ? "Déconnexion" : undefined}
            className={`flex w-full items-center gap-3 py-2 text-sm rounded text-text-muted hover:bg-surface-muted hover:text-text transition-all ${isCollapsed ? 'justify-center px-0' : 'px-3'}`}
          >
            <LogOut size={15} className="flex-shrink-0" aria-hidden="true" />
            {!isCollapsed && <span className="truncate">Déconnexion</span>}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page title helper                                                    */
/* ------------------------------------------------------------------ */

function getPageTitle(pathname: string): string {
  if (pathname === "/dashboard") return "Vue d'ensemble";
  if (pathname.startsWith("/dashboard/leads")) return "Leads";
  if (pathname.startsWith("/dashboard/portfolio")) return "Portfolio";
  if (pathname.startsWith("/dashboard/blog")) return "Blog";
  if (pathname.startsWith("/dashboard/tours")) return "Tours";
  return "Dashboard";
}

/* ------------------------------------------------------------------ */
/* Types & Main export: full sidebar + header shell                     */
/* ------------------------------------------------------------------ */

export interface ActiveRappelItem {
  leadId: string;
  nom: string;
  rappelDate: string;
  rappelNote: string;
  isDue: boolean;
  isToday: boolean;
}

function formatRappelDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (isToday) {
    return `Aujourd'hui à ${time}`;
  }
  return `${d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })} à ${time}`;
}

export function SidebarNav({ 
  children,
  nouveauxCount = 0,
  retardCount = 0,
  activeRappels = [],
}: { 
  children: React.ReactNode;
  nouveauxCount?: number;
  retardCount?: number;
  activeRappels?: ActiveRappelItem[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pageTitle = getPageTitle(pathname);

  const dueRappelsCount = activeRappels.filter((r) => r.isDue || r.isToday).length;

  return (
    <div className="h-screen overflow-hidden flex bg-background">
      {/* ---- Desktop sidebar (fixed, always visible) ---- */}
      <aside
        id="dashboard-sidebar"
        className={`hidden md:flex flex-col h-full border-r border-border bg-surface flex-shrink-0 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-16' : 'w-56'}`}
      >
        <SidebarContent 
          pathname={pathname} 
          isCollapsed={isCollapsed} 
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)} 
        />
      </aside>

      {/* ---- Mobile overlay + drawer ---- */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          aria-hidden="true"
          onClick={() => setMobileOpen(false)}
        >
          {/* Semi-transparent backdrop */}
          <div className="absolute inset-0 bg-black/20" />
        </div>
      )}

      <aside
        id="dashboard-sidebar-mobile"
        className={[
          "fixed inset-y-0 left-0 z-50 w-56 border-r border-border bg-surface flex flex-col md:hidden transition-transform duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
        aria-label="Navigation principale"
      >
        {/* Close button inside drawer */}
        <button
          id="sidebar-close-btn"
          type="button"
          className="absolute top-3.5 right-3 p-1 rounded text-text-muted hover:text-text hover:bg-surface-muted transition-colors"
          onClick={() => setMobileOpen(false)}
          aria-label="Fermer la navigation"
        >
          <X size={16} aria-hidden="true" />
        </button>

        <SidebarContent
          pathname={pathname}
          onNavClick={() => setMobileOpen(false)}
          isCollapsed={false}
        />
      </aside>

      {/* ---- Main content area ---- */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Header */}
        <header className="h-14 border-b border-border px-4 md:px-6 flex items-center gap-4 flex-shrink-0 bg-surface">
          {/* Burger button — mobile only */}
          <button
            id="sidebar-open-btn"
            type="button"
            className="md:hidden p-1.5 rounded text-text-muted hover:text-text hover:bg-surface-muted transition-colors -ml-1"
            onClick={() => setMobileOpen(true)}
            aria-label="Ouvrir la navigation"
            aria-expanded={mobileOpen}
            aria-controls="dashboard-sidebar-mobile"
          >
            <Menu size={18} aria-hidden="true" />
          </button>

          {/* Page title */}
          <h1
            className="text-lg font-medium text-text flex-1 truncate"
            id="dashboard-page-title"
          >
            {pageTitle}
          </h1>

          {/* Notification Icons */}
          <div className="flex items-center gap-2 relative">
            {/* Rendez-vous / Échéances importantes */}
            <button
              onClick={() => router.push(`/dashboard/leads?filter=rappels&t=${Date.now()}`)}
              className="relative p-2 text-text-muted hover:text-text hover:bg-surface-muted rounded-md transition-colors"
              title="Rendez-vous et dates importantes"
              aria-label="Rendez-vous et dates importantes"
            >
              <CalendarClock size={18} />
              {dueRappelsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500 border border-surface"></span>
                </span>
              )}
              {activeRappels.length > 0 && dueRappelsCount === 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-blue-500 border border-surface" />
              )}
            </button>

            {/* Leads en retard */}
            <button
              onClick={() => router.push(`/dashboard/leads?filter=retard&t=${Date.now()}`)}
              className="relative p-2 text-text-muted hover:text-text hover:bg-surface-muted rounded-md transition-colors"
              title="Leads en retard de relance"
            >
              <Clock size={18} />
              {retardCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border border-surface"></span>
                </span>
              )}
            </button>

            {/* Nouveaux leads */}
            <button
              onClick={() => router.push(`/dashboard/leads?filter=nouveaux&t=${Date.now()}`)}
              className="relative p-2 text-text-muted hover:text-text hover:bg-surface-muted rounded-md transition-colors"
              title="Nouveaux leads"
            >
              <Bell size={18} />
              {nouveauxCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500 border border-surface"></span>
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Scrollable main content */}
        <main className="flex-1 p-6 overflow-auto flex flex-col min-h-0">{children}</main>
      </div>
    </div>
  );
}

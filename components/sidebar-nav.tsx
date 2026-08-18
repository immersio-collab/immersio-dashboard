"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
    disabled: true,
    soon: true,
  },
  {
    label: "Blog",
    href: "/dashboard/blog",
    icon: FileText,
    disabled: true,
    soon: true,
  },
  {
    label: "Tours",
    href: "/dashboard/tours",
    icon: Globe,
    disabled: true,
    soon: true,
  },
];

/* ------------------------------------------------------------------ */
/* Sidebar content (shared between desktop and mobile drawer)           */
/* ------------------------------------------------------------------ */

function SidebarContent({
  pathname,
  onNavClick,
}: {
  pathname: string;
  onNavClick?: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="h-14 border-b border-border px-4 flex items-center flex-shrink-0">
        <span className="font-semibold text-accent tracking-tight">
          Immersio
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
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
                className="flex items-center gap-3 px-3 py-2 text-sm rounded text-text-subtle cursor-not-allowed select-none"
                aria-disabled="true"
              >
                <Icon size={15} className="flex-shrink-0" aria-hidden="true" />
                <span className="flex-1">{item.label}</span>
                {item.soon && (
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
              className={[
                "flex items-center gap-3 px-3 py-2 text-sm rounded transition-colors",
                isActive
                  ? "bg-surface-subtle text-accent font-medium"
                  : "text-text-muted hover:bg-surface-muted hover:text-text",
              ].join(" ")}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon size={15} className="flex-shrink-0" aria-hidden="true" />
              <span>{item.label}</span>
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
            className="flex w-full items-center gap-3 px-3 py-2 text-sm rounded text-text-muted hover:bg-surface-muted hover:text-text transition-colors"
          >
            <LogOut size={15} className="flex-shrink-0" aria-hidden="true" />
            <span>Déconnexion</span>
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
/* Main export: full sidebar + header shell                             */
/* ------------------------------------------------------------------ */

export function SidebarNav({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pageTitle = getPageTitle(pathname);

  return (
    <div className="min-h-screen flex bg-background">
      {/* ---- Desktop sidebar (fixed, always visible) ---- */}
      <aside
        id="dashboard-sidebar"
        className="hidden md:flex flex-col w-56 border-r border-border bg-surface flex-shrink-0"
      >
        <SidebarContent pathname={pathname} />
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
        />
      </aside>

      {/* ---- Main content area ---- */}
      <div className="flex-1 flex flex-col min-w-0">
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
            className="text-sm font-medium text-text flex-1"
            id="page-heading"
          >
            {pageTitle}
          </h1>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

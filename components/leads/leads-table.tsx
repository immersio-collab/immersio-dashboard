"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  X,
  RefreshCw,
  Clock,
  Copy,
  Loader2,
  Search,
  AlertTriangle,
  Plus,
  Users,
  Bell,
  MessageCircle,
  RotateCcw,
  CalendarClock,
  Calendar,
  Filter,
} from "lucide-react";
import type { Lead, LeadAlert, LeadAlertKind } from "@/types";
import { 
  getLeadAlerts,
  hasActiveRappel,
  isRappelDue,
  isRappelToday,
  getRappelStatus,
} from "@/lib/lead-alerts";
import { LeadDetailCard } from "@/components/leads/lead-detail-card";
import { LeadCreateModal } from "@/components/leads/lead-create-modal";
import { RelanceVariationsModal } from "@/components/leads/relance-variations-modal";
import type { RelanceType } from "@/components/leads/relance-variations-modal";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUT_OPTIONS = [
  "Nouveau",
  "Contacté",
  "Intéressé",
  "Négociation",
  "Gagné",
  "Perdu",
  "En pause",
] as const;

const STATUS_STYLES: Record<string, string> = {
  Nouveau: "bg-blue-50 text-blue-700 border-blue-200",
  Contacté: "bg-slate-50 text-slate-700 border-slate-200",
  Intéressé: "bg-amber-50 text-amber-700 border-amber-200",
  Négociation: "bg-indigo-50 text-indigo-700 border-indigo-200",
  Gagné: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Perdu: "bg-rose-50 text-rose-700 border-rose-200",
  "En pause": "bg-yellow-50 text-yellow-800 border-yellow-200",
};

const CANAL_OPTIONS = [
  "Instagram",
  "Facebook",
  "WhatsApp",
  "Référence",
  "Site web",
  "Autre",
] as const;

const TYPE_BIEN_OPTIONS = [
  "Immobilier",
  "Cabinet Médical",
  "Ecole",
  "Bureau",
  "Autre",
] as const;

const SUIVI_OPTIONS = [
  { id: "appelTelephonique", label: "Appel tél." },
  { id: "contacteSurWhatsapp", label: "WhatsApp" },
  { id: "devisEnvoye", label: "Devis envoyé" },
  { id: "demoEnvoye", label: "Démo envoyée" },
] as const;

const VILLE_OPTIONS = [
  "Rabat",
  "Casablanca",
  "Kénitra",
  "Tanger",
  "Autre ville",
] as const;

type SortKey = "dateFormulaire" | "statut" | "nom";
type SortDir = "asc" | "desc";

// Alert metadata
const ALERT_META: Record<
  LeadAlertKind,
  { icon: React.ElementType; title: string; colorClass: string }
> = {
  "rappel-du": {
    icon: CalendarClock,
    title: "Rendez-vous / Rappel dû",
    colorClass: "text-amber-600",
  },
  "relance-en-retard": {
    icon: RefreshCw,
    title: "Relance en retard",
    colorClass: "text-rose-500",
  },
  "jamais-contacte": {
    icon: Clock,
    title: "Jamais contacté",
    colorClass: "text-amber-600",
  },
  "doublon-non-resolu": {
    icon: Copy,
    title: "Doublon non résolu",
    colorClass: "text-blue-500",
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString("fr-FR");
}

function fmtRappelDateTime(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `Aujourd'hui ${time}`;
  return `${d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })} ${time}`;
}

// ---------------------------------------------------------------------------
// Alert badges (in table row)
// ---------------------------------------------------------------------------

function AlertBadges({ lead, alerts }: { lead: Lead; alerts: LeadAlert[] }) {
  if (alerts.length === 0) return null;
  return (
    <div className="flex items-center gap-1">
      {alerts.map((a) => {
        const { icon: Icon, title, colorClass } = ALERT_META[a.kind];

        if (a.kind === "relance-en-retard") {
          const match = a.message?.match(/Relance (\d)/i);
          const rNum = match ? match[1] : "1";
          const relanceType = `relance${rNum}` as RelanceType;

          return (
            <RelanceVariationsModal
              key={a.kind}
              relanceType={relanceType}
              phoneNumber={lead.telephone}
              customTrigger={
                <span
                  title={a.message || title}
                  aria-label={title}
                  className="inline-flex items-center hover:scale-125 transition-transform duration-200"
                >
                  <Icon size={12} className={colorClass} aria-hidden="true" />
                </span>
              }
            />
          );
        }

        return (
          <span
            key={a.kind}
            title={a.message || title}
            aria-label={title}
            className="inline-flex items-center"
          >
            <Icon size={12} className={colorClass} aria-hidden="true" />
          </span>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sort header button
// ---------------------------------------------------------------------------

function SortTh({
  label,
  col,
  currentKey,
  dir,
  onSort,
  className,
}: {
  label: string;
  col: SortKey;
  currentKey: SortKey;
  dir: SortDir;
  onSort: (col: SortKey) => void;
  className?: string;
}) {
  const active = currentKey === col;
  const Icon = active
    ? dir === "asc"
      ? ChevronUp
      : ChevronDown
    : ChevronsUpDown;
  return (
    <th
      className={[
        "px-2 sm:px-3 py-2 sm:py-2.5 text-left whitespace-nowrap",
        className,
      ].join(" ")}
      aria-sort={
        active ? (dir === "asc" ? "ascending" : "descending") : "none"
      }
    >
      <button
        type="button"
        onClick={() => onSort(col)}
        className="inline-flex items-center gap-1 text-xs font-medium text-text-muted hover:text-text transition-colors"
      >
        {label}
        <Icon
          size={12}
          aria-hidden="true"
          className={active ? "text-accent" : ""}
        />
      </button>
    </th>
  );
}

// ---------------------------------------------------------------------------
// Main export — LeadsTable
// ---------------------------------------------------------------------------

export interface LeadsTableProps {
  initialLeads: Lead[];
  /** Lead ID to open in the detail card on mount (from ?id= query param). */
  initialSelectedId?: string;
  /** Initial filter to apply from header notification clicks (nouveaux, retard). */
  initialFilter?: string;
}

export function LeadsTable({
  initialLeads,
  initialSelectedId,
  initialFilter,
}: LeadsTableProps) {
  const searchParamsHook = useSearchParams();

  // ── State ──────────────────────────────────────────────────────────────────
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [search, setSearch] = useState("");
  const [filterStatuts, setFilterStatuts] = useState<string[]>([]);
  const [isStatutDropdownOpen, setIsStatutDropdownOpen] = useState(false);
  const [filterCanal, setFilterCanal] = useState("");
  const [filterVille, setFilterVille] = useState("");
  const [filterTypeBien, setFilterTypeBien] = useState("");
  const [filterSuivi, setFilterSuivi] = useState<string[]>([]);
  const [isSuiviDropdownOpen, setIsSuiviDropdownOpen] = useState(false);
  const [showDoublons, setShowDoublons] = useState(false);
  const [showNouveaux, setShowNouveaux] = useState(
    !initialFilter || initialFilter === "nouveaux"
  );
  const [showEnRetard, setShowEnRetard] = useState(
    !initialFilter || initialFilter === "retard"
  );
  const [showRappels, setShowRappels] = useState(
    initialFilter === "rappels"
  );
  const [sortKey, setSortKey] = useState<SortKey>("dateFormulaire");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(() => {
    if (!initialSelectedId) return null;
    return (
      initialLeads.find((l) => l.leadId === initialSelectedId) ?? null
    );
  });
  const [archiveConfirmId, setArchiveConfirmId] = useState<string | null>(
    null
  );
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  const tableBodyRef = useRef<HTMLTableSectionElement>(null);

  // Sync leads when initialLeads updates (e.g. after a router.refresh() from a save)
  useEffect(() => {
    setLeads(initialLeads);
    // Also update selectedLead so the card reflects new data immediately
    setSelectedLead((current) => {
      if (!current) return null;
      return (
        initialLeads.find((l) => l.leadId === current.leadId) ?? null
      );
    });
  }, [initialLeads]);

  // Sync filters from URL query parameters (triggered by header icons)
  useEffect(() => {
    const filterQuery = searchParamsHook.get("filter");
    if (filterQuery === "nouveaux") {
      setShowNouveaux(true);
      setShowEnRetard(false);
      setShowRappels(false);
    } else if (filterQuery === "retard") {
      setShowEnRetard(true);
      setShowNouveaux(false);
      setShowRappels(false);
    } else if (filterQuery === "rappels") {
      setShowRappels(true);
      setShowNouveaux(false);
      setShowEnRetard(false);
    }
  }, [searchParamsHook]);

  // ── Sort handler ────────────────────────────────────────────────────────────
  function toggleSort(col: SortKey) {
    if (sortKey === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(col);
      setSortDir("asc");
    }
  }

  // ── Filtered + sorted leads ────────────────────────────────────────────────
  const displayedLeads = useMemo(() => {
    let result = leads;

    // Hide doublons by default unless toggle is on
    if (!showDoublons) {
      result = result.filter((l) => l.doublon !== "⚠ Doublon");
    }

    // Rappels filter
    if (showRappels) {
      result = result.filter((l) => hasActiveRappel(l));
    }

    // Nouveaux / En retard combined filter
    if (showNouveaux || showEnRetard) {
      result = result.filter((l) => {
        const isNouveau = l.statut === "Nouveau";
        const isRetard = getLeadAlerts(l).some((a) => a.kind === "relance-en-retard");
        if (showNouveaux && showEnRetard) return isNouveau || isRetard;
        if (showNouveaux) return isNouveau;
        return isRetard;
      });
    }

    // Statut filter
    if (filterStatuts.length > 0) {
      result = result.filter((l) => filterStatuts.includes(l.statut));
    } else {
      // Masquer les leads "Perdu" par défaut (sauf s'ils sont explicitement demandés via le filtre)
      result = result.filter((l) => l.statut !== "Perdu");
    }

    // Suivi filter
    if (filterSuivi.length > 0) {
      result = result.filter((l) => {
        return filterSuivi.every(
          (key) => l[key as keyof Lead] === "Oui"
        );
      });
    }

    // Canal filter
    if (filterCanal) {
      result = result.filter((l) => l.canal === filterCanal);
    }

    // Ville filter
    if (filterVille) {
      if (filterVille === "Autre ville") {
        const mainCities = ["Rabat", "Casablanca", "Kénitra", "Tanger"];
        result = result.filter((l) => !mainCities.includes(l.ville || ""));
      } else {
        result = result.filter((l) => l.ville === filterVille);
      }
    }

    // Type de bien filter
    if (filterTypeBien) {
      result = result.filter((l) => l.typeDeBien === filterTypeBien);
    }

    // Text search: nom, téléphone, ville, rappelNote
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (l) =>
          l.nom.toLowerCase().includes(q) ||
          l.telephone.includes(q) ||
          l.ville.toLowerCase().includes(q) ||
          (l.rappelNote && l.rappelNote.toLowerCase().includes(q))
      );
    }

    // Sort with Priority:
    // 1. Due / Overdue rappels (rappelDate <= now and !rappelFait) -> TOP OF THE LIST
    // 2. Today's rappels (scheduled today and !rappelFait) -> NEXT TOP
    // 3. Upcoming active rappels
    // 4. Default user-chosen column sort
    const sorted = [...result].sort((a, b) => {
      const aDue = isRappelDue(a);
      const bDue = isRappelDue(b);
      if (aDue && !bDue) return -1;
      if (!aDue && bDue) return 1;

      const aToday = isRappelToday(a);
      const bToday = isRappelToday(b);
      if (aToday && !bToday) return -1;
      if (!aToday && bToday) return 1;

      if (showNouveaux && showEnRetard) {
        const aNouveau = a.statut === "Nouveau";
        const bNouveau = b.statut === "Nouveau";
        if (aNouveau && !bNouveau) return -1;
        if (!aNouveau && bNouveau) return 1;
      }

      let cmp = 0;
      if (sortKey === "dateFormulaire") {
        cmp = (a.dateFormulaire || "").localeCompare(
          b.dateFormulaire || ""
        );
      } else if (sortKey === "statut") {
        cmp = (a.statut || "").localeCompare(b.statut || "", "fr");
      } else if (sortKey === "nom") {
        cmp = (a.nom || "").localeCompare(b.nom || "", "fr");
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return sorted;
  }, [
    leads,
    search,
    filterStatuts,
    filterCanal,
    filterVille,
    filterTypeBien,
    filterSuivi,
    showDoublons,
    showNouveaux,
    showEnRetard,
    showRappels,
    sortKey,
    sortDir,
  ]);

  // Count leads with active rappels
  const rappelsCount = useMemo(
    () => leads.filter((l) => hasActiveRappel(l)).length,
    [leads]
  );

  // Count leads hidden by doublon filter
  const doublonCount = useMemo(
    () => leads.filter((l) => l.doublon === "⚠ Doublon").length,
    [leads]
  );

  // Count leads en retard
  const retardCount = useMemo(
    () =>
      leads.filter((l) =>
        getLeadAlerts(l).some((a) => a.kind === "relance-en-retard")
      ).length,
    [leads]
  );

  // Count nouveaux leads
  const nouveauxCount = useMemo(
    () => leads.filter((l) => l.statut === "Nouveau").length,
    [leads]
  );

  // ── Keyboard navigation (↑/↓) ─────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (isCreateOpen) return;
      if (e.key === "Escape" && selectedLead) {
        setSelectedLead(null);
        return;
      }
      if (
        (e.key === "ArrowDown" || e.key === "ArrowUp") &&
        displayedLeads.length > 0
      ) {
        e.preventDefault();
        const currentIdx = selectedLead
          ? displayedLeads.findIndex(
              (l) => l.leadId === selectedLead.leadId
            )
          : -1;
        let nextIdx: number;
        if (e.key === "ArrowDown") {
          nextIdx =
            currentIdx < displayedLeads.length - 1 ? currentIdx + 1 : 0;
        } else {
          nextIdx =
            currentIdx > 0
              ? currentIdx - 1
              : displayedLeads.length - 1;
        }
        setSelectedLead(displayedLeads[nextIdx]);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selectedLead, displayedLeads, isCreateOpen]);

  // ── Archive handlers ───────────────────────────────────────────────────────
  const handleArchiveRequest = useCallback((leadId: string) => {
    setArchiveConfirmId(leadId);
    setArchiveError(null);
  }, []);

  const handleArchiveCancel = useCallback(() => {
    setArchiveConfirmId(null);
  }, []);

  const handleArchiveConfirm = useCallback(
    async (leadId: string) => {
      setArchiveConfirmId(null);
      setArchivingId(leadId);
      setArchiveError(null);
      try {
        const res = await fetch(`/api/leads/${leadId}/archive`, {
          method: "POST",
        });
        if (!res.ok) {
          const json = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(json.error ?? `Erreur HTTP ${res.status}`);
        }
        // Optimistic: remove from local state
        setLeads((prev) => prev.filter((l) => l.leadId !== leadId));
        setSelectedLead((prev) =>
          prev?.leadId === leadId ? null : prev
        );
      } catch (err) {
        setArchiveError(
          err instanceof Error
            ? err.message
            : "Erreur lors de l'archivage."
        );
      } finally {
        setArchivingId(null);
      }
    },
    []
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  const totalFiltered = displayedLeads.length;
  const totalActive = leads.filter(
    (l) => l.doublon !== "⚠ Doublon"
  ).length;
  const isFiltered = !!search || filterStatuts.length > 0 || !!filterCanal || !!filterVille || !!filterTypeBien;

  return (
    <div className="space-y-3 flex flex-col flex-1 min-h-0">
      {/* ── Filter bar ── */}
      <div className="flex flex-col gap-3 bg-surface border border-border p-3 rounded-lg shadow-sm shrink-0">
        {/* Top Row: Search & Mobile Filter Button */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Text search */}
          <div className="relative flex-1 min-w-[120px] max-w-sm">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-subtle pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="leads-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher (nom, tél, ville)..."
              className="bg-surface border border-border rounded-md text-sm h-9 pl-9 pr-3 w-full focus:ring-1 focus:ring-accent outline-none"
              aria-label="Rechercher un lead"
            />
          </div>

          {/* Mobile Filters Toggle Button */}
          <button
            type="button"
            onClick={() => setIsMobileFiltersOpen(true)}
            className="sm:hidden btn-secondary h-9 w-9 p-0 flex items-center justify-center shrink-0 relative"
            aria-label="Filtres"
          >
            <Filter size={16} />
            {(filterStatuts.length > 0 || filterCanal || filterVille || filterTypeBien || filterSuivi.length > 0) && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent" />
            )}
          </button>
        </div>

        {/* Mobile Overlay Background */}
        {isMobileFiltersOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 sm:hidden" 
            onClick={() => setIsMobileFiltersOpen(false)} 
            aria-hidden="true"
          />
        )}

        {/* Dropdowns Row (Modal on mobile, Inline on desktop) */}
        <div 
          className={[
            "gap-3",
            isMobileFiltersOpen 
              ? "fixed bottom-0 left-0 right-0 bg-surface z-50 p-4 rounded-t-2xl shadow-2xl flex flex-col items-stretch max-h-[85vh] overflow-y-auto sm:static sm:z-auto sm:p-0 sm:rounded-none sm:shadow-none sm:flex-row sm:items-center sm:max-h-none sm:overflow-visible" 
              : "hidden sm:flex sm:flex-wrap sm:items-center"
          ].join(" ")}
        >
          {/* Header for mobile modal */}
          {isMobileFiltersOpen && (
            <div className="flex items-center justify-between sm:hidden mb-2 pb-3 border-b border-border">
              <h3 className="font-semibold text-text">Filtres</h3>
              <button onClick={() => setIsMobileFiltersOpen(false)} className="p-1 text-text-subtle hover:text-text rounded-md hover:bg-surface-muted transition-colors">
                <X size={20}/>
              </button>
            </div>
          )}

          {/* Statut filter */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsStatutDropdownOpen(!isStatutDropdownOpen)}
              className="bg-surface border border-border hover:bg-surface-muted transition-colors rounded-md text-sm h-9 px-3 flex items-center justify-between gap-2 min-w-[160px]"
              aria-label="Filtrer par statut"
            >
              <span className="truncate max-w-[130px]">
                {filterStatuts.length === 0
                  ? "Tous les statuts"
                  : filterStatuts.length === 1
                  ? filterStatuts[0]
                  : `${filterStatuts.length} statuts`}
              </span>
              <ChevronDown size={14} className="text-text-subtle flex-shrink-0" aria-hidden="true" />
            </button>
            
            {isStatutDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setIsStatutDropdownOpen(false)}
                  aria-hidden="true"
                />
                <div className="absolute top-full left-0 mt-1 w-56 bg-surface border border-border rounded-md shadow-lg z-20 py-1.5 max-h-64 overflow-auto">
                  {STATUT_OPTIONS.map((s) => {
                    const isChecked = filterStatuts.includes(s);
                    return (
                      <label
                        key={s}
                        className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-surface-muted cursor-pointer text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setFilterStatuts((prev) =>
                              prev.includes(s)
                                ? prev.filter((x) => x !== s)
                                : [...prev, s]
                            );
                          }}
                          className="rounded border-border text-accent focus:ring-accent w-3.5 h-3.5 flex-shrink-0"
                        />
                        <span className="truncate">{s}</span>
                      </label>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Canal filter */}
          <select
            id="leads-filter-canal"
            value={filterCanal}
            onChange={(e) => setFilterCanal(e.target.value)}
            className="bg-surface border border-border hover:bg-surface-muted transition-colors rounded-md text-sm h-9 px-3 pr-8 min-w-[160px]"
            aria-label="Filtrer par canal"
          >
            <option value="">Tous les canaux</option>
            {CANAL_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Ville filter */}
          <select
            id="leads-filter-ville"
            value={filterVille}
            onChange={(e) => setFilterVille(e.target.value)}
            className="bg-surface border border-border hover:bg-surface-muted transition-colors rounded-md text-sm h-9 px-3 pr-8 min-w-[160px]"
            aria-label="Filtrer par ville"
          >
            <option value="">Toutes les villes</option>
            {VILLE_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>

          {/* Type de bien filter */}
          <select
            id="leads-filter-type-bien"
            value={filterTypeBien}
            onChange={(e) => setFilterTypeBien(e.target.value)}
            className="bg-surface border border-border hover:bg-surface-muted transition-colors rounded-md text-sm h-9 px-3 pr-8 min-w-[160px]"
            aria-label="Filtrer par type de bien"
          >
            <option value="">Tous les types de biens</option>
            {TYPE_BIEN_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* Suivi filter */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsSuiviDropdownOpen(!isSuiviDropdownOpen)}
              className="bg-surface border border-border hover:bg-surface-muted transition-colors rounded-md text-sm h-9 px-3 flex items-center justify-between gap-2 min-w-[160px]"
              aria-label="Filtrer par actions de suivi"
            >
              <span className="truncate max-w-[130px]">
                {filterSuivi.length === 0
                  ? "Toutes actions"
                  : filterSuivi.length === 1
                  ? SUIVI_OPTIONS.find((o) => o.id === filterSuivi[0])?.label
                  : `${filterSuivi.length} actions`}
              </span>
              <ChevronDown size={14} className="text-text-subtle flex-shrink-0" aria-hidden="true" />
            </button>
            
            {isSuiviDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setIsSuiviDropdownOpen(false)}
                  aria-hidden="true"
                />
                <div className="absolute bottom-full left-0 mb-1 w-56 bg-surface border border-border rounded-md shadow-lg z-20 py-1.5 max-h-64 overflow-auto">
                  {SUIVI_OPTIONS.map((opt) => {
                    const isChecked = filterSuivi.includes(opt.id);
                    return (
                      <label
                        key={opt.id}
                        className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-surface-muted cursor-pointer text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setFilterSuivi((prev) =>
                              prev.includes(opt.id)
                                ? prev.filter((x) => x !== opt.id)
                                : [...prev, opt.id]
                            );
                          }}
                          className="rounded border-border text-accent focus:ring-accent w-3.5 h-3.5 flex-shrink-0"
                        />
                        <span className="truncate">{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Reset button */}
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setFilterStatuts([]);
              setFilterCanal("");
              setFilterVille("");
              setFilterTypeBien("");
              setFilterSuivi([]);
              setShowDoublons(false);
              setShowNouveaux(false);
              setShowEnRetard(false);
              setShowRappels(false);
            }}
            className="h-9 sm:w-9 flex items-center justify-center sm:rounded-md text-text-subtle hover:text-text hover:bg-surface-muted sm:border sm:border-border transition-colors flex-shrink-0 mt-2 sm:mt-0 py-2 sm:py-0 border border-border rounded-md w-full"
            title="Réinitialiser tous les filtres"
            aria-label="Réinitialiser tous les filtres"
          >
            <RotateCcw size={14} aria-hidden="true" className="mr-2 sm:mr-0" />
            <span className="sm:hidden text-sm">Réinitialiser les filtres</span>
          </button>
        </div>

        {/* Bottom Row: Quick Toggles & Action */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-3 border-t border-border">
          {/* Rendez-vous / Rappels toggle */}
          <button
            id="leads-toggle-rappels"
            type="button"
            onClick={() => setShowRappels((v) => !v)}
            className={[
              "btn-secondary text-xs h-8 px-2.5 sm:px-3 flex items-center justify-center gap-1.5 transition-colors",
              showRappels ? "bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100" : "",
            ].join(" ")}
            aria-pressed={showRappels}
            title="Rendez-vous / Rappels"
          >
            <CalendarClock size={14} aria-hidden="true" className={showRappels ? "text-amber-700" : ""} />
            <span className="hidden sm:inline">Rendez-vous / Rappels</span>
            {rappelsCount > 0 && (
              <span className={showRappels ? "text-amber-800 font-semibold" : "text-text-subtle"}>
                {rappelsCount}
              </span>
            )}
          </button>

          {/* Nouveaux toggle */}
          <button
            id="leads-toggle-nouveaux"
            type="button"
            onClick={() => setShowNouveaux((v) => !v)}
            className={[
              "btn-secondary text-xs h-8 px-2.5 sm:px-3 flex items-center justify-center gap-1.5 transition-colors",
              showNouveaux ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100" : "",
            ].join(" ")}
            aria-pressed={showNouveaux}
            title="Nouveaux"
          >
            <Bell size={14} aria-hidden="true" />
            <span className="hidden sm:inline">Nouveaux</span>
            {nouveauxCount > 0 && (
              <span className={showNouveaux ? "text-blue-700" : "text-text-subtle"}>
                {nouveauxCount}
              </span>
            )}
          </button>

          {/* En retard toggle */}
          <button
            id="leads-toggle-retard"
            type="button"
            onClick={() => setShowEnRetard((v) => !v)}
            className={[
              "btn-secondary text-xs h-8 px-2.5 sm:px-3 flex items-center justify-center gap-1.5 transition-colors",
              showEnRetard ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100" : "",
            ].join(" ")}
            aria-pressed={showEnRetard}
            title="En retard"
          >
            <Clock size={14} aria-hidden="true" />
            <span className="hidden sm:inline">En retard</span>
            {retardCount > 0 && (
              <span className={showEnRetard ? "text-red-700" : "text-text-subtle"}>
                {retardCount}
              </span>
            )}
          </button>

          {/* Doublon toggle */}
          <button
            id="leads-toggle-doublons"
            type="button"
            onClick={() => setShowDoublons((v) => !v)}
            className={[
              "hidden sm:flex btn-secondary text-xs h-8 px-3 items-center gap-1.5 transition-colors",
              showDoublons ? "bg-surface-subtle" : "",
            ].join(" ")}
            aria-pressed={showDoublons}
          >
            <Copy size={14} aria-hidden="true" />
            Doublons
            {doublonCount > 0 && (
              <span className="text-text-subtle">({doublonCount})</span>
            )}
          </button>

          <div className="flex-1" />

          {/* Count */}
          <span className="text-xs text-text-subtle tabular-nums mr-2 hidden sm:block">
            {isFiltered
              ? `${totalFiltered} / ${totalActive} leads`
              : `${totalActive} lead${totalActive !== 1 ? "s" : ""}`}
          </span>

          {/* Add Lead */}
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="btn-primary text-xs h-8 px-2 sm:px-3 flex items-center justify-center gap-1.5"
            title="Ajouter un lead"
          >
            <Plus size={14} aria-hidden="true" />
            <span className="hidden sm:inline">Ajouter un lead</span>
          </button>
        </div>
      </div>

      {/* ── Archive error banner ── */}
      {archiveError && (
        <div className="flex items-center gap-2 px-3 py-2 border border-border rounded bg-surface-muted shrink-0">
          <AlertTriangle
            size={14}
            className="text-text-muted flex-shrink-0"
            aria-hidden="true"
          />
          <span className="text-sm text-text flex-1">{archiveError}</span>
          <button
            type="button"
            onClick={() => setArchiveError(null)}
            className="text-text-subtle hover:text-text transition-colors"
            aria-label="Fermer"
          >
            <X size={13} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* ── Master-Detail layout ── */}
      <div className="flex gap-0 flex-1 min-h-0">
        {/* ── LEFT: Table ── */}
        <div
          className={[
            "card overflow-hidden transition-all duration-200 flex-shrink-0 w-full",
            selectedLead ? "lg:w-[58%] min-w-0" : "",
          ].join(" ")}
        >
          <div className="overflow-auto h-full">
            <table
              className="w-full text-sm"
              aria-label="Liste des leads"
            >
              <thead>
                <tr className="border-b border-border bg-surface-muted sticky top-0 z-10">
                  <SortTh
                    label="Nom"
                    col="nom"
                    currentKey={sortKey}
                    dir={sortDir}
                    onSort={toggleSort}
                    className="pl-2 sm:pl-4"
                  />
                  <SortTh
                    label="Statut"
                    col="statut"
                    currentKey={sortKey}
                    dir={sortDir}
                    onSort={toggleSort}
                  />
                  <th className="px-2 sm:px-3 py-2 sm:py-2.5 text-left text-xs font-medium text-text-muted whitespace-nowrap">
                    Ville
                  </th>
                  <SortTh
                    label="Date"
                    col="dateFormulaire"
                    currentKey={sortKey}
                    dir={sortDir}
                    onSort={toggleSort}
                    className="hidden sm:table-cell"
                  />
                  <th className="px-2 sm:px-3 py-2 sm:py-2.5 text-left text-xs font-medium text-text-muted w-12 sm:w-14">
                    <span className="sr-only">Alertes</span>
                  </th>
                </tr>
              </thead>
              <tbody ref={tableBodyRef}>
                {displayedLeads.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-14 text-center text-sm text-text-muted"
                    >
                      {isFiltered
                        ? "Aucun lead ne correspond aux filtres."
                        : "Aucun lead actif."}
                    </td>
                  </tr>
                ) : (
                  displayedLeads.map((lead) => {
                    const alerts = getLeadAlerts(lead);
                    const isSelected =
                      selectedLead?.leadId === lead.leadId;

                    const hasOverdueRelance = alerts.some(
                      (a) => a.kind === "relance-en-retard"
                    );
                    const hasNeverContacted = alerts.some(
                      (a) => a.kind === "jamais-contacte"
                    );
                    const isDue = isRappelDue(lead);
                    const isToday = isRappelToday(lead);
                    const hasRappel = hasActiveRappel(lead);

                    let rowBgClass = "hover:bg-surface-muted";
                    if (isSelected) {
                      rowBgClass = "bg-surface-subtle";
                    } else if (isDue) {
                      rowBgClass = "bg-rose-50/40 hover:bg-rose-50/60";
                    } else if (isToday) {
                      rowBgClass = "bg-amber-50/40 hover:bg-amber-50/60";
                    } else if (hasOverdueRelance) {
                      rowBgClass =
                        "bg-rose-50/40 hover:bg-rose-50/60";
                    } else if (hasNeverContacted) {
                      rowBgClass =
                        "bg-amber-50/40 hover:bg-amber-50/60";
                    }

                    return (
                      <tr
                        key={lead.leadId}
                        onClick={() =>
                          setSelectedLead(
                            isSelected ? null : lead
                          )
                        }
                        className={[
                          "border-b border-border last:border-b-0 cursor-pointer transition-colors",
                          rowBgClass,
                          isSelected
                            ? "border-l-2 border-l-accent"
                            : isDue
                            ? "border-l-2 border-l-rose-500"
                            : isToday
                            ? "border-l-2 border-l-amber-500"
                            : "border-l-2 border-l-transparent",
                        ].join(" ")}
                        tabIndex={0}
                        role="button"
                        aria-label={`Ouvrir la fiche de ${lead.nom}`}
                        aria-pressed={isSelected}
                        onKeyDown={(e) => {
                          if (
                            e.key === "Enter" ||
                            e.key === " "
                          ) {
                            e.preventDefault();
                            setSelectedLead(
                              isSelected ? null : lead
                            );
                          }
                        }}
                      >
                        {/* Nom */}
                        <td className="px-2 sm:px-3 py-2 sm:py-2.5 pl-2 sm:pl-4 font-medium text-text max-w-[120px] sm:max-w-[200px]">
                          <div className="flex flex-col gap-0.5">
                            <span className="truncate">{lead.nom || "—"}</span>
                            {hasRappel && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <span
                                  className={[
                                    "inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border font-medium truncate max-w-[110px] sm:max-w-[190px]",
                                    isDue
                                      ? "bg-rose-50 text-rose-700 border-rose-200"
                                      : isToday
                                      ? "bg-amber-50 text-amber-800 border-amber-200"
                                      : "bg-blue-50 text-blue-700 border-blue-200",
                                  ].join(" ")}
                                  title={`${fmtRappelDateTime(lead.rappelDate)}${lead.rappelNote ? ` · ${lead.rappelNote}` : ""}`}
                                >
                                  <CalendarClock size={10} className="flex-shrink-0" />
                                  <span className="font-semibold whitespace-nowrap">{fmtRappelDateTime(lead.rappelDate)}</span>
                                  {lead.rappelNote && (
                                    <span className="truncate opacity-85">· {lead.rappelNote}</span>
                                  )}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                        {/* Statut */}
                        <td className="px-2 sm:px-3 py-2 sm:py-2.5">
                          {lead.statut ? (
                            <span
                              className={[
                                "text-[10px] border rounded px-1.5 py-0.5 font-medium whitespace-nowrap",
                                STATUS_STYLES[lead.statut] ||
                                  "bg-surface-muted text-text-muted border-border",
                              ].join(" ")}
                            >
                              {lead.statut}
                            </span>
                          ) : (
                            <span className="text-text-subtle">
                              —
                            </span>
                          )}
                        </td>
                        {/* Ville */}
                        <td className="px-2 sm:px-3 py-2 sm:py-2.5 text-text-muted text-xs truncate max-w-[60px] sm:max-w-none">
                          {lead.ville || "—"}
                        </td>
                        {/* Date formulaire */}
                        <td className="hidden sm:table-cell px-2 sm:px-3 py-2 sm:py-2.5 text-text-muted tabular-nums whitespace-nowrap text-xs">
                          {fmtDate(lead.dateFormulaire)}
                        </td>
                        {/* Alert badges & First contact */}
                        <td className="px-2 sm:px-3 py-2 sm:py-2.5 text-right w-12 sm:w-14">
                          <div className="flex items-center justify-end gap-1.5">
                            {lead.statut === "Nouveau" && (
                              <RelanceVariationsModal
                                relanceType="nouveau"
                                phoneNumber={lead.telephone}
                                customTrigger={
                                  <span
                                    title="Premier contact"
                                    aria-label="Premier contact"
                                    className="inline-flex items-center text-blue-500 hover:text-blue-600 hover:scale-125 transition-all duration-200"
                                  >
                                    <MessageCircle size={13} aria-hidden="true" />
                                  </span>
                                }
                              />
                            )}
                            <AlertBadges lead={lead} alerts={alerts} />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── RIGHT: Detail Card ── */}
        {selectedLead ? (
          <>
            {/* Mobile Modal Overlay */}
            <div 
              className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
              onClick={() => setSelectedLead(null)} 
              aria-hidden="true" 
            />
            {/* Detail Card Container */}
            <div className="fixed inset-x-4 sm:inset-x-[10%] top-[5vh] bottom-[5vh] z-50 bg-surface rounded-xl shadow-2xl flex flex-col overflow-hidden lg:static lg:inset-auto lg:z-auto lg:flex-1 lg:min-w-[320px] lg:border-l-0 lg:rounded-none lg:shadow-none lg:min-h-0">
              <LeadDetailCard
                lead={selectedLead}
                onClose={() => setSelectedLead(null)}
                onArchiveRequest={handleArchiveRequest}
                archiveConfirmId={archiveConfirmId}
                archivingId={archivingId}
                onArchiveConfirm={handleArchiveConfirm}
                onArchiveCancel={handleArchiveCancel}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 min-w-[320px] hidden lg:flex items-center justify-center border-l border-border bg-surface-muted/50 rounded-r">
            <div className="text-center px-6">
              <Users
                size={32}
                className="mx-auto mb-3 text-text-subtle"
                aria-hidden="true"
              />
              <p className="text-sm text-text-muted font-medium">
                Sélectionnez un lead
              </p>
              <p className="text-xs text-text-subtle mt-1">
                Cliquez sur un lead dans la liste pour voir ses détails
                et les modifier.
              </p>
              <p className="text-[10px] text-text-subtle mt-2">
                Utilisez ↑ ↓ pour naviguer
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Create Modal ── */}
      {isCreateOpen && (
        <LeadCreateModal onClose={() => setIsCreateOpen(false)} />
      )}
    </div>
  );
}

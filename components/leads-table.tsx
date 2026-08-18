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
} from "lucide-react";
import type { Lead, LeadAlert, LeadAlertKind } from "@/types";
import { getLeadAlerts } from "@/lib/lead-alerts";
import { LeadDetailCard } from "@/components/lead-detail-card";
import { LeadCreateModal } from "@/components/lead-create-modal";

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

// ---------------------------------------------------------------------------
// Alert badges (in table row)
// ---------------------------------------------------------------------------

function AlertBadges({ alerts }: { alerts: LeadAlert[] }) {
  if (alerts.length === 0) return null;
  return (
    <div className="flex items-center gap-1">
      {alerts.map((a) => {
        const { icon: Icon, title, colorClass } = ALERT_META[a.kind];
        return (
          <span
            key={a.kind}
            title={title}
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
        "px-3 py-2.5 text-left whitespace-nowrap",
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
  const [showDoublons, setShowDoublons] = useState(false);
  const [showNouveaux, setShowNouveaux] = useState(
    !initialFilter || initialFilter === "nouveaux"
  );
  const [showEnRetard, setShowEnRetard] = useState(
    !initialFilter || initialFilter === "retard"
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
    } else if (filterQuery === "retard") {
      setShowEnRetard(true);
      setShowNouveaux(false);
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

    // Text search: nom, téléphone, ville
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (l) =>
          l.nom.toLowerCase().includes(q) ||
          l.telephone.includes(q) ||
          l.ville.toLowerCase().includes(q)
      );
    }

    // Sort
    const sorted = [...result].sort((a, b) => {
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
    showDoublons,
    showNouveaux,
    showEnRetard,
    sortKey,
    sortDir,
  ]);

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
        {/* Top Row: Search & Dropdowns */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Text search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
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
        </div>

        {/* Bottom Row: Quick Toggles & Action */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-border">
          {/* Nouveaux toggle */}
          <button
            id="leads-toggle-nouveaux"
            type="button"
            onClick={() => setShowNouveaux((v) => !v)}
            className={[
              "btn-secondary text-xs h-8 px-3 flex items-center gap-1.5 transition-colors",
              showNouveaux ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100" : "",
            ].join(" ")}
            aria-pressed={showNouveaux}
          >
            <Bell size={12} aria-hidden="true" />
            Nouveaux
            {nouveauxCount > 0 && (
              <span className={showNouveaux ? "text-blue-700" : "text-text-subtle"}>
                ({nouveauxCount})
              </span>
            )}
          </button>

          {/* En retard toggle */}
          <button
            id="leads-toggle-retard"
            type="button"
            onClick={() => setShowEnRetard((v) => !v)}
            className={[
              "btn-secondary text-xs h-8 px-3 flex items-center gap-1.5 transition-colors",
              showEnRetard ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100" : "",
            ].join(" ")}
            aria-pressed={showEnRetard}
          >
            <Clock size={12} aria-hidden="true" />
            En retard
            {retardCount > 0 && (
              <span className={showEnRetard ? "text-red-700" : "text-text-subtle"}>
                ({retardCount})
              </span>
            )}
          </button>

          {/* Doublon toggle */}
          <button
            id="leads-toggle-doublons"
            type="button"
            onClick={() => setShowDoublons((v) => !v)}
            className={[
              "btn-secondary text-xs h-8 px-3 flex items-center gap-1.5 transition-colors",
              showDoublons ? "bg-surface-subtle" : "",
            ].join(" ")}
            aria-pressed={showDoublons}
          >
            <Copy size={12} aria-hidden="true" />
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
            className="btn-primary text-xs h-8 px-3 flex items-center gap-1.5"
          >
            <Plus size={14} aria-hidden="true" />
            Ajouter un lead
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
            "card overflow-hidden transition-all duration-200 flex-shrink-0",
            selectedLead
              ? "w-[58%] min-w-0"
              : "w-full",
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
                    className="pl-4"
                  />
                  <SortTh
                    label="Statut"
                    col="statut"
                    currentKey={sortKey}
                    dir={sortDir}
                    onSort={toggleSort}
                  />
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-text-muted whitespace-nowrap">
                    Ville
                  </th>
                  <SortTh
                    label="Date"
                    col="dateFormulaire"
                    currentKey={sortKey}
                    dir={sortDir}
                    onSort={toggleSort}
                  />
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-text-muted w-14">
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

                    let rowBgClass = "hover:bg-surface-muted";
                    if (isSelected) {
                      rowBgClass = "bg-surface-subtle";
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
                        <td className="px-3 py-2.5 pl-4 font-medium text-text max-w-[160px] truncate">
                          {lead.nom || "—"}
                        </td>
                        {/* Statut */}
                        <td className="px-3 py-2.5">
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
                        <td className="px-3 py-2.5 text-text-muted text-xs">
                          {lead.ville || "—"}
                        </td>
                        {/* Date formulaire */}
                        <td className="px-3 py-2.5 text-text-muted tabular-nums whitespace-nowrap text-xs">
                          {fmtDate(lead.dateFormulaire)}
                        </td>
                        {/* Alert badges */}
                        <td className="px-3 py-2.5">
                          <AlertBadges alerts={alerts} />
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
          <div className="flex-1 min-w-[320px] border-l-0 overflow-hidden flex flex-col min-h-0">
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

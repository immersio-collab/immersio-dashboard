"use client";

/**
 * components/table/index.tsx — Briques communes aux cinq tableaux.
 *
 * Les modules ont été construits l'un après l'autre et chacun avait inventé
 * ses conventions : le tri n'existait que sur les leads, la confirmation de
 * suppression tantôt en dialogue soigné tantôt en `confirm()` du navigateur,
 * aucun export, aucune pagination. Plutôt que de fondre 6 600 lignes de
 * tableaux qui fonctionnent dans une abstraction unique — un risque de
 * régression disproportionné — chaque module adopte ces briques.
 */

import { useMemo, useState } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, ChevronsUpDown, Download, Loader2, X } from "lucide-react";

import { downloadCsv, type CsvColumn } from "@/lib/csv";

// ---------------------------------------------------------------------------
// Export CSV
// ---------------------------------------------------------------------------

/**
 * Bouton d'export. Exporte ce qui est affiché — la vue filtrée, pas la table
 * entière : c'est ce que l'utilisateur voit et donc ce qu'il croit exporter.
 */
export function ExportCsvButton<T>({
  rows,
  columns,
  fileNamePrefix,
  label = "Exporter",
}: {
  rows: ReadonlyArray<T>;
  columns: ReadonlyArray<CsvColumn<T>>;
  fileNamePrefix: string;
  label?: string;
}) {
  const disabled = rows.length === 0;
  return (
    <button
      type="button"
      onClick={() => downloadCsv(rows, columns, fileNamePrefix)}
      disabled={disabled}
      title={
        disabled
          ? "Rien à exporter avec ces filtres"
          : `Exporter ${rows.length} ligne${rows.length > 1 ? "s" : ""} au format CSV`
      }
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border text-text-muted hover:text-text hover:bg-surface-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
    >
      <Download className="w-3.5 h-3.5" />
      {label}
      {!disabled && <span className="tabular-nums text-text-subtle">({rows.length})</span>}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Tri
// ---------------------------------------------------------------------------

export type SortDir = "asc" | "desc";

export interface SortState<K extends string> {
  key: K | null;
  dir: SortDir;
}

/**
 * État de tri et comparateur associé.
 *
 * Le tri est stable et localisé : `localeCompare` avec la locale française
 * classe « Événementiel » et « Ecole » comme les attend un lecteur français,
 * ce qu'un tri par point de code ne fait pas.
 */
export function useSort<T, K extends string>(
  rows: ReadonlyArray<T>,
  accessors: Record<K, (row: T) => string | number | null | undefined>,
  initial: SortState<K> = { key: null, dir: "asc" }
) {
  const [sort, setSort] = useState<SortState<K>>(initial);

  const toggle = (key: K) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));

  const sorted = useMemo(() => {
    if (!sort.key) return rows;
    const get = accessors[sort.key];
    const factor = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = get(a);
      const vb = get(b);
      // Les valeurs vides finissent toujours en bas, quel que soit le sens :
      // une cellule non renseignée n'est pas « la plus petite », elle est absente.
      const ea = va === null || va === undefined || va === "";
      const eb = vb === null || vb === undefined || vb === "";
      if (ea && eb) return 0;
      if (ea) return 1;
      if (eb) return -1;
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * factor;
      return String(va).localeCompare(String(vb), "fr", { numeric: true }) * factor;
    });
  }, [rows, sort, accessors]);

  return { sort, toggle, sorted };
}

/** En-tête de colonne cliquable. */
export function SortHeader<K extends string>({
  label,
  sortKey,
  sort,
  onToggle,
  align = "left",
  className = "",
}: {
  label: string;
  sortKey: K;
  sort: SortState<K>;
  onToggle: (key: K) => void;
  align?: "left" | "right";
  className?: string;
}) {
  const active = sort.key === sortKey;
  const Icon = !active ? ChevronsUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th className={`px-3 py-2 font-medium whitespace-nowrap ${className}`} aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        onClick={() => onToggle(sortKey)}
        className={`inline-flex items-center gap-1 hover:text-text transition-colors ${
          align === "right" ? "flex-row-reverse" : ""
        } ${active ? "text-text" : ""}`}
        title={`Trier par ${label.toLowerCase()}`}
      >
        {label}
        <Icon className={`w-3 h-3 ${active ? "opacity-100" : "opacity-40"}`} />
      </button>
    </th>
  );
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export const PAGE_SIZE = 25;

/** Découpe une liste en pages et se recale si les filtres la raccourcissent. */
export function usePagination<T>(rows: ReadonlyArray<T>, pageSize = PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  // Filtrer alors qu'on est page 4 laisserait un tableau vide : on revient
  // sur la dernière page existante plutôt que d'afficher du néant.
  const current = Math.min(page, pageCount);
  const slice = useMemo(
    () => rows.slice((current - 1) * pageSize, current * pageSize),
    [rows, current, pageSize]
  );
  return { page: current, setPage, pageCount, slice, total: rows.length, pageSize };
}

export function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  onChange,
  noun = "élément",
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
  /** Singulier ; le pluriel ajoute un « s ». */
  noun?: string;
}) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between gap-3 px-1 py-2 flex-shrink-0">
      <span className="text-[11px] text-text-muted tabular-nums">
        {from}–{to} sur {total} {noun}
        {total > 1 ? "s" : ""}
      </span>
      {pageCount > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onChange(page - 1)}
            disabled={page <= 1}
            className="px-2 py-1 text-[11px] rounded border border-border text-text-muted hover:text-text hover:bg-surface-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Précédent
          </button>
          <span className="text-[11px] text-text-muted tabular-nums px-1.5">
            {page} / {pageCount}
          </span>
          <button
            type="button"
            onClick={() => onChange(page + 1)}
            disabled={page >= pageCount}
            className="px-2 py-1 text-[11px] rounded border border-border text-text-muted hover:text-text hover:bg-surface-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Confirmation
// ---------------------------------------------------------------------------

/**
 * Dialogue de confirmation générique.
 *
 * Remplace les `confirm()` du navigateur : non traduisible, non stylé,
 * bloquant, et impossible à tester. C'était la suppression définitive d'un
 * devis qui passait par le dialogue le moins soigné de l'application.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  pendingLabel,
  isPending,
  onConfirm,
  onCancel,
  tone = "danger",
}: {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  pendingLabel?: string;
  isPending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  tone?: "danger" | "neutral";
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md bg-surface border border-border rounded-xl shadow-2xl"
      >
        <div className="flex items-start gap-3 p-5 border-b border-border">
          <div
            className={`p-2 rounded-lg flex-shrink-0 border ${
              tone === "danger"
                ? "bg-amber-50 border-amber-200 text-amber-700"
                : "bg-surface-muted border-border text-text-muted"
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
          </div>
          <h2 className="flex-1 text-sm font-semibold text-text pt-1">{title}</h2>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded text-text-muted hover:text-text hover:bg-surface-muted"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 text-xs text-text-muted leading-relaxed space-y-2">{message}</div>

        <div className="flex justify-end gap-2 p-4 border-t border-border">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-border text-text-muted hover:text-text hover:bg-surface-muted transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-accent text-accent-foreground hover:bg-accent-hover transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
            {isPending ? (pendingLabel ?? "En cours…") : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

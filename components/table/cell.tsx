"use client";

/**
 * components/table/cell.tsx — Cellules dont le contenu tronqué reste lisible.
 *
 * Les tableaux coupent les valeurs longues (« Cabinet de Gastro-entéro… », une
 * URL RealSee, une note de relance) sans aucun moyen de voir la suite : il
 * fallait ouvrir la fiche pour lire une cellule. Un clic ouvre désormais la
 * valeur entière, avec de quoi la copier.
 */

import { useEffect, useState } from "react";
import { Check, Copy, X } from "lucide-react";

interface CellValue {
  /** En-tête de la colonne, affiché comme titre du panneau. */
  label: string;
  /** Contexte : de quelle ligne vient cette valeur. */
  context?: string;
  value: string;
}

/**
 * Cellule cliquable.
 *
 * Ne devient interactive que si elle a quelque chose à révéler : rendre
 * cliquable une cellule déjà entièrement lisible promet une action qui
 * n'apporte rien. Le seuil est volontairement bas — une valeur de plus de
 * 28 caractères est presque toujours tronquée aux largeurs de ces tableaux.
 */
export function ExpandableCell({
  label,
  value,
  context,
  onOpen,
  className = "",
  children,
}: {
  label: string;
  value: string | null | undefined;
  context?: string;
  onOpen: (cell: CellValue) => void;
  className?: string;
  children?: React.ReactNode;
}) {
  const text = (value ?? "").trim();
  const worthExpanding = text.length > 28 || text.includes("\n");

  if (!worthExpanding) {
    return <span className={className}>{children ?? (text || "—")}</span>;
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpen({ label, value: text, context });
      }}
      title="Voir le contenu complet"
      className={`text-left hover:text-accent hover:underline decoration-dotted underline-offset-2 transition-colors ${className}`}
    >
      {children ?? text}
    </button>
  );
}

/** Panneau affichant une cellule en entier. */
export function CellViewer({ cell, onClose }: { cell: CellValue | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCopied(false);
  }, [cell]);

  useEffect(() => {
    if (!cell) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [cell, onClose]);

  if (!cell) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(cell!.value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Presse-papier refusé (contexte non sécurisé) : le texte reste
      // sélectionnable à la main, inutile d'alerter.
    }
  }

  const isUrl = /^https?:\/\//i.test(cell.value);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={cell.label}
        className="w-full max-w-lg bg-surface border border-border rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 px-5 py-4 border-b border-border">
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-text">{cell.label}</h2>
            {cell.context && (
              <p className="text-[11px] text-text-subtle mt-0.5 truncate">{cell.context}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-text-muted hover:text-text hover:bg-surface-muted flex-shrink-0"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 max-h-[55vh] overflow-y-auto">
          {isUrl ? (
            <a
              href={cell.value}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-accent hover:underline break-all"
            >
              {cell.value}
            </a>
          ) : (
            <p className="text-sm text-text whitespace-pre-wrap break-words leading-relaxed">
              {cell.value}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-border">
          <span className="text-[11px] text-text-subtle tabular-nums">
            {cell.value.length} caractères
          </span>
          <button
            type="button"
            onClick={copy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border text-text-muted hover:text-text hover:bg-surface-muted transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copié" : "Copier"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** État partagé par une table pour piloter le panneau. */
export function useCellViewer() {
  const [cell, setCell] = useState<CellValue | null>(null);
  return { cell, open: setCell, close: () => setCell(null) };
}

export type { CellValue };

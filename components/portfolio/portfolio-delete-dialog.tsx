"use client";

import { AlertTriangle, X } from "lucide-react";
import type { PortfolioProjectRecord } from "@/types";

export function PortfolioDeleteDialog({
  project,
  isDeleting,
  onConfirm,
  onCancel,
}: {
  project: PortfolioProjectRecord | null;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!project) return null;

  const locale = project.language === "French" ? "fr" : "en";
  const publicPath = project.language === "French" ? "portfolio" : "our-work";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="w-full max-w-md bg-surface border border-border rounded-xl shadow-2xl">
        <div className="flex items-start gap-3 p-5 border-b border-border">
          <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-600 flex-shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-text">Archiver ce projet ?</h2>
            <p className="text-xs text-text-muted mt-1 break-words">{project.name}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded text-text-muted hover:text-text hover:bg-surface-muted"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {/* Archiver = soft-delete : conservé dans Supabase, retiré du
              dashboard, du site et du sitemap. L'URL publique devient une 404. */}
          <p className="text-xs text-text-muted leading-relaxed">
            Le projet sera <strong className="text-text">archivé</strong> : il reste conservé
            dans Supabase mais disparaît du dashboard et du site. L&apos;URL{" "}
            <span className="text-accent break-all">
              /{locale}/{publicPath}/{project.slug}
            </span>{" "}
            est référencée par Google et deviendra une 404.
          </p>
          {/* Deleting one half of a pair also strips the survivor's hreflang. */}
          <p className="text-xs text-text-muted leading-relaxed">
            Sa version dans l&apos;autre langue perdra aussi sa balise hreflang et se retrouvera
            déclarée sans traduction.
          </p>
          <p className="text-xs text-text-muted leading-relaxed">
            Pour retirer le projet du site sans casser son référencement, passe plutôt son statut en{" "}
            <strong className="text-text">Brouillon</strong>.
          </p>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-border">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-border text-text-muted hover:text-text hover:bg-surface-muted transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {isDeleting ? "Archivage…" : "Archiver le projet"}
          </button>
        </div>
      </div>
    </div>
  );
}

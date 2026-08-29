"use client";

import { AlertTriangle, X } from "lucide-react";
import type { BlogPostRecord } from "@/types";
import type { Pair } from "@/lib/pairing";

/**
 * Confirmation d'archivage d'un article.
 *
 * L'article est archivé dans ses deux langues : n'en retirer qu'une laisserait
 * la survivante se déclarer traduite d'une page devenue 404.
 */
export function BlogDeleteDialog({
  pair,
  isDeleting,
  onConfirm,
  onCancel,
}: {
  pair: Pair<BlogPostRecord> | null;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!pair) return null;

  const sides = [pair.fr, pair.en].filter(Boolean) as BlogPostRecord[];
  const main = sides[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="w-full max-w-md bg-surface border border-border rounded-xl shadow-2xl">
        <div className="flex items-start gap-3 p-5 border-b border-border">
          <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-600 flex-shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-text">Archiver cet article ?</h2>
            <p className="text-xs text-text-muted mt-1 break-words">{main.name}</p>
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
          <p className="text-xs text-text-muted leading-relaxed">
            L&apos;article sera <strong className="text-text">archivé</strong> dans{" "}
            {sides.length > 1 ? "ses deux langues" : "sa seule langue"} : il reste conservé dans
            Supabase mais disparaît du dashboard, du site et du sitemap.
          </p>

          <ul className="space-y-1">
            {sides.map((p) => (
              <li key={p.id} className="text-xs text-text-muted leading-relaxed">
                <span className="text-accent break-all">
                  /{p.language === "French" ? "fr" : "en"}/blog/{p.slug}
                </span>{" "}
                deviendra une 404.
              </li>
            ))}
          </ul>

          <p className="text-xs text-text-muted leading-relaxed">
            Pour retirer l&apos;article du site sans l&apos;archiver, passe plutôt son statut en{" "}
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
            {isDeleting ? "Archivage…" : "Archiver l’article"}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import type { Tour } from "@/types";

interface TourDeleteDialogProps {
  tour: Tour | null;
  isOpen: boolean;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function TourDeleteDialog({
  tour,
  isOpen,
  isDeleting,
  onClose,
  onConfirm,
}: TourDeleteDialogProps) {
  if (!isOpen || !tour) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-surface border border-border rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center gap-3 text-red-400">
          <div className="p-2.5 rounded-full bg-red-500/10 border border-red-500/20 flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="font-semibold text-text text-base">Supprimer la visite virtuelle</h3>
            <p className="text-xs text-text-muted mt-0.5">Cette action est irréversible.</p>
          </div>
        </div>

        <p className="text-sm text-text-muted leading-relaxed">
          Êtes-vous sûr de vouloir supprimer le tour{" "}
          <strong className="text-text font-medium">{tour.property_name}</strong> (slug:{" "}
          <code className="text-xs text-accent px-1.5 py-0.5 rounded bg-surface-subtle font-mono">
            {tour.slug}
          </code>
          ) ?
        </p>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium rounded-lg text-text-muted hover:text-text hover:bg-surface-muted transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Suppression...</span>
              </>
            ) : (
              <span>Supprimer définitivement</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

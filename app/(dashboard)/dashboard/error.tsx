"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="bg-surface-muted p-4 rounded-full mb-4 border border-border">
        <AlertTriangle size={32} className="text-text-muted" aria-hidden="true" />
      </div>
      <h2 className="text-lg font-medium text-text mb-2">Impossible de charger les données</h2>
      <p className="text-sm text-text-subtle mb-6 max-w-md">
        Une erreur s&apos;est produite lors de la connexion à la base de données. Veuillez réessayer ou vérifier votre configuration.
      </p>
      <button
        onClick={() => reset()}
        className="btn-primary text-sm px-4 py-2 flex items-center gap-2"
      >
        <RefreshCw size={14} aria-hidden="true" />
        Réessayer
      </button>
    </div>
  );
}

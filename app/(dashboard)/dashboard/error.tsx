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
      <h2 className="text-lg font-medium text-text mb-2">Cette page n&apos;a pas pu s&apos;afficher</h2>
      {/* Le message annonçait une panne de base de données pour n'importe
          quelle erreur, y compris de rendu — il envoyait chercher au mauvais
          endroit. Il reste vague sur la cause, mais ne l'invente plus, et
          affiche le digest qui permet de retrouver l'erreur dans les logs. */}
      <p className="text-sm text-text-subtle mb-6 max-w-md">
        Une erreur inattendue s&apos;est produite. Réessayez ; si elle persiste, communiquez la
        référence ci-dessous.
      </p>
      {error.digest && (
        <p className="text-[11px] font-mono text-text-subtle mb-6">Référence : {error.digest}</p>
      )}
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

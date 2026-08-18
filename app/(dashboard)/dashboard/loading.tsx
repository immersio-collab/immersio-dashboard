import { Users, RefreshCw, Copy, Clock } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="space-y-8 max-w-4xl animate-pulse">
      <section aria-label="Compteurs en cours de chargement">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[Users, RefreshCw, Copy, Clock].map((Icon, i) => (
            <div key={i} className="card p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="h-3 w-20 bg-surface-muted rounded" />
                <Icon size={15} className="text-text-subtle/50 flex-shrink-0" aria-hidden="true" />
              </div>
              <div className="h-8 w-12 bg-surface-muted rounded" />
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="h-4 w-32 bg-surface-muted rounded" />
        </div>
        <div className="card overflow-hidden">
          <ul role="list">
            {[1, 2, 3].map((i) => (
              <li key={i} className="flex items-start gap-4 px-4 py-4 border-b border-border last:border-b-0">
                <div className="h-3 w-3 bg-surface-muted rounded-full mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-baseline gap-2">
                    <div className="h-4 w-32 bg-surface-muted rounded" />
                    <div className="h-3 w-20 bg-surface-muted rounded" />
                  </div>
                  <div className="h-3 w-48 bg-surface-muted rounded" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

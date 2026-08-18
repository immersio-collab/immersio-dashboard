export default function LeadsLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Filter bar skeleton */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="h-9 w-48 bg-surface-muted rounded border border-border" />
        <div className="h-9 w-32 bg-surface-muted rounded border border-border" />
        <div className="h-9 w-32 bg-surface-muted rounded border border-border" />
        <div className="h-9 w-24 bg-surface-muted rounded border border-border" />
        <div className="h-4 w-20 bg-surface-muted rounded ml-auto" />
      </div>

      {/* Table skeleton */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted">
                {["Nom", "Téléphone", "Ville", "Canal", "Statut", "Date", "Alertes"].map((col, i) => (
                  <th key={i} className="px-3 py-2.5 text-left text-xs text-text-muted">
                    {col}
                  </th>
                ))}
                <th className="w-24" />
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <tr key={i} className="border-b border-border last:border-b-0">
                  <td className="px-3 py-3 pl-4"><div className="h-4 w-32 bg-surface-muted rounded" /></td>
                  <td className="px-3 py-3"><div className="h-4 w-24 bg-surface-muted rounded" /></td>
                  <td className="px-3 py-3"><div className="h-4 w-20 bg-surface-muted rounded" /></td>
                  <td className="px-3 py-3"><div className="h-4 w-16 bg-surface-muted rounded" /></td>
                  <td className="px-3 py-3"><div className="h-5 w-20 bg-surface-muted rounded-full" /></td>
                  <td className="px-3 py-3"><div className="h-4 w-20 bg-surface-muted rounded" /></td>
                  <td className="px-3 py-3"><div className="h-4 w-12 bg-surface-muted rounded" /></td>
                  <td className="px-3 py-3"><div className="h-4 w-8 bg-surface-muted rounded ml-auto" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FileText, Plus, Search, Archive, Eye, Download, Loader2, Pencil } from "lucide-react";
import type { DevisRecord } from "@/types";
import { DEVIS_STATUTS } from "@/types";
import { computeStats } from "@/lib/devis";
import { fmt } from "@/lib/devis-pricing";
import { buildDevisPdf, devisFileName } from "@/lib/devis-pdf";
import { devisDataFromRecord } from "@/lib/devis-record";
import {
  ConfirmDialog,
  ExportCsvButton,
  onRowClick,
  Pagination,
  SortHeader,
  usePagination,
  useSort,
} from "@/components/table";
import type { CsvColumn } from "@/lib/csv";
import { DevisForm } from "./devis-form";

type DevisSortKey = "devis_number" | "client_nom" | "total_ttc" | "created_at" | "statut";

/** Colonnes de l'export — l'ordre est celui du tableau. */
const CSV_COLUMNS: ReadonlyArray<CsvColumn<DevisRecord>> = [
  { header: "N° devis", value: (d) => d.devis_number },
  { header: "Client", value: (d) => d.client_nom },
  { header: "Téléphone", value: (d) => d.client_tel },
  { header: "Email", value: (d) => d.client_email },
  { header: "Ville", value: (d) => d.client_ville },
  { header: "Type de bien", value: (d) => d.type_bien },
  { header: "Superficie", value: (d) => d.superficie },
  { header: "Prix Tour 3D", value: (d) => d.tour3d_price },
  { header: "Options", value: (d) => d.options_selected },
  { header: "Hébergement", value: (d) => d.hebergement_duree },
  { header: "Prix hébergement", value: (d) => d.hebergement_price },
  { header: "Remise %", value: (d) => d.remise_pct },
  { header: "Total", value: (d) => d.total_ttc },
  { header: "Statut", value: (d) => d.statut },
  { header: "Lead lié", value: (d) => d.lead_id },
  { header: "Créé le", value: (d) => d.created_at },
];

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

const statutStyle: Record<string, string> = {
  "Accepté": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "En attente": "bg-amber-50 text-amber-800 border-amber-200",
  "Refusé": "bg-red-50 text-red-700 border-red-200",
};

export function DevisTable({ initialDevis }: { initialDevis: DevisRecord[] }) {
  const [devis, setDevis] = useState<DevisRecord[]>(initialDevis);
  const [query, setQuery] = useState("");
  const [statut, setStatut] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [toEdit, setToEdit] = useState<DevisRecord | null>(null);
  const [toArchive, setToArchive] = useState<DevisRecord | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // « Créer un devis » depuis une fiche lead : /dashboard/devis?lead=<leadId>
  // ouvre le formulaire avec ce lead présélectionné et pré-rempli.
  const searchParams = useSearchParams();
  const leadParam = searchParams.get("lead");
  const [prefilledLeadId, setPrefilledLeadId] = useState<string | null>(null);
  useEffect(() => {
    if (leadParam) {
      setPrefilledLeadId(leadParam);
      setFormOpen(true);
    }
  }, [leadParam]);

  function notify(m: string) {
    setToast(m);
    setTimeout(() => setToast(null), 3000);
  }

  const stats = useMemo(() => computeStats(devis), [devis]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return devis.filter((d) => {
      if (statut !== "all" && d.statut !== statut) return false;
      if (!q) return true;
      return (
        d.devis_number.toLowerCase().includes(q) ||
        d.client_nom.toLowerCase().includes(q) ||
        (d.client_ville ?? "").toLowerCase().includes(q) ||
        (d.client_email ?? "").toLowerCase().includes(q)
      );
    });
  }, [devis, query, statut]);

  const { sort, toggle, sorted } = useSort<DevisRecord, DevisSortKey>(
    visible,
    {
      devis_number: (d) => d.devis_number,
      client_nom: (d) => d.client_nom,
      total_ttc: (d) => Number(d.total_ttc || 0),
      created_at: (d) => d.created_at,
      statut: (d) => d.statut,
    },
    { key: "created_at", dir: "desc" }
  );
  const pager = usePagination(sorted);

  /**
   * Opens the quotation as a PDF.
   *
   * The archived copy wins when there is one — it is the document the client
   * received. Quotations imported from the Sheet have none, so they are
   * rebuilt from their stored figures.
   */
  function view(d: DevisRecord) {
    if (d.pdf_url) {
      window.open(d.pdf_url, "_blank", "noopener");
      return;
    }
    const url = String(buildDevisPdf(devisDataFromRecord(d)).output("bloburl"));
    window.open(url, "_blank", "noopener");
  }

  /**
   * Rebuilt rather than fetched, even when archived: a cross-origin URL
   * ignores the download attribute, so the browser would open the file
   * instead of saving it.
   */
  function download(d: DevisRecord) {
    const data = devisDataFromRecord(d);
    buildDevisPdf(data).save(devisFileName(data));
  }

  async function changeStatut(d: DevisRecord, next: string) {
    setBusyId(d.id);
    try {
      const res = await fetch(`/api/devis/${d.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut: next }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setDevis((list) => list.map((x) => (x.id === d.id ? json.data : x)));
    } catch (e) {
      notify(e instanceof Error ? e.message : "Mise à jour impossible");
    } finally {
      setBusyId(null);
    }
  }

  /** Archive (soft-delete) : le devis reste en base, il disparaît de la liste. */
  async function archiver(d: DevisRecord) {
    setBusyId(d.id);
    try {
      const res = await fetch(`/api/devis/${d.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || `HTTP ${res.status}`);
      setDevis((list) => list.filter((x) => x.id !== d.id));
      notify(`${d.devis_number} archivé`);
      setToArchive(null);
    } catch (e) {
      notify(e instanceof Error ? e.message : "Archivage impossible");
    } finally {
      setBusyId(null);
    }
  }

  const select =
    "px-2.5 py-1 text-xs bg-surface-subtle border border-border rounded-lg text-text focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent";

  return (
    <div className="space-y-3 relative flex flex-col flex-1 min-h-0">
      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] flex items-center gap-2.5 bg-surface border border-accent/40 text-text px-4 py-2.5 rounded-xl shadow-2xl">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="text-xs font-medium">{toast}</span>
        </div>
      )}

      {/* Statistiques — celles que calculait l'onglet du Sheet, qui disparaît avec lui. */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Devis", value: String(stats.total) },
          { label: "Chiffre d'affaires", value: `${fmt(stats.chiffreAffaires)} MAD` },
          { label: "Panier moyen", value: `${fmt(Math.round(stats.panierMoyen))} MAD` },
          { label: "Acceptés", value: `${stats.acceptes} / ${stats.total}` },
        ].map((s) => (
          <div key={s.label} className="bg-surface border border-border rounded-xl p-3.5">
            <div className="text-[11px] text-text-muted">{s.label}</div>
            <div className="text-sm font-semibold text-text mt-0.5 tabular-nums">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-3.5 rounded-xl border border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent/10 border border-accent/20 text-accent flex-shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-text">Devis enregistrés</h2>
            <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
              <span className="text-amber-600 font-medium">{stats.enAttente} en attente</span>
              <span>·</span>
              <span className="text-red-500">{stats.refuses} refusés</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setToEdit(null);
            setFormOpen(true);
          }}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-accent text-accent-foreground hover:bg-accent-hover transition-all shadow-sm active:scale-[0.98]"
        >
          <Plus className="w-3.5 h-3.5" />
          Nouveau devis
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 bg-surface p-2.5 rounded-xl border border-border">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-subtle" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher (numéro, client, ville, email)…"
            className="w-full pl-8 pr-4 py-1 text-xs bg-surface-subtle border border-border rounded-lg text-text placeholder:text-text-subtle focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
          />
        </div>
        <select className={select} value={statut} onChange={(e) => setStatut(e.target.value)}>
          <option value="all">Tous les statuts</option>
          {DEVIS_STATUTS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <ExportCsvButton rows={sorted} columns={CSV_COLUMNS} fileNamePrefix="devis" />
      </div>

      <div className="flex-1 min-h-0 overflow-auto bg-surface rounded-xl border border-border">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-surface-subtle border-b border-border">
            <tr className="text-left text-text-muted">
              <SortHeader label="N° devis" sortKey="devis_number" sort={sort} onToggle={toggle} />
              <SortHeader label="Client" sortKey="client_nom" sort={sort} onToggle={toggle} />
              <th className="px-3 py-2 font-medium whitespace-nowrap">Bien</th>
              <SortHeader
                label="Total HT"
                sortKey="total_ttc"
                sort={sort}
                onToggle={toggle}
                align="right"
                className="text-right"
              />
              <SortHeader label="Date" sortKey="created_at" sort={sort} onToggle={toggle} />
              <SortHeader label="Statut" sortKey="statut" sort={sort} onToggle={toggle} />
              <th className="px-3 py-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pager.slice.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-text-subtle">
                  Aucun devis ne correspond.
                </td>
              </tr>
            )}

            {pager.slice.map((d) => (
              <tr
                key={d.id}
                onClick={onRowClick(() => {
                  setToEdit(d);
                  setFormOpen(true);
                })}
                title="Ouvrir le devis"
                className="border-b border-border last:border-0 hover:bg-surface-muted/50 transition-colors cursor-pointer"
              >
                <td className="px-3 py-2 whitespace-nowrap font-mono text-[11px] text-text">{d.devis_number}</td>
                <td className="px-3 py-2 max-w-[220px]">
                  <div className="font-medium text-text truncate">{d.client_nom}</div>
                  <div className="text-text-subtle truncate text-[11px]">
                    {[d.client_ville, d.client_tel].filter(Boolean).join(" · ") || "—"}
                  </div>
                </td>
                <td className="px-3 py-2 max-w-[180px] text-text-muted">
                  <div className="truncate">
                    {[d.type_bien, d.superficie].filter(Boolean).join(" · ") || "—"}
                  </div>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-right font-semibold text-text tabular-nums">
                  {fmt(Number(d.total_ttc || 0))} MAD
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-text-muted">{formatDate(d.created_at)}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <select
                    value={d.statut}
                    disabled={busyId === d.id}
                    onChange={(e) => changeStatut(d, e.target.value)}
                    className={`px-2 py-0.5 text-[11px] font-medium rounded-md border cursor-pointer focus:outline-none ${statutStyle[d.statut] ?? "bg-slate-100 text-slate-700 border-slate-300"}`}
                  >
                    {DEVIS_STATUTS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => view(d)}
                      className="p-1.5 rounded text-text-muted hover:text-accent hover:bg-surface-muted transition-colors"
                      title={d.pdf_url ? "Ouvrir le PDF archivé" : "Ouvrir le PDF (reconstruit)"}
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => download(d)}
                      className="p-1.5 rounded text-text-muted hover:text-accent hover:bg-surface-muted transition-colors"
                      title="Télécharger le PDF"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setToEdit(d);
                        setFormOpen(true);
                      }}
                      className="p-1.5 rounded text-text-muted hover:text-accent hover:bg-surface-muted transition-colors"
                      title="Modifier le devis"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setToArchive(d)}
                      disabled={busyId === d.id}
                      className="p-1.5 rounded text-text-muted hover:text-red-600 hover:bg-surface-muted transition-colors disabled:opacity-50"
                      title="Archiver (conservé dans Supabase)"
                    >
                      {busyId === d.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Archive className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        page={pager.page}
        pageCount={pager.pageCount}
        total={pager.total}
        pageSize={pager.pageSize}
        onChange={pager.setPage}
        noun="devis"
      />

      <ConfirmDialog
        open={!!toArchive}
        title="Archiver ce devis ?"
        message={
          <>
            <p>
              <span className="font-medium text-text">{toArchive?.devis_number}</span> —{" "}
              {toArchive?.client_nom}
            </p>
            <p>
              Le devis et son PDF restent conservés dans Supabase ; ils disparaissent seulement de
              cette liste et des devis liés au lead.
            </p>
          </>
        }
        confirmLabel="Archiver le devis"
        pendingLabel="Archivage…"
        isPending={!!toArchive && busyId === toArchive.id}
        onConfirm={() => toArchive && archiver(toArchive)}
        onCancel={() => setToArchive(null)}
      />

      {formOpen && (
        <DevisForm
          // `key` force un état neuf entre deux devis : sans lui, rouvrir un
          // autre devis réutiliserait le formulaire déjà monté et ses valeurs.
          key={toEdit?.id ?? "nouveau"}
          devis={toEdit}
          initialLeadId={toEdit ? (toEdit.lead_id ?? null) : prefilledLeadId}
          onClose={() => {
            setFormOpen(false);
            setToEdit(null);
            setPrefilledLeadId(null);
          }}
          onSaved={(d) => {
            setDevis((list) => {
              const i = list.findIndex((x) => x.id === d.id);
              if (i === -1) return [d, ...list];
              const next = [...list];
              next[i] = d;
              return next;
            });
            notify(toEdit ? `${d.devis_number} mis à jour` : `${d.devis_number} enregistré`);
            setFormOpen(false);
            setToEdit(null);
          }}
        />
      )}
    </div>
  );
}

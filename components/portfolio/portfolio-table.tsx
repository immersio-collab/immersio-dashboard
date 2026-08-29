"use client";

import { useMemo, useState } from "react";
import {
  FolderOpen,
  Plus,
  Search,
  Pencil,
  Trash2,
  ExternalLink,
  Link2,
  Link2Off,
} from "lucide-react";
import type { PortfolioProjectRecord } from "@/types";
import { PORTFOLIO_SECTORS } from "@/types";
import { PortfolioModal } from "./portfolio-modal";
import { PortfolioDeleteDialog } from "./portfolio-delete-dialog";

const PUBLISHED = "Published";

const sectorLabel = (v: string | null) =>
  PORTFOLIO_SECTORS.find((s) => s.value === v)?.label ?? v ?? "—";

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export function PortfolioTable({ initialProjects }: { initialProjects: PortfolioProjectRecord[] }) {
  const [projects, setProjects] = useState<PortfolioProjectRecord[]>(initialProjects);
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState<"all" | "French" | "English">("all");
  const [sector, setSector] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PortfolioProjectRecord | null>(null);
  const [toDelete, setToDelete] = useState<PortfolioProjectRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function notify(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }

  /**
   * Projects paired with a counterpart in the other language. An unpaired
   * project emits no hreflang, so its two language versions compete for the
   * same query instead of declaring each other translations.
   */
  const pairedIds = useMemo(() => {
    const set = new Set<string>();
    for (const p of projects) {
      if (!p.linked_topic_id) continue;
      if (projects.some((o) => o.linked_topic_id === p.linked_topic_id && o.language !== p.language)) {
        set.add(p.id);
      }
    }
    return set;
  }, [projects]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter((p) => {
      if (language !== "all" && p.language !== language) return false;
      if (sector !== "all" && p.sector !== sector) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        (p.city ?? "").toLowerCase().includes(q)
      );
    });
  }, [projects, query, language, sector]);

  const publishedCount = projects.filter((p) => p.status === PUBLISHED).length;
  const unpairedCount = projects.length - pairedIds.size;

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/portfolio/${toDelete.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || `HTTP ${res.status}`);
      setProjects((list) => list.filter((p) => p.id !== toDelete.id));
      notify(`« ${toDelete.name} » archivé`);
      setToDelete(null);
    } catch (e) {
      notify(e instanceof Error ? e.message : "Suppression impossible");
    } finally {
      setDeleting(false);
    }
  }

  function onSaved(saved: PortfolioProjectRecord) {
    setProjects((list) => {
      const i = list.findIndex((p) => p.id === saved.id);
      if (i === -1) return [saved, ...list];
      const copy = [...list];
      copy[i] = saved;
      return copy;
    });
    notify(editing ? "Projet mis à jour" : "Projet créé");
  }

  const select =
    "px-2.5 py-1 text-xs bg-surface-subtle border border-border rounded-lg text-text focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent";

  return (
    <div className="space-y-3 relative flex flex-col flex-1 min-h-0">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-surface border border-accent/40 text-text px-4 py-2.5 rounded-xl shadow-2xl">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="text-xs font-medium">{toast}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-3.5 rounded-xl border border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent/10 border border-accent/20 text-accent flex-shrink-0">
            <FolderOpen className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-text">Projets du portfolio</h2>
            <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
              <span>{projects.length} projets</span>
              <span>·</span>
              <span className="text-emerald-500 font-medium">{publishedCount} publiés</span>
              {unpairedCount > 0 && (
                <>
                  <span>·</span>
                  <span className="text-amber-600 font-medium">{unpairedCount} sans traduction</span>
                </>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-accent text-accent-foreground hover:bg-accent-hover transition-all shadow-sm active:scale-[0.98]"
        >
          <Plus className="w-3.5 h-3.5" />
          Nouveau projet
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 bg-surface p-2.5 rounded-xl border border-border">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-subtle" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un projet, un slug, une ville…"
            className="w-full pl-8 pr-4 py-1 text-xs bg-surface-subtle border border-border rounded-lg text-text placeholder:text-text-subtle focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
          />
        </div>

        <select className={select} value={language} onChange={(e) => setLanguage(e.target.value as typeof language)}>
          <option value="all">Toutes les langues</option>
          <option value="French">Français</option>
          <option value="English">Anglais</option>
        </select>

        <select className={select} value={sector} onChange={(e) => setSector(e.target.value)}>
          <option value="all">Tous les secteurs</option>
          {PORTFOLIO_SECTORS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      <div className="flex-1 min-h-0 overflow-auto bg-surface rounded-xl border border-border">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-surface-subtle border-b border-border">
            <tr className="text-left text-text-muted">
              <th className="px-3 py-2 font-medium">Projet</th>
              <th className="px-3 py-2 font-medium whitespace-nowrap">Langue</th>
              <th className="px-3 py-2 font-medium whitespace-nowrap">Secteur</th>
              <th className="px-3 py-2 font-medium whitespace-nowrap">Ville</th>
              <th className="px-3 py-2 font-medium whitespace-nowrap">Publié le</th>
              <th className="px-3 py-2 font-medium whitespace-nowrap">Statut</th>
              <th className="px-3 py-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-text-subtle">
                  Aucun projet ne correspond.
                </td>
              </tr>
            )}

            {visible.map((p) => {
              const isPaired = pairedIds.has(p.id);
              const locale = p.language === "French" ? "fr" : "en";
              const publicPath = p.language === "French" ? "portfolio" : "our-work";
              return (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface-muted/50 transition-colors">
                  <td className="px-3 py-2 max-w-[300px]">
                    <div className="font-medium text-text truncate">{p.name}</div>
                    <div className="text-text-subtle truncate font-mono text-[11px]">/{p.slug}</div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5">
                      {p.language === "French" ? "FR" : "EN"}
                      {isPaired ? (
                        <Link2 className="w-3 h-3 text-emerald-500" aria-label="Traduction liée" />
                      ) : (
                        <Link2Off className="w-3 h-3 text-amber-500" aria-label="Sans traduction liée" />
                      )}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-text-muted">{sectorLabel(p.sector)}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-text-muted">{p.city ?? "—"}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-text-muted">{formatDate(p.published_at)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {p.status === PUBLISHED ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Publié
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded-md bg-slate-100 text-slate-700 border border-slate-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        Brouillon
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <a
                        href={`https://immersio.ma/${locale}/${publicPath}/${p.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded text-text-muted hover:text-accent hover:bg-surface-muted transition-colors"
                        title="Ouvrir sur immersio.ma"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(p);
                          setModalOpen(true);
                        }}
                        className="p-1.5 rounded text-text-muted hover:text-accent hover:bg-surface-muted transition-colors"
                        title="Modifier"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setToDelete(p)}
                        className="p-1.5 rounded text-text-muted hover:text-red-600 hover:bg-surface-muted transition-colors"
                        title="Archiver (conservé dans Supabase)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <PortfolioModal
        project={editing}
        siblings={projects}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={onSaved}
      />
      <PortfolioDeleteDialog
        project={toDelete}
        isDeleting={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

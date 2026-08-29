"use client";

import { useMemo, useState } from "react";
import { FileText, Plus, Search, Pencil, Archive, ExternalLink, Link2Off } from "lucide-react";
import type { BlogPostRecord } from "@/types";
import { BlogModal } from "./blog-modal";
import { BlogDeleteDialog } from "./blog-delete-dialog";
import {
  ExportCsvButton,
  Pagination,
  SortHeader,
  usePagination,
  useSort,
} from "@/components/table";
import { CellViewer, ExpandableCell, useCellViewer } from "@/components/table/cell";
import type { CsvColumn } from "@/lib/csv";
import { pairByTopic, primary, languagesOf, type Pair } from "@/lib/pairing";
import { getPublicationState, PUBLICATION_LABELS, PUBLICATION_STYLES } from "@/lib/publication";

type BlogSortKey = "name" | "langues" | "category_label" | "published_date" | "updated_at" | "status";
type BlogPair = Pair<BlogPostRecord>;

/** L'export reste à la ligne : une entrée par langue, comme en base. */
const CSV_COLUMNS: ReadonlyArray<CsvColumn<BlogPostRecord>> = [
  { header: "Titre", value: (p) => p.name },
  { header: "Slug", value: (p) => p.slug },
  { header: "Langue", value: (p) => p.language },
  { header: "Catégorie", value: (p) => p.category_label },
  { header: "Auteur", value: (p) => p.author_name },
  { header: "Temps de lecture", value: (p) => p.read_time },
  { header: "Titre SEO", value: (p) => p.meta_title },
  { header: "Description SEO", value: (p) => p.meta_description },
  { header: "Sujet lié", value: (p) => p.linked_topic_id },
  { header: "Statut", value: (p) => PUBLICATION_LABELS[getPublicationState(p.status, p.published_date)] },
  { header: "Publié le", value: (p) => p.published_date },
  { header: "Modifié le", value: (p) => p.updated_at },
];

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export function BlogTable({ initialPosts }: { initialPosts: BlogPostRecord[] }) {
  const [posts, setPosts] = useState<BlogPostRecord[]>(initialPosts);
  const [query, setQuery] = useState("");
  const [statut, setStatut] = useState<"all" | "publie" | "programme" | "brouillon">("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BlogPair | null>(null);
  const [toDelete, setToDelete] = useState<BlogPair | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const viewer = useCellViewer();

  function notify(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }

  /** Une ligne = un article, ses deux langues réunies. */
  const pairs = useMemo(() => pairByTopic(posts), [posts]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pairs.filter((pair) => {
      const sides = [pair.fr, pair.en].filter(Boolean) as BlogPostRecord[];
      if (statut !== "all") {
        const main = primary(pair);
        if (getPublicationState(main.status, main.published_date) !== statut) return false;
      }
      if (!q) return true;
      // La recherche porte sur les deux langues.
      return sides.some(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          (p.category_label ?? "").toLowerCase().includes(q)
      );
    });
  }, [pairs, query, statut]);

  const { sort, toggle, sorted } = useSort<BlogPair, BlogSortKey>(
    visible,
    {
      name: (p) => primary(p).name,
      langues: (p) => languagesOf(p).join(""),
      category_label: (p) => primary(p).category_label,
      published_date: (p) => primary(p).published_date,
      updated_at: (p) => primary(p).updated_at,
      status: (p) => getPublicationState(primary(p).status, primary(p).published_date),
    },
    { key: "published_date", dir: "desc" }
  );
  const pager = usePagination(sorted);

  const visibleRecords = useMemo(
    () => sorted.flatMap((p) => [p.fr, p.en].filter(Boolean) as BlogPostRecord[]),
    [sorted]
  );

  const publishedCount = pairs.filter(
    (p) => getPublicationState(primary(p).status, primary(p).published_date) === "publie"
  ).length;
  const scheduledCount = pairs.filter(
    (p) => getPublicationState(primary(p).status, primary(p).published_date) === "programme"
  ).length;
  const unpairedCount = pairs.filter((p) => !p.fr || !p.en).length;

  /** Archiver un article archive ses deux langues : c'est un seul contenu. */
  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    const sides = [toDelete.fr, toDelete.en].filter(Boolean) as BlogPostRecord[];
    try {
      for (const side of sides) {
        const res = await fetch(`/api/blog/${side.id}`, { method: "DELETE" });
        if (!res.ok) throw new Error((await res.json()).error || `HTTP ${res.status}`);
      }
      const ids = new Set(sides.map((s) => s.id));
      setPosts((list) => list.filter((p) => !ids.has(p.id)));
      notify(`« ${primary(toDelete).name} » archivé (${sides.length} langue${sides.length > 1 ? "s" : ""})`);
      setToDelete(null);
    } catch (e) {
      notify(e instanceof Error ? e.message : "Archivage impossible");
    } finally {
      setDeleting(false);
    }
  }

  function onSaved(saved: BlogPostRecord[]) {
    setPosts((list) => {
      const copy = [...list];
      for (const rec of saved) {
        const i = copy.findIndex((p) => p.id === rec.id);
        if (i === -1) copy.unshift(rec);
        else copy[i] = rec;
      }
      return copy;
    });
    notify(editing ? "Article mis à jour" : "Article créé");
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-3.5 rounded-xl border border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent/10 border border-accent/20 text-accent flex-shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-text">Articles du blog</h2>
            <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5 flex-wrap">
              <span>{pairs.length} articles</span>
              <span>·</span>
              <span className="text-emerald-600 font-medium">{publishedCount} publiés</span>
              {scheduledCount > 0 && (
                <>
                  <span>·</span>
                  <span className="text-blue-600 font-medium">{scheduledCount} programmés</span>
                </>
              )}
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
          Nouvel article
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 bg-surface p-2.5 rounded-xl border border-border">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-subtle" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un titre, un slug, une catégorie… (les deux langues)"
            className="w-full pl-8 pr-4 py-1 text-xs bg-surface-subtle border border-border rounded-lg text-text placeholder:text-text-subtle focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
          />
        </div>

        <select className={select} value={statut} onChange={(e) => setStatut(e.target.value as typeof statut)}>
          <option value="all">Tous les statuts</option>
          <option value="publie">Publié</option>
          <option value="programme">Programmé</option>
          <option value="brouillon">Brouillon</option>
        </select>

        <ExportCsvButton rows={visibleRecords} columns={CSV_COLUMNS} fileNamePrefix="blog" />
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-auto bg-surface rounded-xl border border-border">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-surface-subtle border-b border-border">
            <tr className="text-left text-text-muted">
              <SortHeader label="Article" sortKey="name" sort={sort} onToggle={toggle} />
              <SortHeader label="Langues" sortKey="langues" sort={sort} onToggle={toggle} />
              <SortHeader label="Catégorie" sortKey="category_label" sort={sort} onToggle={toggle} />
              <SortHeader label="Publié le" sortKey="published_date" sort={sort} onToggle={toggle} />
              <SortHeader label="Modifié le" sortKey="updated_at" sort={sort} onToggle={toggle} />
              <SortHeader label="Statut" sortKey="status" sort={sort} onToggle={toggle} />
              <th className="px-3 py-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pager.slice.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-text-subtle">
                  Aucun article ne correspond.
                </td>
              </tr>
            )}

            {pager.slice.map((pair) => {
              const main = primary(pair);
              const langs = languagesOf(pair);
              const state = getPublicationState(main.status, main.published_date);
              return (
                <tr
                  key={pair.key}
                  className="border-b border-border last:border-0 hover:bg-surface-muted/50 transition-colors"
                >
                  <td className="px-3 py-2 max-w-[360px]">
                    <ExpandableCell
                      label="Titre de l'article"
                      value={main.name}
                      context={main.category_label ?? undefined}
                      onOpen={viewer.open}
                      className="font-medium text-text block truncate w-full"
                    />
                    <div className="text-text-subtle font-mono text-[11px] truncate">
                      {pair.fr && <span title="Slug français">/{pair.fr.slug}</span>}
                      {pair.fr && pair.en && <span className="mx-1 opacity-50">·</span>}
                      {pair.en && <span title="Slug anglais">/{pair.en.slug}</span>}
                    </div>
                  </td>

                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      {langs.map((l) => (
                        <span
                          key={l}
                          className="px-1.5 py-0.5 rounded border border-border bg-surface-subtle text-[10px] font-medium text-text-muted"
                        >
                          {l}
                        </span>
                      ))}
                      {langs.length === 1 && (
                        <Link2Off
                          className="w-3 h-3 text-amber-500 ml-0.5"
                          aria-label="Sans traduction — pas de hreflang"
                        />
                      )}
                    </span>
                  </td>

                  <td className="px-3 py-2 whitespace-nowrap text-text-muted">
                    {main.category_label ?? "—"}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-text-muted">
                    {formatDate(main.published_date)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-text-muted">
                    {formatDate(main.updated_at)}
                  </td>

                  <td className="px-3 py-2 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded-md border ${PUBLICATION_STYLES[state]}`}
                      title={
                        state === "programme"
                          ? `Partira en ligne le ${formatDate(main.published_date)}`
                          : undefined
                      }
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          state === "publie"
                            ? "bg-emerald-500"
                            : state === "programme"
                              ? "bg-blue-500"
                              : "bg-slate-400"
                        }`}
                      />
                      {PUBLICATION_LABELS[state]}
                    </span>
                  </td>

                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      {([pair.fr, pair.en].filter(Boolean) as BlogPostRecord[]).map((p) => (
                        <a
                          key={p.id}
                          href={`https://immersio.ma/${p.language === "French" ? "fr" : "en"}/blog/${p.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-1.5 py-1 rounded text-[10px] font-medium text-text-muted hover:text-accent hover:bg-surface-muted transition-colors inline-flex items-center gap-0.5"
                          title={`Ouvrir la version ${p.language === "French" ? "française" : "anglaise"} sur immersio.ma`}
                        >
                          {p.language === "French" ? "FR" : "EN"}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(pair);
                          setModalOpen(true);
                        }}
                        className="p-1.5 rounded text-text-muted hover:text-accent hover:bg-surface-muted transition-colors"
                        title="Modifier les deux langues"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setToDelete(pair)}
                        className="p-1.5 rounded text-text-muted hover:text-red-600 hover:bg-surface-muted transition-colors"
                        title="Archiver (conservé dans Supabase)"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pagination
        page={pager.page}
        pageCount={pager.pageCount}
        total={pager.total}
        pageSize={pager.pageSize}
        onChange={pager.setPage}
        noun="article"
      />

      <CellViewer cell={viewer.cell} onClose={viewer.close} />

      <BlogModal
        pair={editing}
        allPosts={posts}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={onSaved}
      />
      <BlogDeleteDialog
        pair={toDelete}
        isDeleting={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

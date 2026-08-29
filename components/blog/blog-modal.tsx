"use client";

/**
 * components/blog/blog-modal.tsx — Édition d'un article, ses deux langues dans
 * la même fenêtre.
 *
 * Voir components/portfolio/portfolio-modal.tsx : même principe. Ce qui décrit
 * l'article en tant que publication (catégorie, auteur, image, date, statut,
 * identifiant de sujet) est saisi une fois ; ce qui se traduit — titre, slug,
 * extrait, textes SEO, contenu, texte alternatif de l'image — vit dans les
 * onglets par langue.
 */

import { useEffect, useMemo, useState } from "react";
import { X, AlertTriangle, ExternalLink, Link2Off, Plus, Check } from "lucide-react";
import type { BlogPostRecord } from "@/types";
import type { Pair } from "@/lib/pairing";
import { getPublicationState, PUBLICATION_LABELS } from "@/lib/publication";

/** Google tronque vers 60 caractères ; le site ajoute « | Immersio ». */
const TITLE_SUFFIX = " | Immersio";
const TITLE_BUDGET = 60 - TITLE_SUFFIX.length;
const DESC_MIN = 120;
const DESC_MAX = 158;

type Lang = "French" | "English";

/** Commun aux deux langues. */
interface Shared {
  linked_topic_id: string;
  category: string;
  cover_image: string;
  author_name: string;
  status: string;
  published_date: string;
}

/** Propre à une langue. */
interface Side {
  id: string | null;
  slug: string;
  name: string;
  category_label: string;
  excerpt: string;
  image_alt: string;
  read_time: string;
  meta_title: string;
  meta_description: string;
  content_html: string;
}

const emptyShared: Shared = {
  linked_topic_id: "",
  category: "",
  cover_image: "",
  author_name: "",
  status: "Published",
  published_date: "",
};

const emptySide = (): Side => ({
  id: null,
  slug: "",
  name: "",
  category_label: "",
  excerpt: "",
  image_alt: "",
  read_time: "",
  meta_title: "",
  meta_description: "",
  content_html: "",
});

function sharedFrom(p: BlogPostRecord): Shared {
  return {
    linked_topic_id: p.linked_topic_id ?? "",
    category: p.category ?? "",
    cover_image: p.cover_image ?? "",
    author_name: p.author_name ?? "",
    status: p.status,
    published_date: p.published_date ?? "",
  };
}

function sideFrom(p: BlogPostRecord): Side {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    category_label: p.category_label ?? "",
    excerpt: p.excerpt ?? "",
    image_alt: p.image_alt ?? "",
    read_time: p.read_time ?? "",
    meta_title: p.meta_title ?? "",
    meta_description: p.meta_description ?? "",
    content_html: p.content_html ?? "",
  };
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-medium text-text-muted">{label}</span>
      {children}
      {hint && <span className="block text-[10px] text-text-subtle leading-snug">{hint}</span>}
    </label>
  );
}

const input =
  "w-full px-2.5 py-1.5 text-xs bg-surface-subtle border border-border rounded-lg text-text placeholder:text-text-subtle focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all";

/** Compteur de longueur — vert dans le budget, ambre au-delà. */
function Counter({ value, max, min }: { value: string; max: number; min?: number }) {
  const n = value.length;
  const ok = n <= max && (min === undefined || n >= min);
  return (
    <span className={`text-[10px] tabular-nums ${ok ? "text-emerald-600" : "text-amber-600"}`}>
      {n}/{max}
      {min !== undefined && n < min ? ` (min ${min})` : ""}
    </span>
  );
}

export function BlogModal({
  pair,
  allPosts,
  open,
  onClose,
  onSaved,
}: {
  pair: Pair<BlogPostRecord> | null;
  allPosts: BlogPostRecord[];
  open: boolean;
  onClose: () => void;
  onSaved: (saved: BlogPostRecord[]) => void;
}) {
  const [shared, setShared] = useState<Shared>(emptyShared);
  const [sides, setSides] = useState<Record<Lang, Side | null>>({ French: null, English: null });
  const [tab, setTab] = useState<Lang>("French");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (pair) {
      const main = pair.fr ?? pair.en!;
      setShared(sharedFrom(main));
      setSides({
        French: pair.fr ? sideFrom(pair.fr) : null,
        English: pair.en ? sideFrom(pair.en) : null,
      });
      setTab(pair.fr ? "French" : "English");
    } else {
      setShared(emptyShared);
      setSides({ French: emptySide(), English: null });
      setTab("French");
    }
    setError(null);
  }, [open, pair]);

  const current = sides[tab];
  const setShar = <K extends keyof Shared>(k: K, v: Shared[K]) =>
    setShared((s) => ({ ...s, [k]: v }));
  const setSide = <K extends keyof Side>(k: K, v: Side[K]) =>
    setSides((s) => (s[tab] ? { ...s, [tab]: { ...s[tab]!, [k]: v } } : s));

  function addLanguage(lang: Lang) {
    setSides((s) => ({ ...s, [lang]: emptySide() }));
    setTab(lang);
  }

  const state = getPublicationState(shared.status, shared.published_date);
  const locale = tab === "French" ? "fr" : "en";
  const original = tab === "French" ? pair?.fr : pair?.en;
  const slugChanged = !!original && !!current && current.slug.trim() !== original.slug;

  /** Slug déjà pris — la contrainte de base porte sur tous les articles. */
  const slugTaken = useMemo(() => {
    if (!current?.slug.trim()) return false;
    return allPosts.some((p) => p.slug === current.slug.trim() && p.id !== current.id);
  }, [allPosts, current]);

  const renderedTitle = current ? (current.meta_title || current.name) + TITLE_SUFFIX : "";

  if (!open) return null;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const languages = (Object.keys(sides) as Lang[]).filter((l) => sides[l]);

      let topicId = shared.linked_topic_id.trim();
      if (!topicId && languages.length > 1) {
        topicId = `bp-${(sides.French ?? sides.English)!.slug.trim()}`;
      }

      const saved: BlogPostRecord[] = [];
      for (const lang of languages) {
        const side = sides[lang]!;
        const payload: Record<string, unknown> = {
          language: lang,
          status: shared.status,
          slug: side.slug.trim(),
          name: side.name.trim(),
          category_label: side.category_label.trim() || null,
          excerpt: side.excerpt.trim() || null,
          image_alt: side.image_alt.trim() || null,
          read_time: side.read_time.trim() || null,
          meta_title: side.meta_title.trim() || null,
          meta_description: side.meta_description.trim() || null,
          content_html: side.content_html.trim() || null,
          linked_topic_id: topicId || null,
          category: shared.category.trim() || null,
          cover_image: shared.cover_image.trim() || null,
          author_name: shared.author_name.trim() || null,
          published_date: shared.published_date || null,
        };

        const res = await fetch(side.id ? `/api/blog/${side.id}` : "/api/blog", {
          method: side.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(
            `${lang === "French" ? "Version française" : "Version anglaise"} : ${json.error || `HTTP ${res.status}`}`
          );
        }
        saved.push(json.data);
      }

      onSaved(saved);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  const canSave =
    !saving &&
    !slugTaken &&
    (Object.keys(sides) as Lang[])
      .filter((l) => sides[l])
      .every((l) => sides[l]!.slug.trim() && sides[l]!.name.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto bg-black/40">
      <div className="w-full max-w-3xl my-8 bg-surface border border-border rounded-xl shadow-2xl">
        <div className="sticky top-0 z-10 px-5 py-4 border-b border-border bg-surface rounded-t-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text">
              {pair ? `Modifier « ${(pair.fr ?? pair.en)!.name} »` : "Nouvel article"}
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded text-text-muted hover:text-text hover:bg-surface-muted"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {error && (
            <div className="px-3 py-2 text-xs rounded-lg bg-red-50 border border-red-200 text-red-700">
              {error}
            </div>
          )}

          {/* ── Commun aux deux langues ── */}
          <section className="space-y-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              La publication — commun aux deux langues
            </h3>

            <div className="grid sm:grid-cols-3 gap-4">
              <Field label="Catégorie (slug)" hint="Identifiant technique, identique dans les deux langues.">
                <input className={input} value={shared.category} onChange={(e) => setShar("category", e.target.value)} />
              </Field>
              <Field label="Auteur">
                <input className={input} value={shared.author_name} onChange={(e) => setShar("author_name", e.target.value)} />
              </Field>
              <Field label="Image de couverture">
                <input className={input} value={shared.cover_image} onChange={(e) => setShar("cover_image", e.target.value)} />
              </Field>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <Field label="Date de publication">
                <input type="date" className={input} value={shared.published_date} onChange={(e) => setShar("published_date", e.target.value)} />
              </Field>
              <Field label="Statut">
                <select className={input} value={shared.status} onChange={(e) => setShar("status", e.target.value)}>
                  <option value="Published">Publié</option>
                  <option value="Draft">Brouillon</option>
                </select>
              </Field>
              <div className="space-y-1">
                <span className="text-[11px] font-medium text-text-muted">État réel</span>
                <div className="px-2.5 py-1.5 text-xs bg-surface-subtle border border-border rounded-lg text-text">
                  {PUBLICATION_LABELS[state]}
                </div>
                <span className="block text-[10px] text-text-subtle leading-snug">
                  {state === "programme"
                    ? "Publié, mais daté du futur : le site ne le servira qu'à cette date."
                    : "Une date future avec le statut « Publié » programme la mise en ligne."}
                </span>
              </div>
            </div>

            <Field
              label="Identifiant de sujet lié"
              hint="Apparie les deux langues. Laissé vide avec deux versions, il est généré depuis le slug."
            >
              <input className={input} value={shared.linked_topic_id} onChange={(e) => setShar("linked_topic_id", e.target.value)} />
            </Field>
          </section>

          {/* ── Onglets de langue ── */}
          <section className="space-y-3">
            <div className="flex items-center gap-1 border-b border-border">
              {(["French", "English"] as Lang[]).map((lang) => {
                const exists = !!sides[lang];
                const label = lang === "French" ? "Français" : "Anglais";
                if (!exists) {
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => addLanguage(lang)}
                      className="px-3 py-2 text-xs font-medium text-text-subtle hover:text-accent transition-colors inline-flex items-center gap-1.5"
                      title={`Créer la version ${label.toLowerCase()}`}
                    >
                      <Plus className="w-3 h-3" />
                      {label}
                    </button>
                  );
                }
                const active = tab === lang;
                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setTab(lang)}
                    className={[
                      "px-3 py-2 text-xs font-medium transition-colors relative inline-flex items-center gap-1.5",
                      active ? "text-accent" : "text-text-muted hover:text-text",
                    ].join(" ")}
                  >
                    <Check className="w-3 h-3" />
                    {label}
                    {active && <span className="absolute bottom-0 inset-x-0 h-0.5 bg-accent" />}
                  </button>
                );
              })}
              {(!sides.French || !sides.English) && (
                <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] text-amber-600 pb-2">
                  <Link2Off className="w-3 h-3" />
                  Une seule langue — pas de hreflang
                </span>
              )}
            </div>

            {current && (
              <div className="space-y-4">
                <Field label="Titre de l'article">
                  <input className={input} value={current.name} onChange={(e) => setSide("name", e.target.value)} />
                </Field>

                <Field label="Slug (URL)" hint={`/${locale}/blog/${current.slug || "slug"}`}>
                  <input
                    className={`${input} ${slugTaken ? "border-red-400" : ""}`}
                    value={current.slug}
                    onChange={(e) => setSide("slug", e.target.value)}
                  />
                </Field>

                {slugTaken && (
                  <p className="text-[11px] text-red-600">
                    Ce slug est déjà utilisé par un autre article — ils sont uniques toutes langues
                    confondues.
                  </p>
                )}

                {slugChanged && (
                  <div className="flex items-start gap-2 px-3 py-2 text-[11px] rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>
                      Le slug passe de <code className="font-mono">{original!.slug}</code> à{" "}
                      <code className="font-mono">{current.slug}</code>. L&apos;ancienne URL
                      renverra une 404 sans redirection.
                    </span>
                  </div>
                )}

                {original && (
                  <a
                    href={`https://immersio.ma/${locale}/blog/${original.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-text-muted hover:text-accent"
                  >
                    <ExternalLink className="w-3 h-3" /> Voir cette version en ligne
                  </a>
                )}

                <div className="grid sm:grid-cols-3 gap-4">
                  <Field label="Catégorie (libellé)">
                    <input className={input} value={current.category_label} onChange={(e) => setSide("category_label", e.target.value)} />
                  </Field>
                  <Field label="Temps de lecture">
                    <input className={input} value={current.read_time} onChange={(e) => setSide("read_time", e.target.value)} placeholder="5 min" />
                  </Field>
                  <Field label="Texte alternatif de l'image">
                    <input className={input} value={current.image_alt} onChange={(e) => setSide("image_alt", e.target.value)} />
                  </Field>
                </div>

                <Field label="Extrait">
                  <textarea rows={2} className={input} value={current.excerpt} onChange={(e) => setSide("excerpt", e.target.value)} />
                </Field>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-text-muted">Titre SEO</span>
                    <Counter value={current.meta_title || current.name} max={TITLE_BUDGET} />
                  </div>
                  <input className={input} value={current.meta_title} onChange={(e) => setSide("meta_title", e.target.value)} placeholder={current.name} />
                  <span className="block text-[10px] text-text-subtle">
                    Affiché par Google :{" "}
                    <span className={renderedTitle.length > 60 ? "text-amber-600" : "text-emerald-600"}>
                      {renderedTitle}
                    </span>{" "}
                    ({renderedTitle.length} car.)
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-text-muted">Description SEO</span>
                    <Counter value={current.meta_description} max={DESC_MAX} min={DESC_MIN} />
                  </div>
                  <textarea rows={2} className={input} value={current.meta_description} onChange={(e) => setSide("meta_description", e.target.value)} />
                </div>

                <Field label="Contenu HTML">
                  <textarea
                    rows={14}
                    className={`${input} font-mono leading-relaxed`}
                    value={current.content_html}
                    onChange={(e) => setSide("content_html", e.target.value)}
                  />
                </Field>
              </div>
            )}
          </section>
        </div>

        <div className="sticky bottom-0 flex items-center justify-between gap-2 px-5 py-4 border-t border-border bg-surface rounded-b-xl">
          <span className="text-[11px] text-text-subtle">
            {(Object.keys(sides) as Lang[]).filter((l) => sides[l]).length === 2
              ? "Les deux langues seront enregistrées."
              : "Une seule langue sera enregistrée."}
          </span>
          <div className="flex gap-2">
            <button onClick={onClose} disabled={saving} className="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-border text-text-muted hover:text-text hover:bg-surface-muted disabled:opacity-50">
              Annuler
            </button>
            <button
              onClick={save}
              disabled={!canSave}
              className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-accent text-accent-foreground hover:bg-accent-hover disabled:opacity-50"
            >
              {saving ? "Enregistrement…" : pair ? "Enregistrer" : "Créer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

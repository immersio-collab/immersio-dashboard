"use client";

import { useEffect, useState } from "react";
import { X, AlertTriangle, ExternalLink } from "lucide-react";
import type { BlogPostRecord } from "@/types";

/** Google truncates around 60 characters; the site appends " | Immersio." */
const TITLE_SUFFIX = " | Immersio.";
const TITLE_BUDGET = 60 - TITLE_SUFFIX.length;
const DESC_MIN = 70;
const DESC_MAX = 160;

type Draft = {
  slug: string;
  language: "French" | "English";
  name: string;
  status: string;
  linked_topic_id: string;
  category: string;
  category_label: string;
  excerpt: string;
  cover_image: string;
  image_alt: string;
  author_name: string;
  read_time: string;
  meta_title: string;
  meta_description: string;
  content_html: string;
  published_date: string;
};

const empty: Draft = {
  slug: "", language: "French", name: "", status: "Published", linked_topic_id: "",
  category: "", category_label: "", excerpt: "", cover_image: "", image_alt: "",
  author_name: "", read_time: "", meta_title: "", meta_description: "",
  content_html: "", published_date: "",
};

function fromRecord(p: BlogPostRecord): Draft {
  return {
    slug: p.slug, language: p.language, name: p.name, status: p.status,
    linked_topic_id: p.linked_topic_id ?? "", category: p.category ?? "",
    category_label: p.category_label ?? "", excerpt: p.excerpt ?? "",
    cover_image: p.cover_image ?? "", image_alt: p.image_alt ?? "",
    author_name: p.author_name ?? "", read_time: p.read_time ?? "",
    meta_title: p.meta_title ?? "", meta_description: p.meta_description ?? "",
    content_html: p.content_html ?? "", published_date: p.published_date ?? "",
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

/** Live length readout — green inside the budget, amber past it. */
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
  post,
  open,
  onClose,
  onSaved,
}: {
  post: BlogPostRecord | null;
  open: boolean;
  onClose: () => void;
  onSaved: (p: BlogPostRecord) => void;
}) {
  const [draft, setDraft] = useState<Draft>(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDraft(post ? fromRecord(post) : empty);
    setError(null);
  }, [open, post]);

  if (!open) return null;

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const slugChanged = !!post && draft.slug.trim() !== post.slug;
  const renderedTitle = (draft.meta_title || draft.name) + TITLE_SUFFIX;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const payload = Object.fromEntries(
        Object.entries(draft).map(([k, v]) => [k, typeof v === "string" && !v.trim() ? null : v])
      );
      const res = await fetch(post ? `/api/blog/${post.id}` : "/api/blog", {
        method: post ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      onSaved(json.data);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto bg-black/40">
      <div className="w-full max-w-3xl my-8 bg-surface border border-border rounded-xl shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-border bg-surface rounded-t-xl">
          <h2 className="text-sm font-semibold text-text">
            {post ? "Modifier l'article" : "Nouvel article"}
          </h2>
          <div className="flex items-center gap-2">
            {post && (
              <a
                href={`https://immersio.ma/${post.language === "French" ? "fr" : "en"}/blog/${post.slug}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 px-2 py-1 text-[11px] rounded text-text-muted hover:text-accent hover:bg-surface-muted"
              >
                <ExternalLink className="w-3 h-3" /> Voir en ligne
              </a>
            )}
            <button onClick={onClose} className="p-1 rounded text-text-muted hover:text-text hover:bg-surface-muted" aria-label="Fermer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="px-3 py-2 text-xs rounded-lg bg-red-50 border border-red-200 text-red-700">{error}</div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Titre de l&apos;article">
              <input className={input} value={draft.name} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <Field label="Langue">
              <select className={input} value={draft.language} onChange={(e) => set("language", e.target.value as Draft["language"])}>
                <option value="French">Français</option>
                <option value="English">Anglais</option>
              </select>
            </Field>
          </div>

          <Field
            label="Slug (URL)"
            hint="Modifier ce champ change l&apos;adresse de la page. Google perd le positionnement de l&apos;ancienne URL et l&apos;article repart de zéro."
          >
            <input className={input} value={draft.slug} onChange={(e) => set("slug", e.target.value)} />
          </Field>

          {slugChanged && (
            <div className="flex items-start gap-2 px-3 py-2 text-[11px] rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>
                Le slug passe de <code className="font-mono">{post!.slug}</code> à{" "}
                <code className="font-mono">{draft.slug}</code>. L&apos;ancienne URL renverra une
                404 sans redirection.
              </span>
            </div>
          )}

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-text-muted">Titre SEO</span>
              <Counter value={draft.meta_title || draft.name} max={TITLE_BUDGET} />
            </div>
            <input className={input} value={draft.meta_title} onChange={(e) => set("meta_title", e.target.value)} placeholder={draft.name} />
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
              <Counter value={draft.meta_description} max={DESC_MAX} min={DESC_MIN} />
            </div>
            <textarea rows={2} className={input} value={draft.meta_description} onChange={(e) => set("meta_description", e.target.value)} />
          </div>

          <Field label="Extrait">
            <textarea rows={3} className={input} value={draft.excerpt} onChange={(e) => set("excerpt", e.target.value)} />
          </Field>

          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Catégorie (slug)">
              <input className={input} value={draft.category} onChange={(e) => set("category", e.target.value)} />
            </Field>
            <Field label="Catégorie (libellé)">
              <input className={input} value={draft.category_label} onChange={(e) => set("category_label", e.target.value)} />
            </Field>
            <Field label="Temps de lecture">
              <input className={input} value={draft.read_time} onChange={(e) => set("read_time", e.target.value)} placeholder="5 min" />
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Image de couverture">
              <input className={input} value={draft.cover_image} onChange={(e) => set("cover_image", e.target.value)} />
            </Field>
            <Field label="Texte alternatif de l&apos;image">
              <input className={input} value={draft.image_alt} onChange={(e) => set("image_alt", e.target.value)} />
            </Field>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Auteur">
              <input className={input} value={draft.author_name} onChange={(e) => set("author_name", e.target.value)} />
            </Field>
            <Field label="Date de publication">
              <input type="date" className={input} value={draft.published_date} onChange={(e) => set("published_date", e.target.value)} />
            </Field>
            <Field label="Statut">
              <select className={input} value={draft.status} onChange={(e) => set("status", e.target.value)}>
                <option value="Published">Publié</option>
                <option value="Draft">Brouillon</option>
              </select>
            </Field>
          </div>

          <Field
            label="Identifiant de sujet lié"
            hint="Apparie les versions française et anglaise du même article. Vidé, les deux versions se concurrencent sur Google au lieu de se déclarer traductions l&apos;une de l&apos;autre."
          >
            <input className={input} value={draft.linked_topic_id} onChange={(e) => set("linked_topic_id", e.target.value)} />
          </Field>

          <Field label="Contenu HTML">
            <textarea
              rows={14}
              className={`${input} font-mono leading-relaxed`}
              value={draft.content_html}
              onChange={(e) => set("content_html", e.target.value)}
            />
          </Field>
        </div>

        <div className="sticky bottom-0 flex justify-end gap-2 px-5 py-4 border-t border-border bg-surface rounded-b-xl">
          <button onClick={onClose} disabled={saving} className="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-border text-text-muted hover:text-text hover:bg-surface-muted disabled:opacity-50">
            Annuler
          </button>
          <button
            onClick={save}
            disabled={saving || !draft.slug.trim() || !draft.name.trim()}
            className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-accent text-accent-foreground hover:bg-accent-hover disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : post ? "Enregistrer" : "Créer"}
          </button>
        </div>
      </div>
    </div>
  );
}

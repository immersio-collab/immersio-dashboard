"use client";

import { useEffect, useState } from "react";
import { X, AlertTriangle, ExternalLink, Link2Off } from "lucide-react";
import type { PortfolioProjectRecord } from "@/types";
import { PORTFOLIO_SECTORS } from "@/types";

const TITLE_SUFFIX = " | Immersio.";
const TITLE_BUDGET = 60 - TITLE_SUFFIX.length;
const DESC_MIN = 70;
const DESC_MAX = 160;

type Draft = {
  slug: string;
  language: "French" | "English";
  linked_topic_id: string;
  name: string;
  description_html: string;
  city: string;
  sector: string;
  surface: string;
  delivery_time: string;
  cover_image: string;
  embed_url: string;
  deliverables: string;
  meta_title: string;
  meta_description: string;
  status: string;
  published_at: string;
};

const empty: Draft = {
  slug: "", language: "French", linked_topic_id: "", name: "", description_html: "",
  city: "", sector: "", surface: "", delivery_time: "", cover_image: "", embed_url: "",
  deliverables: "", meta_title: "", meta_description: "", status: "Published", published_at: "",
};

function fromRecord(p: PortfolioProjectRecord): Draft {
  return {
    slug: p.slug, language: p.language, linked_topic_id: p.linked_topic_id ?? "",
    name: p.name, description_html: p.description_html ?? "", city: p.city ?? "",
    sector: p.sector ?? "", surface: p.surface ?? "", delivery_time: p.delivery_time ?? "",
    cover_image: p.cover_image ?? "", embed_url: p.embed_url ?? "",
    deliverables: (Array.isArray(p.deliverables) ? p.deliverables : []).join("\n"),
    meta_title: p.meta_title ?? "", meta_description: p.meta_description ?? "",
    status: p.status, published_at: p.published_at ?? "",
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

function Counter({ value, max, min }: { value: string; max: number; min?: number }) {
  const n = value.length;
  const ok = n <= max && (min === undefined || n >= min);
  return (
    <span className={`text-[10px] tabular-nums ${ok ? "text-emerald-600" : "text-amber-600"}`}>
      {n}/{max}
    </span>
  );
}

export function PortfolioModal({
  project,
  siblings,
  open,
  onClose,
  onSaved,
}: {
  project: PortfolioProjectRecord | null;
  /** Every project, used to show which one this one is paired with. */
  siblings: PortfolioProjectRecord[];
  open: boolean;
  onClose: () => void;
  onSaved: (p: PortfolioProjectRecord) => void;
}) {
  const [draft, setDraft] = useState<Draft>(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDraft(project ? fromRecord(project) : empty);
    setError(null);
  }, [open, project]);

  if (!open) return null;

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const slugChanged = !!project && draft.slug.trim() !== project.slug;
  const renderedTitle = (draft.meta_title || draft.name) + TITLE_SUFFIX;
  const locale = draft.language === "French" ? "fr" : "en";
  const publicPath = draft.language === "French" ? "portfolio" : "our-work";

  // The paired project in the other language, resolved the same way the site does.
  const pair = draft.linked_topic_id
    ? siblings.find(
        (s) => s.linked_topic_id === draft.linked_topic_id && s.language !== draft.language
      )
    : undefined;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(draft)) {
        if (k === "deliverables") {
          payload.deliverables = String(v)
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean);
          continue;
        }
        payload[k] = typeof v === "string" && !v.trim() ? null : v;
      }
      // language and status are NOT NULL in the schema.
      payload.language = draft.language;
      payload.status = draft.status;

      const res = await fetch(project ? `/api/portfolio/${project.id}` : "/api/portfolio", {
        method: project ? "PATCH" : "POST",
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
            {project ? "Modifier le projet" : "Nouveau projet"}
          </h2>
          <div className="flex items-center gap-2">
            {project && (
              <a
                href={`https://immersio.ma/${locale}/${publicPath}/${project.slug}`}
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
            <Field label="Nom du projet">
              <input className={input} value={draft.name} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <Field
              label="Langue"
              hint="Un même slug peut exister dans les deux langues : c'est le couple slug + langue qui identifie un projet."
            >
              <select className={input} value={draft.language} onChange={(e) => set("language", e.target.value as Draft["language"])}>
                <option value="French">Français</option>
                <option value="English">Anglais</option>
              </select>
            </Field>
          </div>

          <Field
            label="Slug (URL)"
            hint={`Adresse publique : /${locale}/${publicPath}/${draft.slug || "slug"}`}
          >
            <input className={input} value={draft.slug} onChange={(e) => set("slug", e.target.value)} />
          </Field>

          {slugChanged && (
            <div className="flex items-start gap-2 px-3 py-2 text-[11px] rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>
                Le slug passe de <code className="font-mono">{project!.slug}</code> à{" "}
                <code className="font-mono">{draft.slug}</code>. L&apos;ancienne URL renverra une 404
                sans redirection.
              </span>
            </div>
          )}

          <Field
            label="Identifiant de sujet lié"
            hint="Apparie les versions française et anglaise du même projet. Vidé, les deux versions se déclarent sans traduction et se concurrencent sur Google."
          >
            <input className={input} value={draft.linked_topic_id} onChange={(e) => set("linked_topic_id", e.target.value)} />
          </Field>

          {draft.linked_topic_id && !pair && (
            <div className="flex items-start gap-2 px-3 py-2 text-[11px] rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
              <Link2Off className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>
                Aucun projet dans l&apos;autre langue ne porte cet identifiant — le hreflang ne sera
                pas émis.
              </span>
            </div>
          )}
          {pair && (
            <p className="text-[11px] text-emerald-600">
              Apparié avec « {pair.name} » ({pair.language === "French" ? "français" : "anglais"})
            </p>
          )}

          <div className="grid sm:grid-cols-4 gap-4">
            <Field label="Ville">
              <input className={input} value={draft.city} onChange={(e) => set("city", e.target.value)} />
            </Field>
            <Field label="Secteur">
              <select className={input} value={draft.sector} onChange={(e) => set("sector", e.target.value)}>
                <option value="">—</option>
                {PORTFOLIO_SECTORS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Surface">
              <input className={input} value={draft.surface} onChange={(e) => set("surface", e.target.value)} placeholder="180 m²" />
            </Field>
            <Field label="Délai de livraison">
              <input className={input} value={draft.delivery_time} onChange={(e) => set("delivery_time", e.target.value)} placeholder="48h" />
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Image de couverture">
              <input className={input} value={draft.cover_image} onChange={(e) => set("cover_image", e.target.value)} />
            </Field>
            <Field label="URL de la visite 3D">
              <input className={input} value={draft.embed_url} onChange={(e) => set("embed_url", e.target.value)} placeholder="https://realsee.ai/…" />
            </Field>
          </div>

          <Field label="Livrables" hint="Un par ligne.">
            <textarea rows={5} className={input} value={draft.deliverables} onChange={(e) => set("deliverables", e.target.value)} placeholder={"Visite 3D\nPlan 2D\nPanoramas HDR"} />
          </Field>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-text-muted">Titre SEO</span>
              <Counter value={draft.meta_title || draft.name} max={TITLE_BUDGET} />
            </div>
            <input className={input} value={draft.meta_title} onChange={(e) => set("meta_title", e.target.value)} placeholder={draft.name} />
            <span className="block text-[10px] text-text-subtle">
              Affiché par Google :{" "}
              <span className={renderedTitle.length > 60 ? "text-amber-600" : "text-emerald-600"}>{renderedTitle}</span>{" "}
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

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Date de publication">
              <input type="date" className={input} value={draft.published_at} onChange={(e) => set("published_at", e.target.value)} />
            </Field>
            <Field label="Statut">
              <select className={input} value={draft.status} onChange={(e) => set("status", e.target.value)}>
                <option value="Published">Publié</option>
                <option value="Draft">Brouillon</option>
              </select>
            </Field>
          </div>

          <Field label="Description (HTML)">
            <textarea
              rows={12}
              className={`${input} font-mono leading-relaxed`}
              value={draft.description_html}
              onChange={(e) => set("description_html", e.target.value)}
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
            {saving ? "Enregistrement…" : project ? "Enregistrer" : "Créer"}
          </button>
        </div>
      </div>
    </div>
  );
}

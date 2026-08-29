"use client";

/**
 * components/portfolio/portfolio-modal.tsx — Édition d'un projet, ses deux
 * langues dans la même fenêtre.
 *
 * Un projet existait comme deux enregistrements sans rapport visible : deux
 * lignes dans le tableau, deux ouvertures, deux enregistrements — et rien pour
 * empêcher la ville ou la surface de diverger d'une langue à l'autre.
 *
 * Les informations qui décrivent le bien (ville, secteur, surface, délai,
 * visite 3D, client, date, statut) sont saisies une fois et écrites dans les
 * deux enregistrements : ce sont des faits, pas des traductions. Seul ce qui
 * se traduit — nom, slug, livrables, textes SEO, description — vit dans les
 * onglets par langue.
 */

import { useEffect, useMemo, useState } from "react";
import { X, AlertTriangle, ExternalLink, Link2Off, Plus, Check } from "lucide-react";
import type { PortfolioProjectRecord, Lead } from "@/types";
import { PORTFOLIO_SECTORS, LIVRABLES } from "@/types";
import { LeadPicker } from "@/components/lead-picker";
import type { Pair } from "@/lib/pairing";
import { getPublicationState, PUBLICATION_LABELS } from "@/lib/publication";

const TITLE_SUFFIX = " | Immersio";
const TITLE_BUDGET = 60 - TITLE_SUFFIX.length;
const DESC_MIN = 120;
const DESC_MAX = 158;

type Lang = "French" | "English";

/** Ce qui décrit le bien : identique dans les deux langues. */
interface Shared {
  linked_topic_id: string;
  city: string;
  sector: string;
  surface: string;
  delivery_time: string;
  cover_image: string;
  embed_url: string;
  status: string;
  published_at: string;
}

/** Ce qui se traduit. */
interface Side {
  /** Absent tant que cette langue n'existe pas encore. */
  id: string | null;
  slug: string;
  name: string;
  deliverables: string[];
  meta_title: string;
  meta_description: string;
  description_html: string;
}

const emptyShared: Shared = {
  linked_topic_id: "",
  city: "",
  sector: "",
  surface: "",
  delivery_time: "",
  cover_image: "",
  embed_url: "",
  status: "Published",
  published_at: "",
};

const emptySide = (): Side => ({
  id: null,
  slug: "",
  name: "",
  deliverables: [],
  meta_title: "",
  meta_description: "",
  description_html: "",
});

function sharedFrom(p: PortfolioProjectRecord): Shared {
  return {
    linked_topic_id: p.linked_topic_id ?? "",
    city: p.city ?? "",
    sector: p.sector ?? "",
    surface: p.surface ?? "",
    delivery_time: p.delivery_time ?? "",
    cover_image: p.cover_image ?? "",
    embed_url: p.embed_url ?? "",
    status: p.status,
    published_at: p.published_at ?? "",
  };
}

function sideFrom(p: PortfolioProjectRecord): Side {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    deliverables: Array.isArray(p.deliverables) ? p.deliverables : [],
    meta_title: p.meta_title ?? "",
    meta_description: p.meta_description ?? "",
    description_html: p.description_html ?? "",
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
  pair,
  allProjects,
  open,
  onClose,
  onSaved,
}: {
  /** Projet à modifier, ses deux langues. Absent = création. */
  pair: Pair<PortfolioProjectRecord> | null;
  /** Tous les projets, pour vérifier qu'un slug n'est pas déjà pris. */
  allProjects: PortfolioProjectRecord[];
  open: boolean;
  onClose: () => void;
  onSaved: (saved: PortfolioProjectRecord[]) => void;
}) {
  const [shared, setShared] = useState<Shared>(emptyShared);
  const [sides, setSides] = useState<Record<Lang, Side | null>>({ French: null, English: null });
  const [tab, setTab] = useState<Lang>("French");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [clientLead, setClientLead] = useState<Lead | null>(null);
  const [leadUnlinked, setLeadUnlinked] = useState(false);

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
    setClientLead(null);
    setLeadUnlinked(false);
    setError(null);
  }, [open, pair]);

  const initialLeadId = pair ? ((pair.fr ?? pair.en)?.lead_id ?? null) : null;

  const current = sides[tab];
  const setShar = <K extends keyof Shared>(k: K, v: Shared[K]) =>
    setShared((s) => ({ ...s, [k]: v }));
  const setSide = <K extends keyof Side>(k: K, v: Side[K]) =>
    setSides((s) => (s[tab] ? { ...s, [tab]: { ...s[tab]!, [k]: v } } : s));

  /** Crée la version manquante, pré-remplie de ce qui ne se traduit pas. */
  function addLanguage(lang: Lang) {
    setSides((s) => ({ ...s, [lang]: emptySide() }));
    setTab(lang);
  }

  const livrableLabel = (l: (typeof LIVRABLES)[number]) => (tab === "French" ? l.fr : l.en);

  const toggleLivrable = (label: string) =>
    setSides((s) => {
      const side = s[tab];
      if (!side) return s;
      const next = side.deliverables.includes(label)
        ? side.deliverables.filter((x) => x !== label)
        : [...side.deliverables, label];
      return { ...s, [tab]: { ...side, deliverables: next } };
    });

  const state = getPublicationState(shared.status, shared.published_at);
  const locale = tab === "French" ? "fr" : "en";
  const publicPath = tab === "French" ? "portfolio" : "our-work";

  const original = tab === "French" ? pair?.fr : pair?.en;
  const slugChanged = !!original && !!current && current.slug.trim() !== original.slug;

  /** Slug déjà utilisé par un autre projet de la même langue. */
  const slugTaken = useMemo(() => {
    if (!current?.slug.trim()) return false;
    const lang = tab;
    return allProjects.some(
      (p) => p.language === lang && p.slug === current.slug.trim() && p.id !== current.id
    );
  }, [allProjects, current, tab]);

  const renderedTitle = current ? (current.meta_title || current.name) + TITLE_SUFFIX : "";

  if (!open) return null;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const languages = (Object.keys(sides) as Lang[]).filter((l) => sides[l]);

      // Deux langues sans identifiant de sujet : elles ne se déclareraient pas
      // traductions l'une de l'autre. On en génère un depuis le slug français.
      let topicId = shared.linked_topic_id.trim();
      if (!topicId && languages.length > 1) {
        const base = (sides.French ?? sides.English)!.slug.trim();
        topicId = `pf-${base}`;
      }

      const saved: PortfolioProjectRecord[] = [];
      for (const lang of languages) {
        const side = sides[lang]!;
        const payload: Record<string, unknown> = {
          language: lang,
          status: shared.status,
          slug: side.slug.trim(),
          name: side.name.trim(),
          deliverables: side.deliverables,
          meta_title: side.meta_title.trim() || null,
          meta_description: side.meta_description.trim() || null,
          description_html: side.description_html.trim() || null,
          linked_topic_id: topicId || null,
          city: shared.city.trim() || null,
          sector: shared.sector || null,
          surface: shared.surface.trim() || null,
          delivery_time: shared.delivery_time.trim() || null,
          cover_image: shared.cover_image.trim() || null,
          embed_url: shared.embed_url.trim() || null,
          published_at: shared.published_at || null,
        };
        if (clientLead) payload.lead_id = clientLead.leadId;
        else if (leadUnlinked && initialLeadId) payload.lead_id = null;

        const res = await fetch(side.id ? `/api/portfolio/${side.id}` : "/api/portfolio", {
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
        {/* ── En-tête ── */}
        <div className="sticky top-0 z-10 px-5 py-4 border-b border-border bg-surface rounded-t-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text">
              {pair ? `Modifier « ${(pair.fr ?? pair.en)!.name} »` : "Nouveau projet"}
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

          {/* ── Informations du bien : communes aux deux langues ── */}
          <section className="space-y-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              Le bien — commun aux deux langues
            </h3>

            <Field
              label="Client (lead)"
              hint="Lead du CRM pour lequel ce projet a été réalisé."
            >
              <LeadPicker
                selected={clientLead}
                onSelect={(l) => {
                  setClientLead(l);
                  setLeadUnlinked(false);
                }}
                onClear={() => {
                  setClientLead(null);
                  setLeadUnlinked(true);
                }}
                initialLeadId={initialLeadId}
                placeholder="Rechercher le client (nom, téléphone, ville…)"
              />
            </Field>

            <div className="grid sm:grid-cols-4 gap-4">
              <Field label="Ville">
                <input className={input} value={shared.city} onChange={(e) => setShar("city", e.target.value)} />
              </Field>
              <Field label="Secteur">
                <select className={input} value={shared.sector} onChange={(e) => setShar("sector", e.target.value)}>
                  <option value="">—</option>
                  {PORTFOLIO_SECTORS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Surface">
                <input className={input} value={shared.surface} onChange={(e) => setShar("surface", e.target.value)} placeholder="180 m²" />
              </Field>
              <Field label="Délai de livraison">
                <input className={input} value={shared.delivery_time} onChange={(e) => setShar("delivery_time", e.target.value)} placeholder="48h" />
              </Field>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Image de couverture">
                <input className={input} value={shared.cover_image} onChange={(e) => setShar("cover_image", e.target.value)} />
              </Field>
              <Field label="URL de la visite 3D">
                <input className={input} value={shared.embed_url} onChange={(e) => setShar("embed_url", e.target.value)} placeholder="https://realsee.ai/…" />
              </Field>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <Field label="Date de publication">
                <input type="date" className={input} value={shared.published_at} onChange={(e) => setShar("published_at", e.target.value)} />
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
              hint="Apparie les deux langues. Laissé vide avec deux versions, il est généré depuis le slug — sans lui, chaque langue se déclare sans traduction et elles se concurrencent sur Google."
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
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Nom du projet">
                    <input className={input} value={current.name} onChange={(e) => setSide("name", e.target.value)} />
                  </Field>
                  <Field
                    label="Slug (URL)"
                    hint={`/${locale}/${publicPath}/${current.slug || "slug"}`}
                  >
                    <input
                      className={`${input} ${slugTaken ? "border-red-400" : ""}`}
                      value={current.slug}
                      onChange={(e) => setSide("slug", e.target.value)}
                    />
                  </Field>
                </div>

                {slugTaken && (
                  <p className="text-[11px] text-red-600">
                    Ce slug est déjà utilisé par un autre projet dans cette langue.
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
                    href={`https://immersio.ma/${locale}/${publicPath}/${original.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-text-muted hover:text-accent"
                  >
                    <ExternalLink className="w-3 h-3" /> Voir cette version en ligne
                  </a>
                )}

                <Field
                  label="Livrables"
                  hint="Liste partagée avec les options du devis, dans la langue de cette version."
                >
                  <div className="grid sm:grid-cols-2 gap-1.5">
                    {LIVRABLES.map((l) => {
                      const label = livrableLabel(l);
                      const checked = current.deliverables.includes(label);
                      return (
                        <label
                          key={l.id}
                          className={[
                            "flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg border cursor-pointer transition-all",
                            checked
                              ? "bg-accent/10 border-accent text-text font-medium"
                              : "bg-surface-subtle border-border text-text-muted hover:border-accent/40 hover:text-text",
                          ].join(" ")}
                        >
                          <input
                            type="checkbox"
                            className="accent-current w-3 h-3"
                            checked={checked}
                            onChange={() => toggleLivrable(label)}
                          />
                          <span className="leading-tight">{label}</span>
                        </label>
                      );
                    })}
                  </div>
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

                <Field label="Description (HTML)">
                  <textarea
                    rows={12}
                    className={`${input} font-mono leading-relaxed`}
                    value={current.description_html}
                    onChange={(e) => setSide("description_html", e.target.value)}
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

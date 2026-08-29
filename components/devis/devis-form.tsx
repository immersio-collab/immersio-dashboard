"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Save, X, Loader2 } from "lucide-react";
import { LeadPicker } from "@/components/lead-picker";
import {
  DEVIS_OPTIONS,
  HEBERGEMENT_DUREES,
  REMISE_AUTO_PCT,
  SUPERFICIE_OPTIONS,
  SUPERFICIES,
  TYPE_BIEN_OPTIONS,
  findSecteurByLabel,
  findSuperficieByLabel,
  type DevisData,
  type DevisOptionId,
  type DevisRecord,
  type Lead,
} from "@/types";
import { buildDevisPdf, devisFileName } from "@/lib/devis-pdf";
import {
  computeTotals,
  emptyDevis,
  fmt,
  isManualPricing,
  optionLabel,
  prolongationRate,
  suggestedHebergementPrices,
  superficieLabel,
  tour3dPrice,
  typeBienLabel,
} from "@/lib/devis-pricing";

/**
 * Retrouve la tranche de surface correspondant au champ surface d'un lead :
 * d'abord par libellé exact (le formulaire du site envoie les libellés du
 * vocabulaire), sinon en interprétant une valeur numérique libre ("120").
 */
function trancheFromLeadSurface(surface: string | undefined) {
  if (!surface?.trim()) return undefined;
  const byLabel = findSuperficieByLabel(surface);
  if (byLabel) return byLabel;
  // Uniquement une valeur à UN nombre ("120", "120 m²"). Une plage historique
  // hors vocabulaire ("100 – 300 m²") est ambiguë : concaténer ses bornes en
  // "100300" la classerait en « Plus de 500 m² » — on laisse alors le choix
  // à l'agent plutôt que de deviner.
  const numbers = surface.match(/\d+(?:[.,]\d+)?/g);
  if (!numbers || numbers.length !== 1) return undefined;
  const n = parseFloat(numbers[0].replace(",", "."));
  if (isNaN(n) || n <= 0) return undefined;
  if (n < 50) return SUPERFICIES[0];
  if (n <= 100) return SUPERFICIES[1];
  if (n <= 200) return SUPERFICIES[2];
  if (n <= 500) return SUPERFICIES[3];
  return SUPERFICIES[4];
}

const input =
  "w-full px-2.5 py-1.5 text-xs bg-surface-subtle border border-border rounded-lg text-text placeholder:text-text-subtle focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-medium text-text-muted">{label}</span>
      {children}
      {hint && <span className="block text-[10px] text-text-subtle leading-snug">{hint}</span>}
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">{title}</h3>
      {children}
    </div>
  );
}

/** Selectable chip used for property type, surface and options. */
function Chip({
  active,
  onClick,
  children,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  sub?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "px-2.5 py-2 text-left text-[11px] rounded-lg border transition-all",
        active
          ? "bg-accent/10 border-accent text-text font-medium"
          : "bg-surface-subtle border-border text-text-muted hover:border-accent/40 hover:text-text",
      ].join(" ")}
    >
      <span className="block leading-tight">{children}</span>
      {sub && <span className="block text-[10px] text-text-subtle mt-0.5">{sub}</span>}
    </button>
  );
}

export function DevisForm({
  onSaved,
  onClose,
  initialLeadId,
}: {
  onSaved: (d: DevisRecord) => void;
  onClose: () => void;
  /** Lead à présélectionner (ex. bouton « Créer un devis » de la fiche lead). */
  initialLeadId?: string | null;
}) {
  const [data, setData] = useState<DevisData>(emptyDevis);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);

  // ── Lien avec un lead : tout devis devrait naître d'un lead. ──
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  /** Pré-remplit le devis avec les informations du lead. */
  function applyLead(lead: Lead) {
    setSelectedLead(lead);
    setData((d) => {
      const secteur = findSecteurByLabel(lead.typeDeBien);
      const tranche = trancheFromLeadSurface(lead.surface);
      return {
        ...d,
        clientNom: lead.nom || d.clientNom,
        clientTel: lead.telephone || d.clientTel,
        clientEmail: lead.email || d.clientEmail,
        clientVille: lead.ville || d.clientVille,
        typeBien: secteur ? secteur.value : lead.typeDeBien ? "autre" : d.typeBien,
        typeBienAutre: secteur ? "" : lead.typeDeBien || d.typeBienAutre,
        superficie: tranche ? tranche.value : d.superficie,
      };
    });
  }

  const set = <K extends keyof DevisData>(k: K, v: DevisData[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  const totals = useMemo(() => computeTotals(data), [data]);

  /**
   * Suggested hosting prices and default discount.
   *
   * Recomputed whenever the tour price moves, but only for fields the user has
   * not touched: once a price is typed by hand it stops being overwritten,
   * which is how the original behaved. Returning the same state object when
   * nothing changed keeps this out of a render loop.
   */
  const overrides = useRef<Set<string>>(new Set());
  const [autoPricing, setAutoPricing] = useState(false);

  useEffect(() => {
    const tour = tour3dPrice(data);
    if (tour <= 0) {
      setAutoPricing(false);
      return;
    }
    setAutoPricing(true);
    const suggested = suggestedHebergementPrices(tour);

    setData((d) => {
      const prices = { ...d.hebergementPrices };
      let changed = false;
      for (const [k, v] of Object.entries(suggested)) {
        if (!overrides.current.has(`h${k}`) && prices[k] !== v) {
          prices[k] = v;
          changed = true;
        }
      }
      const remise = overrides.current.has("remise") ? d.remisePct : REMISE_AUTO_PCT;
      if (!changed && remise === d.remisePct) return d;
      return { ...d, hebergementPrices: prices, remisePct: remise };
    });
    // Deliberately keyed on the inputs of the tour price only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.basePrice, data.typeBien, data.superficie, data.tour3dManualPrice]);

  /**
   * Live preview.
   *
   * Debounced and blob-based: jsPDF renders in a few milliseconds, but
   * regenerating on every keystroke would rebuild the iframe mid-typing. Each
   * blob URL is revoked when replaced — without that, a long editing session
   * leaks one PDF per keystroke into memory.
   */
  const urlRef = useRef<string | null>(null);
  useEffect(() => {
    setRendering(true);
    const timer = setTimeout(() => {
      try {
        const doc = buildDevisPdf(data);
        const url = String(doc.output("bloburl"));
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = url;
        setPreviewUrl(url);
      } catch (e) {
        console.error("[devis] preview failed:", e);
      } finally {
        setRendering(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [data]);

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  function download() {
    buildDevisPdf(data).save(devisFileName(data));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        client_nom: data.clientNom.trim(),
        client_tel: data.clientTel.trim() || null,
        client_email: data.clientEmail.trim() || null,
        client_ville: data.clientVille.trim() || null,
        type_bien: data.typeBien ? typeBienLabel(data) : null,
        type_bien_autre: data.typeBienAutre.trim() || null,
        superficie: data.superficie ? superficieLabel(data.superficie) : null,
        tour3d_price: totals.tour3d,
        options_selected: data.options.map((o) => optionLabel(o)).join(" + ") || null,
        options_total: 0,
        hebergement_duree:
          HEBERGEMENT_DUREES.find((d) => d.value === data.hebergementDuree)?.label || null,
        hebergement_price: totals.hebergement,
        subtotal: totals.subtotal,
        remise_pct: data.remisePct,
        remise_amt: totals.remiseAmt,
        total_ttc: totals.total,
        notes: data.notes.trim() || null,
        validite_jours: data.validiteJours,
        // The base price was typed rather than derived, so the coefficients did
        // the work: that is what "auto pricing" meant in the original. La
        // tranche « Plus de 500 m² » est un prix manuel, donc jamais "auto".
        auto_pricing_used:
          !isManualPricing(data.superficie) &&
          data.basePrice > 0 &&
          !!data.typeBien &&
          !!data.superficie,
        statut: "En attente",
        lead_id: selectedLead?.leadId ?? null,
        pdf_url: null,
      };

      const res = await fetch("/api/devis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);

      // Re-render with the number the database just allocated, so the archived
      // PDF carries it rather than the "N° DEVIS" placeholder.
      const withNumber = { ...data, devisNumber: json.data.devis_number as string };
      setData(withNumber);

      // Archive the exact document. A failure here is logged, not surfaced:
      // the quotation is already saved, and asking the user to redo the form
      // over a storage hiccup would lose their work.
      let saved = json.data;
      try {
        const blob = buildDevisPdf(withNumber).output("blob");
        const form = new FormData();
        form.append("file", blob, devisFileName(withNumber));
        const up = await fetch(`/api/devis/${json.data.id}/pdf`, { method: "POST", body: form });
        if (up.ok) saved = (await up.json()).data;
        else console.error("[devis] archivage du PDF impossible:", up.status);
      } catch (e) {
        console.error("[devis] archivage du PDF impossible:", e);
      }

      onSaved(saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  const toggleOption = (id: DevisOptionId) =>
    set("options", data.options.includes(id) ? data.options.filter((o) => o !== id) : [...data.options, id]);

  const rate = data.hebergementDuree ? prolongationRate(data.hebergementDuree) : 0;

  return (
    <div className="fixed inset-0 z-50 flex bg-black/40">
      <div className="m-4 flex flex-1 min-h-0 bg-surface border border-border rounded-xl shadow-2xl overflow-hidden">
        {/* ── Formulaire ── */}
        <div className="w-[46%] min-w-[360px] flex flex-col border-r border-border">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border flex-shrink-0">
            <h2 className="text-sm font-semibold text-text">Nouveau devis</h2>
            <button onClick={onClose} className="p-1 rounded text-text-muted hover:text-text hover:bg-surface-muted" aria-label="Fermer">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {error && (
              <div className="px-3 py-2 text-xs rounded-lg bg-red-50 border border-red-200 text-red-700">{error}</div>
            )}

            <Section title="Client">
              <LeadPicker
                selected={selectedLead}
                onSelect={applyLead}
                onClear={() => setSelectedLead(null)}
                initialLeadId={initialLeadId}
              />
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Nom / Établissement">
                  <input className={input} value={data.clientNom} onChange={(e) => set("clientNom", e.target.value)} />
                </Field>
                <Field label="Téléphone">
                  <input className={input} value={data.clientTel} onChange={(e) => set("clientTel", e.target.value)} />
                </Field>
                <Field label="Email">
                  <input className={input} value={data.clientEmail} onChange={(e) => set("clientEmail", e.target.value)} />
                </Field>
                <Field label="Ville">
                  <input className={input} value={data.clientVille} onChange={(e) => set("clientVille", e.target.value)} />
                </Field>
              </div>
            </Section>

            <Section title="Type de bien">
              <div className="grid grid-cols-3 gap-2">
                {TYPE_BIEN_OPTIONS.map((t) => (
                  <Chip key={t.value} active={data.typeBien === t.value} onClick={() => set("typeBien", t.value)} sub={`× ${t.coef}`}>
                    {t.label}
                  </Chip>
                ))}
              </div>
              {data.typeBien === "autre" && (
                <Field label="Préciser le type">
                  <input className={input} value={data.typeBienAutre} onChange={(e) => set("typeBienAutre", e.target.value)} />
                </Field>
              )}
            </Section>

            <Section title="Superficie">
              <div className="grid grid-cols-3 gap-2">
                {SUPERFICIE_OPTIONS.map((s) => (
                  <Chip
                    key={s.value}
                    active={data.superficie === s.value}
                    onClick={() => set("superficie", s.value)}
                    sub={s.coef === null ? "sur devis" : `× ${s.coef}`}
                  >
                    {s.label}
                  </Chip>
                ))}
              </div>
            </Section>

            <Section title="Tarification">
              <div className="grid sm:grid-cols-2 gap-3">
                {isManualPricing(data.superficie) ? (
                  <Field
                    label="Prix Tour 3D (MAD, manuel)"
                    hint="« Plus de 500 m² » : sur devis — le prix se saisit directement, sans coefficients."
                  >
                    <input
                      type="number"
                      className={input}
                      value={data.tour3dManualPrice || ""}
                      onChange={(e) => set("tour3dManualPrice", parseFloat(e.target.value) || 0)}
                    />
                  </Field>
                ) : (
                  <Field label="Prix de base (MAD)" hint="Multiplié par les coefficients type et superficie.">
                    <input
                      type="number"
                      className={input}
                      value={data.basePrice || ""}
                      onChange={(e) => set("basePrice", parseFloat(e.target.value) || 0)}
                    />
                  </Field>
                )}
                <Field label="Prix Tour 3D calculé">
                  <div className="px-2.5 py-1.5 text-xs bg-accent/10 border border-accent/30 rounded-lg text-text font-semibold tabular-nums">
                    {fmt(totals.tour3d)} MAD
                  </div>
                </Field>
              </div>
            </Section>

            <Section title="Options incluses">
              <div className="grid gap-2">
                {DEVIS_OPTIONS.map((o) => (
                  <Chip key={o.id} active={data.options.includes(o.id)} onClick={() => toggleOption(o.id)} sub={o.desc}>
                    {o.label}
                  </Chip>
                ))}
              </div>
            </Section>

            <Section title={autoPricing ? "Hébergement de la visite — prix suggérés" : "Hébergement de la visite"}>
              <div className="grid grid-cols-5 gap-2">
                {HEBERGEMENT_DUREES.map((d) => (
                  <Chip key={d.value} active={data.hebergementDuree === d.value} onClick={() => set("hebergementDuree", data.hebergementDuree === d.value ? "" : d.value)}>
                    {d.label}
                  </Chip>
                ))}
              </div>
              <div className="grid grid-cols-5 gap-2">
                {HEBERGEMENT_DUREES.map((d) => (
                  <input
                    key={d.value}
                    type="number"
                    className={`${input} text-center tabular-nums`}
                    placeholder="MAD"
                    value={data.hebergementPrices[d.value] || ""}
                    onChange={(e) => {
                      overrides.current.add(`h${d.value}`);
                      set("hebergementPrices", {
                        ...data.hebergementPrices,
                        [d.value]: parseFloat(e.target.value) || 0,
                      });
                    }}
                  />
                ))}
              </div>
              {rate > 0 && (
                <p className="text-[10px] text-text-subtle">
                  Prolongation au-delà : {rate} MAD / mois supplémentaire. Cette mention apparaît dans le PDF.
                </p>
              )}
            </Section>

            <Section title="Remise et conditions">
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Remise (%)">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className={input}
                    value={data.remisePct || ""}
                    onChange={(e) => {
                      overrides.current.add("remise");
                      set("remisePct", Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)));
                    }}
                  />
                </Field>
                <Field label="Validité (jours)">
                  <input
                    type="number"
                    className={input}
                    value={data.validiteJours || ""}
                    onChange={(e) => set("validiteJours", parseInt(e.target.value, 10) || 30)}
                  />
                </Field>
              </div>
              <Field label="Notes / remarques" hint="Les 4 premières lignes apparaissent dans le PDF.">
                <textarea rows={3} className={input} value={data.notes} onChange={(e) => set("notes", e.target.value)} />
              </Field>
            </Section>

            {/* Totaux */}
            <div className="rounded-xl border border-border bg-surface-subtle p-4 space-y-1.5">
              <div className="flex justify-between text-xs text-text-muted">
                <span>Sous-total HT</span>
                <span className="tabular-nums">{fmt(totals.subtotal)} MAD</span>
              </div>
              {data.remisePct > 0 && (
                <div className="flex justify-between text-xs text-red-600">
                  <span>Remise ({data.remisePct}%)</span>
                  <span className="tabular-nums">— {fmt(totals.remiseAmt)} MAD</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-semibold text-text pt-1.5 border-t border-border">
                <span>Total net HT</span>
                <span className="tabular-nums">{fmt(totals.total)} MAD</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 px-5 py-3.5 border-t border-border flex-shrink-0">
            <button
              onClick={download}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg border border-border text-text-muted hover:text-text hover:bg-surface-muted transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Télécharger le PDF
            </button>
            <button
              onClick={save}
              disabled={saving || !data.clientNom.trim()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-accent text-accent-foreground hover:bg-accent-hover disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? "Enregistrement…" : "Enregistrer le devis"}
            </button>
          </div>
        </div>

        {/* ── Aperçu ── */}
        <div className="flex-1 flex flex-col bg-surface-muted min-w-0">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border flex-shrink-0">
            <h2 className="text-sm font-semibold text-text">Aperçu</h2>
            <span className="text-[11px] text-text-subtle flex items-center gap-1.5">
              {rendering && <Loader2 className="w-3 h-3 animate-spin" />}
              {data.devisNumber ?? "numéro attribué à l'enregistrement"}
            </span>
          </div>
          <div className="flex-1 min-h-0 p-3">
            {previewUrl ? (
              <iframe src={previewUrl} title="Aperçu du devis" className="w-full h-full rounded-lg border border-border bg-white" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-text-subtle">
                Génération de l&apos;aperçu…
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Archive, Loader2, Check, AlertTriangle } from "lucide-react";
import type { Lead } from "@/types";
import { getLeadAlerts } from "@/lib/lead-alerts";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUT_OPTIONS = [
  "Nouveau",
  "Contacté",
  "Intéressé",
  "Négociation",
  "Gagné",
  "Perdu",
  "En pause",
];

const ALERT_META: Record<string, { icon: React.ElementType; title: string }> = {
  "relance-en-retard": { icon: RefreshCw, title: "Relance en retard" },
  "jamais-contacte": { icon: Clock, title: "Jamais contacté" },
  "doublon-non-resolu": { icon: Copy, title: "Doublon non résolu" },
};

import { RefreshCw, Clock, Copy } from "lucide-react";

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function FieldSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h3 className="text-[10px] font-semibold text-text-subtle uppercase tracking-widest mb-3">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 items-baseline">
      <div className="text-xs text-text-subtle">{label}</div>
      <div className="text-sm text-text break-words">{value && value.trim() ? value : "—"}</div>
    </div>
  );
}

function EditField({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
      <label htmlFor={id} className="text-xs text-text-subtle">{label}</label>
      <div>{children}</div>
    </div>
  );
}

function fmtDateForInput(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso; // might be some invalid string, leave it
  // Return YYYY-MM-DD
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// ---------------------------------------------------------------------------
// LeadDrawer
// ---------------------------------------------------------------------------

export interface LeadDrawerProps {
  lead: Lead;
  onClose: () => void;
  // Archive props
  onArchiveRequest: (id: string) => void;
  archiveConfirmId: string | null;
  archivingId: string | null;
  onArchiveConfirm: (id: string) => void;
  onArchiveCancel: () => void;
}

export function LeadDrawer({
  lead,
  onClose,
  onArchiveRequest,
  archiveConfirmId,
  archivingId,
  onArchiveConfirm,
  onArchiveCancel,
}: LeadDrawerProps) {
  const router = useRouter();
  const alerts = getLeadAlerts(lead);

  const isConfirmingArchive = archiveConfirmId === lead.leadId;
  const isArchiving = archivingId === lead.leadId;

  const [formData, setFormData] = useState<Lead>(lead);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const VILLE_OPTIONS = ["Rabat", "Casablanca", "Kénitra"];
  const STANDARD_TYPE_BIEN = ["Appartement", "Villa", "Bureau", "Local commercial", "Terrain"];

  const [isCustomVille, setIsCustomVille] = useState(
    !!lead.ville && !VILLE_OPTIONS.includes(lead.ville)
  );
  const [isCustomTypeBien, setIsCustomTypeBien] = useState(
    !!lead.typeDeBien && !STANDARD_TYPE_BIEN.includes(lead.typeDeBien)
  );

  // Sync state when lead changes (e.g., after successful save + router.refresh)
  useEffect(() => {
    setFormData(lead);
    setIsCustomVille(!!lead.ville && !VILLE_OPTIONS.includes(lead.ville));
    setIsCustomTypeBien(!!lead.typeDeBien && !STANDARD_TYPE_BIEN.includes(lead.typeDeBien));
    // Reset status when switching leads
    setSaveStatus("idle");
  }, [lead]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleChange(key: keyof Lead, value: string) {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setSaveStatus("idle");
  }

  async function handleSave() {
    // Collect changed fields
    const fieldsToUpdate: Partial<Lead> = {};
    const editableKeys: (keyof Lead)[] = [
      "date1erContact",
      "appelTelephonique",
      "statut",
      "contacteSurWhatsapp",
      "devisEnvoye",
      "demoEnvoye",
      "prixProposeMAD",
      "dateDeEchange",
      "notes",
      "ville",
      "typeDeBien",
    ];

    for (const k of editableKeys) {
      if (formData[k] !== lead[k]) {
        fieldsToUpdate[k] = formData[k] as any;
      }
    }

    if (Object.keys(fieldsToUpdate).length === 0) {
      setSaveStatus("success");
      return;
    }

    setIsSaving(true);
    setSaveStatus("idle");
    try {
      const res = await fetch(`/api/leads/${lead.leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fieldsToUpdate),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erreur lors de la sauvegarde");
      }

      setSaveStatus("success");
      // Ask Next.js to re-fetch Server Components (like the leads list)
      router.refresh();
    } catch (err) {
      setSaveStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" aria-hidden="true" onClick={onClose} />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Fiche lead : ${lead.nom}`}
        className="fixed inset-y-0 right-0 z-50 w-full max-w-sm md:max-w-md bg-surface border-l border-border flex flex-col shadow-md"
      >
        {/* Header */}
        <div className="h-14 border-b border-border px-4 flex items-center gap-3 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text truncate">{lead.nom || "—"}</p>
            <p className="text-xs text-text-subtle">{lead.leadId}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded text-text-muted hover:text-text hover:bg-surface-muted transition-colors flex-shrink-0"
            aria-label="Fermer"
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 py-5">
          {/* Alerts */}
          {alerts.length > 0 && (
            <div className="mb-6 space-y-1.5">
              {alerts.map((a) => {
                const { icon: Icon, title } = ALERT_META[a.kind];
                return (
                  <div
                    key={a.kind}
                    className="flex items-start gap-2 px-3 py-2 border border-border rounded bg-surface-muted"
                  >
                    <Icon size={13} className="flex-shrink-0 mt-0.5 text-text-muted" aria-hidden="true" />
                    <div>
                      <p className="text-xs font-medium text-text">{title}</p>
                      <p className="text-xs text-text-muted">{a.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Fields */}
          <FieldSection title="Contact">
            <ReadOnlyField label="Nom" value={lead.nom} />
            <ReadOnlyField label="Téléphone" value={lead.telephone} />
            <ReadOnlyField label="Canal" value={lead.canal} />
            <EditField label="Ville" id="f-ville">
              <div className="flex flex-col gap-2 w-full">
                <select
                  id="f-ville"
                  value={isCustomVille ? "Autre" : formData.ville || ""}
                  onChange={(e) => {
                    if (e.target.value === "Autre") {
                      setIsCustomVille(true);
                      handleChange("ville", "");
                    } else {
                      setIsCustomVille(false);
                      handleChange("ville", e.target.value);
                    }
                  }}
                  className="input-base text-sm w-full h-8"
                >
                  <option value="">—</option>
                  <option value="Rabat">Rabat</option>
                  <option value="Casablanca">Casablanca</option>
                  <option value="Kénitra">Kénitra</option>
                  <option value="Autre">Autre</option>
                </select>
                {isCustomVille && (
                  <input
                    type="text"
                    value={formData.ville || ""}
                    onChange={(e) => handleChange("ville", e.target.value)}
                    className="input-base text-sm w-full h-8"
                    placeholder="Saisissez la ville..."
                    autoFocus
                  />
                )}
              </div>
            </EditField>
          </FieldSection>

          <FieldSection title="Projet">
            <EditField label="Type de bien" id="f-typeDeBien">
              <div className="flex flex-col gap-2 w-full">
                <select
                  id="f-typeDeBien"
                  value={isCustomTypeBien ? "Autre" : formData.typeDeBien || ""}
                  onChange={(e) => {
                    if (e.target.value === "Autre") {
                      setIsCustomTypeBien(true);
                      handleChange("typeDeBien", "");
                    } else {
                      setIsCustomTypeBien(false);
                      handleChange("typeDeBien", e.target.value);
                    }
                  }}
                  className="input-base text-sm w-full h-8"
                >
                  <option value="">—</option>
                  {STANDARD_TYPE_BIEN.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                  <option value="Autre">Autre</option>
                </select>
                {isCustomTypeBien && (
                  <input
                    type="text"
                    value={formData.typeDeBien || ""}
                    onChange={(e) => handleChange("typeDeBien", e.target.value)}
                    className="input-base text-sm w-full h-8"
                    placeholder="Saisissez le type de bien..."
                    autoFocus
                  />
                )}
              </div>
            </EditField>
            <ReadOnlyField label="Surface (m²)" value={lead.surface} />
            <ReadOnlyField label="Date formulaire" value={lead.dateFormulaire} />
            <ReadOnlyField label="Doublon" value={lead.doublon} />
          </FieldSection>

          <FieldSection title="Relances (Lecture seule)">
            <ReadOnlyField label="Relance 1 (auto)" value={lead.relance1Auto} />
            <ReadOnlyField label="Relance 2 (auto)" value={lead.relance2Auto} />
            <ReadOnlyField label="Relance 3 (auto)" value={lead.relance3Auto} />
          </FieldSection>

          <FieldSection title="Suivi commercial">
            <EditField label="Date 1er contact" id="f-date1">
              <input
                id="f-date1"
                type="date"
                value={fmtDateForInput(formData.date1erContact)}
                onChange={(e) => handleChange("date1erContact", e.target.value)}
                className="input-base text-sm w-full h-8"
              />
            </EditField>

            <EditField label="Date d'échange" id="f-date2">
              <input
                id="f-date2"
                type="date"
                value={fmtDateForInput(formData.dateDeEchange)}
                onChange={(e) => handleChange("dateDeEchange", e.target.value)}
                className="input-base text-sm w-full h-8"
              />
            </EditField>

            <EditField label="Statut" id="f-statut">
              <input
                id="f-statut"
                list="statut-options"
                value={formData.statut}
                onChange={(e) => handleChange("statut", e.target.value)}
                className="input-base text-sm w-full h-8"
                placeholder="Ex: Contacté"
              />
              <datalist id="statut-options">
                {STATUT_OPTIONS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </EditField>

            <EditField label="Appel téléphonique" id="f-appel">
              <input
                id="f-appel"
                type="text"
                value={formData.appelTelephonique}
                onChange={(e) => handleChange("appelTelephonique", e.target.value)}
                className="input-base text-sm w-full h-8"
              />
            </EditField>

            <EditField label="WhatsApp" id="f-whatsapp">
              <select
                id="f-whatsapp"
                value={formData.contacteSurWhatsapp}
                onChange={(e) => handleChange("contacteSurWhatsapp", e.target.value)}
                className="input-base text-sm w-full h-8"
              >
                <option value="">—</option>
                <option value="Oui">Oui</option>
                <option value="Non">Non</option>
              </select>
            </EditField>

            <EditField label="Devis envoyé" id="f-devis">
              <select
                id="f-devis"
                value={formData.devisEnvoye}
                onChange={(e) => handleChange("devisEnvoye", e.target.value)}
                className="input-base text-sm w-full h-8"
              >
                <option value="">—</option>
                <option value="Oui">Oui</option>
                <option value="Non">Non</option>
              </select>
            </EditField>

            <EditField label="Démo envoyée" id="f-demo">
              <select
                id="f-demo"
                value={formData.demoEnvoye}
                onChange={(e) => handleChange("demoEnvoye", e.target.value)}
                className="input-base text-sm w-full h-8"
              >
                <option value="">—</option>
                <option value="Oui">Oui</option>
                <option value="Non">Non</option>
              </select>
            </EditField>

            <EditField label="Prix proposé (MAD)" id="f-prix">
              <input
                id="f-prix"
                type="number"
                value={formData.prixProposeMAD}
                onChange={(e) => handleChange("prixProposeMAD", e.target.value)}
                className="input-base text-sm w-full h-8"
              />
            </EditField>
          </FieldSection>

          <FieldSection title="Notes">
            <textarea
              aria-label="Notes"
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              className="input-base text-sm w-full h-24 resize-y py-2"
              placeholder="Ajouter des notes..."
            />
          </FieldSection>
        </div>

        {/* Footer — Actions */}
        <div className="border-t border-border px-4 py-3 flex-shrink-0 bg-surface flex flex-col gap-3">
          {/* Save Status / Errors */}
          {saveStatus === "error" && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-2 rounded text-xs border border-red-200">
              <AlertTriangle size={14} />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            {/* Archive button */}
            {isConfirmingArchive ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted">Confirmer ?</span>
                <button
                  type="button"
                  onClick={() => onArchiveConfirm(lead.leadId)}
                  disabled={isArchiving}
                  className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
                >
                  {isArchiving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                  Oui
                </button>
                <button
                  type="button"
                  onClick={onArchiveCancel}
                  disabled={isArchiving}
                  className="btn-secondary text-xs px-3 py-1.5"
                >
                  Non
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onArchiveRequest(lead.leadId)}
                disabled={isArchiving || isSaving}
                className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 text-text-muted"
              >
                <Archive size={13} aria-hidden="true" />
                Archiver
              </button>
            )}

            {/* Save Button */}
            <div className="flex items-center gap-3">
              {saveStatus === "success" && (
                <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                  <Check size={14} /> Enregistré
                </span>
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || isArchiving}
                className="btn-primary text-xs px-4 py-1.5 flex items-center gap-1.5"
              >
                {isSaving && <Loader2 size={13} className="animate-spin" />}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

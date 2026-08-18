"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Archive,
  Loader2,
  Check,
  AlertTriangle,
  Phone,
  MessageCircle,
  RefreshCw,
  Clock,
  Copy,
} from "lucide-react";
import type { Lead, LeadAlertKind } from "@/types";
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

const CANAL_OPTIONS = [
  "Instagram",
  "Facebook",
  "WhatsApp",
  "Référence",
  "Site web",
  "Autre",
];

const TYPE_BIEN_OPTIONS = [
  "Appartement",
  "Villa",
  "Bureau",
  "Local commercial",
  "Terrain",
  "Autre",
];

const STATUS_STYLES: Record<string, string> = {
  Nouveau: "bg-blue-50 text-blue-700 border-blue-200",
  Contacté: "bg-slate-50 text-slate-700 border-slate-200",
  Intéressé: "bg-amber-50 text-amber-700 border-amber-200",
  Négociation: "bg-indigo-50 text-indigo-700 border-indigo-200",
  Gagné: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Perdu: "bg-rose-50 text-rose-700 border-rose-200",
  "En pause": "bg-yellow-50 text-yellow-800 border-yellow-200",
};

const ALERT_META: Record<
  LeadAlertKind,
  { icon: React.ElementType; title: string; colorClass: string }
> = {
  "relance-en-retard": {
    icon: RefreshCw,
    title: "Relance en retard",
    colorClass: "text-rose-500",
  },
  "jamais-contacte": {
    icon: Clock,
    title: "Jamais contacté",
    colorClass: "text-amber-600",
  },
  "doublon-non-resolu": {
    icon: Copy,
    title: "Doublon non résolu",
    colorClass: "text-blue-500",
  },
};

type Tab = "infos" | "suivi" | "notes";

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FieldRow({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
      <label htmlFor={id} className="text-xs font-medium text-text-subtle">
        {label}
      </label>
      <div>{children}</div>
    </div>
  );
}

function ToggleSwitch({
  id,
  checked,
  onChange,
  label,
}: {
  id: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  label: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={[
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1",
        checked ? "bg-accent" : "bg-border-strong",
      ].join(" ")}
    >
      <span
        aria-hidden="true"
        className={[
          "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition duration-200 ease-in-out",
          checked ? "translate-x-4" : "translate-x-0",
        ].join(" ")}
      />
    </button>
  );
}

function fmtDateForInput(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// ---------------------------------------------------------------------------
// LeadDetailCard
// ---------------------------------------------------------------------------

export interface LeadDetailCardProps {
  lead: Lead;
  onClose: () => void;
  onArchiveRequest: (id: string) => void;
  archiveConfirmId: string | null;
  archivingId: string | null;
  onArchiveConfirm: (id: string) => void;
  onArchiveCancel: () => void;
}

export function LeadDetailCard({
  lead,
  onClose,
  onArchiveRequest,
  archiveConfirmId,
  archivingId,
  onArchiveConfirm,
  onArchiveCancel,
}: LeadDetailCardProps) {
  const router = useRouter();
  const alerts = getLeadAlerts(lead);

  const isConfirmingArchive = archiveConfirmId === lead.leadId;
  const isArchiving = archivingId === lead.leadId;

  const [activeTab, setActiveTab] = useState<Tab>("infos");
  const [formData, setFormData] = useState<Lead>(lead);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">(
    "idle"
  );
  const [errorMessage, setErrorMessage] = useState("");

  // Sync state when lead changes
  useEffect(() => {
    setFormData(lead);
    setSaveStatus("idle");
  }, [lead]);

  function handleChange(key: keyof Lead, value: string) {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setSaveStatus("idle");
  }

  function handleToggle(key: keyof Lead, value: boolean) {
    handleChange(key, value ? "Oui" : "Non");
  }

  async function handleSave() {
    const fieldsToUpdate: Partial<Lead> = {};
    const editableKeys: (keyof Lead)[] = [
      "nom",
      "telephone",
      "canal",
      "ville",
      "typeDeBien",
      "surface",
      "dateFormulaire",
      "date1erContact",
      "appelTelephonique",
      "statut",
      "contacteSurWhatsapp",
      "devisEnvoye",
      "demoEnvoye",
      "prixProposeMAD",
      "dateDeEchange",
      "notes",
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
      router.refresh();
    } catch (err) {
      setSaveStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Erreur inconnue"
      );
    } finally {
      setIsSaving(false);
    }
  }

  const phoneClean = lead.telephone?.replace(/\s/g, "") || "";
  const whatsappUrl = phoneClean
    ? `https://wa.me/${phoneClean.replace(/^\+/, "")}`
    : "";

  const tabs: { key: Tab; label: string }[] = [
    { key: "infos", label: "Infos" },
    { key: "suivi", label: "Suivi" },
    { key: "notes", label: "Notes" },
  ];

  return (
    <div className="flex flex-col h-full bg-surface border-l border-border animate-in slide-in-from-right-2 duration-200">
      {/* ── Header ── */}
      <div className="border-b border-border px-4 py-3 flex-shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-sm font-semibold text-text truncate">
                {lead.nom || "—"}
              </h2>
              {lead.statut && (
                <span
                  className={[
                    "text-[10px] border rounded px-1.5 py-0.5 font-medium whitespace-nowrap flex-shrink-0",
                    STATUS_STYLES[lead.statut] ||
                      "bg-surface-muted text-text-muted border-border",
                  ].join(" ")}
                >
                  {lead.statut}
                </span>
              )}
            </div>
            <p className="text-[11px] text-text-subtle">
              {lead.leadId}
              {lead.ville ? ` · ${lead.ville}` : ""}
              {lead.canal ? ` · ${lead.canal}` : ""}
            </p>
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

        {/* Quick actions */}
        <div className="flex items-center gap-2 mt-2.5">
          {phoneClean && (
            <a
              href={`tel:${phoneClean}`}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-text-muted border border-border rounded px-2.5 py-1 hover:bg-surface-muted hover:text-text transition-colors"
            >
              <Phone size={12} aria-hidden="true" />
              Appeler
            </a>
          )}
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 border border-emerald-200 bg-emerald-50 rounded px-2.5 py-1 hover:bg-emerald-100 transition-colors"
            >
              <MessageCircle size={12} aria-hidden="true" />
              WhatsApp
            </a>
          )}
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {alerts.map((a) => {
              const { icon: Icon, title, colorClass } = ALERT_META[a.kind];
              return (
                <span
                  key={a.kind}
                  className="inline-flex items-center gap-1 text-[10px] font-medium border border-border rounded px-2 py-0.5 bg-surface-muted"
                  title={a.message}
                >
                  <Icon size={11} className={colorClass} aria-hidden="true" />
                  {title}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex border-b border-border flex-shrink-0">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key)}
            className={[
              "flex-1 px-3 py-2 text-xs font-medium text-center transition-colors relative",
              activeTab === t.key
                ? "text-accent"
                : "text-text-muted hover:text-text",
            ].join(" ")}
          >
            {t.label}
            {activeTab === t.key && (
              <span className="absolute bottom-0 inset-x-0 h-0.5 bg-accent" />
            )}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {activeTab === "infos" && (
          <>
            <FieldRow label="Nom" id="d-nom">
              <input
                id="d-nom"
                type="text"
                value={formData.nom}
                onChange={(e) => handleChange("nom", e.target.value)}
                className="input-base text-sm w-full h-8"
                placeholder="Ex: Jean Dupont"
              />
            </FieldRow>

            <FieldRow label="Téléphone" id="d-telephone">
              <input
                id="d-telephone"
                type="tel"
                value={formData.telephone}
                onChange={(e) => handleChange("telephone", e.target.value)}
                className="input-base text-sm w-full h-8"
                placeholder="Ex: +212 600 000 000"
              />
            </FieldRow>

            <FieldRow label="Canal" id="d-canal">
              <select
                id="d-canal"
                value={formData.canal}
                onChange={(e) => handleChange("canal", e.target.value)}
                className="input-base text-sm w-full h-8"
              >
                <option value="">—</option>
                {CANAL_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </FieldRow>

            <FieldRow label="Ville" id="d-ville">
              <input
                id="d-ville"
                type="text"
                value={formData.ville}
                onChange={(e) => handleChange("ville", e.target.value)}
                className="input-base text-sm w-full h-8"
                placeholder="Ex: Casablanca"
              />
            </FieldRow>

            <FieldRow label="Type de bien" id="d-typeDeBien">
              <select
                id="d-typeDeBien"
                value={formData.typeDeBien}
                onChange={(e) => handleChange("typeDeBien", e.target.value)}
                className="input-base text-sm w-full h-8"
              >
                <option value="">—</option>
                {TYPE_BIEN_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </FieldRow>

            <FieldRow label="Surface (m²)" id="d-surface">
              <input
                id="d-surface"
                type="text"
                value={formData.surface}
                onChange={(e) => handleChange("surface", e.target.value)}
                className="input-base text-sm w-full h-8"
                placeholder="Ex: 120"
              />
            </FieldRow>

            <FieldRow label="Date formulaire" id="d-dateFormulaire">
              <input
                id="d-dateFormulaire"
                type="date"
                value={fmtDateForInput(formData.dateFormulaire)}
                onChange={(e) =>
                  handleChange("dateFormulaire", e.target.value)
                }
                className="input-base text-sm w-full h-8"
              />
            </FieldRow>

            {lead.doublon && (
              <div className="flex items-center gap-2 px-3 py-2 border border-blue-200 rounded bg-blue-50 text-xs text-blue-700">
                <Copy size={12} aria-hidden="true" />
                {lead.doublon}
              </div>
            )}
          </>
        )}

        {activeTab === "suivi" && (
          <>
            <FieldRow label="Statut" id="d-statut">
              <select
                id="d-statut"
                value={formData.statut}
                onChange={(e) => handleChange("statut", e.target.value)}
                className="input-base text-sm w-full h-8"
              >
                <option value="">—</option>
                {STATUT_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </FieldRow>

            <FieldRow label="1er contact" id="d-date1erContact">
              <input
                id="d-date1erContact"
                type="date"
                value={fmtDateForInput(formData.date1erContact)}
                onChange={(e) =>
                  handleChange("date1erContact", e.target.value)
                }
                className="input-base text-sm w-full h-8"
              />
            </FieldRow>

            <FieldRow label="Appel tél." id="d-appel">
              <div className="flex items-center gap-2">
                <ToggleSwitch
                  id="d-appel"
                  checked={formData.appelTelephonique === "Oui"}
                  onChange={(val) => handleToggle("appelTelephonique", val)}
                  label="Appel téléphonique"
                />
                <span className="text-xs text-text-muted">
                  {formData.appelTelephonique === "Oui" ? "Oui" : "Non"}
                </span>
              </div>
            </FieldRow>

            <FieldRow label="WhatsApp" id="d-whatsapp">
              <div className="flex items-center gap-2">
                <ToggleSwitch
                  id="d-whatsapp"
                  checked={formData.contacteSurWhatsapp === "Oui"}
                  onChange={(val) =>
                    handleToggle("contacteSurWhatsapp", val)
                  }
                  label="Contacté sur WhatsApp"
                />
                <span className="text-xs text-text-muted">
                  {formData.contacteSurWhatsapp === "Oui" ? "Oui" : "Non"}
                </span>
              </div>
            </FieldRow>

            <FieldRow label="Devis envoyé" id="d-devis">
              <div className="flex items-center gap-2">
                <ToggleSwitch
                  id="d-devis"
                  checked={formData.devisEnvoye === "Oui"}
                  onChange={(val) => handleToggle("devisEnvoye", val)}
                  label="Devis envoyé"
                />
                <span className="text-xs text-text-muted">
                  {formData.devisEnvoye === "Oui" ? "Oui" : "Non"}
                </span>
              </div>
            </FieldRow>

            <FieldRow label="Démo envoyée" id="d-demo">
              <div className="flex items-center gap-2">
                <ToggleSwitch
                  id="d-demo"
                  checked={formData.demoEnvoye === "Oui"}
                  onChange={(val) => handleToggle("demoEnvoye", val)}
                  label="Démo envoyée"
                />
                <span className="text-xs text-text-muted">
                  {formData.demoEnvoye === "Oui" ? "Oui" : "Non"}
                </span>
              </div>
            </FieldRow>

            <FieldRow label="Prix (MAD)" id="d-prix">
              <input
                id="d-prix"
                type="text"
                value={formData.prixProposeMAD}
                onChange={(e) =>
                  handleChange("prixProposeMAD", e.target.value)
                }
                className="input-base text-sm w-full h-8"
                placeholder="Ex: 50 000"
              />
            </FieldRow>

            <FieldRow label="Dernier échange" id="d-dateDeEchange">
              <input
                id="d-dateDeEchange"
                type="date"
                value={fmtDateForInput(formData.dateDeEchange)}
                onChange={(e) =>
                  handleChange("dateDeEchange", e.target.value)
                }
                className="input-base text-sm w-full h-8"
              />
            </FieldRow>

            {/* Relances auto — read-only */}
            <div className="border-t border-border pt-3 mt-3">
              <p className="text-[10px] font-semibold text-text-subtle uppercase tracking-widest mb-2.5">
                Relances automatiques
              </p>
              <div className="space-y-2">
                {[
                  { label: "Relance 1", value: lead.relance1Auto },
                  { label: "Relance 2", value: lead.relance2Auto },
                  { label: "Relance 3", value: lead.relance3Auto },
                ].map((r) => (
                  <div
                    key={r.label}
                    className="grid grid-cols-[120px_1fr] gap-2 items-center"
                  >
                    <span className="text-xs text-text-subtle">
                      {r.label}
                    </span>
                    <span className="text-xs text-text-muted">
                      {r.value || "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === "notes" && (
          <textarea
            aria-label="Notes"
            value={formData.notes}
            onChange={(e) => handleChange("notes", e.target.value)}
            className="input-base text-sm w-full h-48 resize-y py-2"
            placeholder="Ajouter des notes sur ce lead..."
          />
        )}
      </div>

      {/* ── Footer ── */}
      <div className="border-t border-border px-4 py-3 flex-shrink-0 bg-surface space-y-2">
        {saveStatus === "error" && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-2 rounded text-xs border border-red-200">
            <AlertTriangle size={14} />
            <span className="flex-1">{errorMessage}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          {/* Archive */}
          {isConfirmingArchive ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted">Confirmer ?</span>
              <button
                type="button"
                onClick={() => onArchiveConfirm(lead.leadId)}
                disabled={isArchiving}
                className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
              >
                {isArchiving ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Check size={12} />
                )}
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

          {/* Save */}
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
    </div>
  );
}

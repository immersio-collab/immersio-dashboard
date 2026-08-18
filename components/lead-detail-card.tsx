"use client";

import { useState, useEffect, useRef } from "react";
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
  FileText,
  Upload,
  Trash2,
  ExternalLink,
  Calendar,
  CalendarClock,
  CalendarCheck,
  CheckCircle2,
} from "lucide-react";
import type { Lead, LeadAlertKind } from "@/types";
import { getLeadAlerts, getRappelStatus, isRappelDue, isRappelToday } from "@/lib/lead-alerts";
import { RelanceVariationsModal } from "@/components/relance-variations-modal";
import { formatPhoneForWhatsApp, getWhatsAppUrl } from "@/lib/utils";

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
  "Immobilier",
  "Cabinet Médical",
  "Ecole",
  "Bureau",
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
  "rappel-du": {
    icon: CalendarClock,
    title: "Rendez-vous / Rappel dû",
    colorClass: "text-amber-600",
  },
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

function fmtDateTimeForInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
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
  const isConfirmingArchive = archiveConfirmId === lead.leadId;
  const isArchiving = archivingId === lead.leadId;

  const [activeTab, setActiveTab] = useState<Tab>("infos");
  const [formData, setFormData] = useState<Lead>(lead);
  const alerts = getLeadAlerts(formData);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">(
    "idle"
  );
  const [errorMessage, setErrorMessage] = useState("");

  const devisInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingDevis, setIsUploadingDevis] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const VILLE_OPTIONS = ["Rabat", "Casablanca", "Kénitra"];

  const [isCustomCanal, setIsCustomCanal] = useState(
    !!lead.canal && !CANAL_OPTIONS.includes(lead.canal as any) && lead.canal !== "Autre"
  );
  const [isCustomVille, setIsCustomVille] = useState(
    !!lead.ville && !VILLE_OPTIONS.includes(lead.ville) && lead.ville !== "Autre"
  );
  const [isCustomTypeBien, setIsCustomTypeBien] = useState(
    !!lead.typeDeBien && !TYPE_BIEN_OPTIONS.includes(lead.typeDeBien as any) && lead.typeDeBien !== "Autre"
  );

  // Sync state when lead changes
  useEffect(() => {
    setFormData(lead);
    setIsCustomCanal(!!lead.canal && !CANAL_OPTIONS.includes(lead.canal as any) && lead.canal !== "Autre");
    setIsCustomVille(!!lead.ville && !VILLE_OPTIONS.includes(lead.ville) && lead.ville !== "Autre");
    setIsCustomTypeBien(!!lead.typeDeBien && !TYPE_BIEN_OPTIONS.includes(lead.typeDeBien as any) && lead.typeDeBien !== "Autre");
    setSaveStatus("idle");
  }, [lead]);

  function handleChange(key: keyof Lead, value: any) {
    setFormData((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "dateDeEchange" && value) {
        return updateRelances(next as Lead, value);
      }
      return next;
    });
    setSaveStatus("idle");
  }

  function updateRelances(prev: Lead, newDateStr: string) {
    const base = new Date(newDateStr);
    if (isNaN(base.getTime())) return prev;
    
    const add = (d: number) => {
      const nd = new Date(base);
      nd.setDate(nd.getDate() + d);
      return nd.toISOString();
    };
    
    return {
      ...prev,
      relance1Auto: prev.relance1Fait ? prev.relance1Auto : add(1),
      relance2Auto: prev.relance2Fait ? prev.relance2Auto : add(3),
      relance3Auto: prev.relance3Fait ? prev.relance3Auto : add(7),
    };
  }

  function handleRelanceDateChange(relanceNum: 1 | 2 | 3, newDateStr: string) {
    if (!newDateStr) {
      setFormData((prev) => ({ ...prev, [`relance${relanceNum}Auto`]: "" }));
      setSaveStatus("idle");
      return;
    }

    const base = new Date(newDateStr);
    if (isNaN(base.getTime())) return;

    const add = (d: number) => {
      const nd = new Date(base);
      nd.setDate(nd.getDate() + d);
      return nd.toISOString();
    };

    setFormData((prev) => {
      const next = { ...prev, [`relance${relanceNum}Auto`]: base.toISOString() } as Lead;
      
      if (relanceNum === 1) {
        if (!next.relance2Fait) next.relance2Auto = add(2);
        if (!next.relance3Fait) next.relance3Auto = add(6);
      } else if (relanceNum === 2) {
        if (!next.relance3Fait) next.relance3Auto = add(4);
      }
      
      return next;
    });
    setSaveStatus("idle");
  }

  function handleRelanceToggle(relanceNum: 1 | 2 | 3, checked: boolean) {
    setFormData((prev) => {
      const today = new Date().toISOString();
      const next = {
        ...prev,
        [`relance${relanceNum}Fait`]: checked,
      } as Lead;
      
      if (checked) {
        next.dateDeEchange = today;
        return updateRelances(next, today);
      } else {
        // When unchecking, revert dateDeEchange to the last saved state
        next.dateDeEchange = lead.dateDeEchange;
        const baseDate = lead.dateDeEchange || lead.dateFormulaire || today;
        return updateRelances(next, baseDate);
      }
    });
    setSaveStatus("idle");
  }

  function handleToggle(key: keyof Lead, value: boolean) {
    handleChange(key, value ? "Oui" : "Non");
  }

  async function handleDevisUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      setUploadError("Seuls les fichiers PDF sont acceptés.");
      return;
    }

    setIsUploadingDevis(true);
    setUploadError(null);

    try {
      const data = new FormData();
      data.append("file", file);

      const res = await fetch(`/api/leads/${lead.leadId}/devis`, {
        method: "POST",
        body: data,
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Erreur lors de l'envoi du devis.");
      }

      const json = await res.json();
      setFormData((prev) => ({
        ...prev,
        devisUrl: json.devisUrl,
        devisEnvoye: "Oui",
      }));
      router.refresh();
    } catch (err: any) {
      setUploadError(err.message || "Échec de l'importation.");
    } finally {
      setIsUploadingDevis(false);
      if (devisInputRef.current) devisInputRef.current.value = "";
    }
  }

  async function handleDevisDelete() {
    if (!confirm("Voulez-vous vraiment supprimer ce devis PDF ?")) return;

    setIsUploadingDevis(true);
    setUploadError(null);
    try {
      const res = await fetch(`/api/leads/${lead.leadId}/devis`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Erreur lors de la suppression.");
      }

      setFormData((prev) => ({
        ...prev,
        devisUrl: undefined,
      }));
      router.refresh();
    } catch (err: any) {
      setUploadError(err.message || "Échec de la suppression.");
    } finally {
      setIsUploadingDevis(false);
    }
  }

  async function handleSave() {
    const fieldsToUpdate: Partial<Lead> = {};
    const editableKeys: (keyof Lead)[] = [
      "nom",
      "telephone",
      "email",
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
      "devisUrl",
      "demoEnvoye",
      "prixProposeMAD",
      "dateDeEchange",
      "notes",
      "rappelDate",
      "rappelNote",
      "rappelFait",
      "relance1Auto",
      "relance2Auto",
      "relance3Auto",
      "relance1Fait",
      "relance2Fait",
      "relance3Fait",
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

  const rawPhone = formData.telephone || lead.telephone || "";
  const phoneFormatted = formatPhoneForWhatsApp(rawPhone);
  const whatsappUrl = getWhatsAppUrl(rawPhone);

  const tabs: { key: Tab; label: string }[] = [
    { key: "infos", label: "Infos" },
    { key: "suivi", label: "Suivi" },
    { key: "notes", label: "Notes" },
  ];

  const rappelStatus = getRappelStatus(formData);

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
          {phoneFormatted && (
            <a
              href={`tel:+${phoneFormatted}`}
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
              const meta = ALERT_META[a.kind] || {
                icon: AlertTriangle,
                title: "Alerte",
                colorClass: "text-amber-500",
              };
              const { icon: Icon, title, colorClass } = meta;
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

            <FieldRow label="Email" id="d-email">
              <input
                id="d-email"
                type="email"
                value={formData.email || ""}
                onChange={(e) => handleChange("email", e.target.value)}
                className="input-base text-sm w-full h-8"
                placeholder="Ex: contact@email.com"
              />
            </FieldRow>

            <FieldRow label="Canal" id="d-canal">
              <div className="flex flex-col gap-2 w-full">
                <select
                  id="d-canal"
                  value={isCustomCanal ? "Autre" : formData.canal}
                  onChange={(e) => {
                    if (e.target.value === "Autre") {
                      setIsCustomCanal(true);
                      handleChange("canal", "");
                    } else {
                      setIsCustomCanal(false);
                      handleChange("canal", e.target.value);
                    }
                  }}
                  className="input-base text-sm w-full h-8"
                >
                  <option value="">—</option>
                  {CANAL_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                {isCustomCanal && (
                  <input
                    type="text"
                    value={formData.canal}
                    onChange={(e) => handleChange("canal", e.target.value)}
                    className="input-base text-sm w-full h-8"
                    placeholder="Saisissez le canal..."
                    autoFocus
                  />
                )}
              </div>
            </FieldRow>

            <FieldRow label="Ville" id="d-ville">
              <div className="flex flex-col gap-2 w-full">
                <select
                  id="d-ville"
                  value={isCustomVille ? "Autre" : formData.ville}
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
                    value={formData.ville}
                    onChange={(e) => handleChange("ville", e.target.value)}
                    className="input-base text-sm w-full h-8"
                    placeholder="Saisissez la ville..."
                    autoFocus
                  />
                )}
              </div>
            </FieldRow>

            <FieldRow label="Type de bien" id="d-typeDeBien">
              <div className="flex flex-col gap-2 w-full">
                <select
                  id="d-typeDeBien"
                  value={isCustomTypeBien ? "Autre" : formData.typeDeBien}
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
                  {TYPE_BIEN_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                {isCustomTypeBien && (
                  <input
                    type="text"
                    value={formData.typeDeBien}
                    onChange={(e) => handleChange("typeDeBien", e.target.value)}
                    className="input-base text-sm w-full h-8"
                    placeholder="Saisissez le type de bien..."
                    autoFocus
                  />
                )}
              </div>
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
              <div className="space-y-2 w-full">
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

                {/* PDF Devis upload / display box */}
                <div className="pt-0.5">
                  <input
                    ref={devisInputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    className="hidden"
                    onChange={handleDevisUpload}
                  />

                  {formData.devisUrl ? (
                    <div className="flex items-center justify-between gap-2 p-2 bg-surface-muted/60 border border-border rounded-md text-xs">
                      <a
                        href={formData.devisUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 font-medium text-accent hover:underline truncate max-w-[170px]"
                        title="Ouvrir le devis PDF"
                      >
                        <FileText size={14} className="flex-shrink-0 text-red-500" />
                        <span className="truncate">Devis.pdf</span>
                        <ExternalLink size={11} className="flex-shrink-0 opacity-70" />
                      </a>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => devisInputRef.current?.click()}
                          disabled={isUploadingDevis}
                          className="p-1 hover:bg-surface rounded text-text-muted hover:text-text transition-colors"
                          title="Remplacer le devis"
                        >
                          <Upload size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={handleDevisDelete}
                          disabled={isUploadingDevis}
                          className="p-1 hover:bg-surface rounded text-text-muted hover:text-danger transition-colors"
                          title="Supprimer le devis"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => devisInputRef.current?.click()}
                      disabled={isUploadingDevis}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border border-dashed border-border hover:border-accent text-text-muted hover:text-text bg-surface hover:bg-surface-muted/50 rounded-md transition-colors w-full justify-center"
                    >
                      {isUploadingDevis ? (
                        <>
                          <Loader2 size={13} className="animate-spin text-accent" />
                          <span>Importation du PDF...</span>
                        </>
                      ) : (
                        <>
                          <Upload size={13} className="text-text-subtle" />
                          <span>Importer le devis (PDF)</span>
                        </>
                      )}
                    </button>
                  )}
                  {uploadError && (
                    <p className="text-[11px] text-danger mt-1">{uploadError}</p>
                  )}
                </div>
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

            {/* Relances auto — read-only with toggle */}
            <div className="border-t border-border pt-3 mt-3">
              <p className="text-[10px] font-semibold text-text-subtle uppercase tracking-widest mb-2.5">
                Relances automatiques
              </p>
              <div className="space-y-2">
                {[1, 2, 3].map((num) => {
                  const autoKey = `relance${num}Auto` as keyof Lead;
                  const faitKey = `relance${num}Fait` as keyof Lead;
                  const isChecked = Boolean(formData[faitKey]);
                  const value = formData[autoKey];
                  
                  return (
                    <div
                      key={num}
                      className="grid grid-cols-[100px_1fr_auto] gap-2 items-center"
                    >
                      <span className="text-xs text-text-subtle">
                        Relance {num}
                      </span>
                      <input
                        type="date"
                        value={fmtDateForInput(value as string)}
                        onChange={(e) => handleRelanceDateChange(num as 1 | 2 | 3, e.target.value)}
                        className="input-base text-xs h-7 px-2 bg-transparent hover:bg-surface-muted transition-colors cursor-pointer w-[120px]"
                      />
                      <div className="flex items-center gap-1.5">
                        <RelanceVariationsModal
                          relanceType={`relance${num}` as "relance1" | "relance2" | "relance3"}
                          phoneNumber={formData.telephone}
                        />
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={isChecked}
                            onChange={(e) => handleRelanceToggle(num as 1 | 2 | 3, e.target.checked)}
                          />
                          <div className="w-9 h-5 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {activeTab === "notes" && (
          <div className="space-y-5">
            {/* Rendez-vous & Rappel planifié card */}
            <div className="p-3.5 bg-surface-muted/40 border border-border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarClock size={15} className="text-accent flex-shrink-0" />
                  <h3 className="text-xs font-semibold text-text">
                    Rendez-vous / Rappel planifié
                  </h3>
                </div>
                {formData.rappelDate && (
                  <div className="flex items-center gap-1.5">
                    {rappelStatus === "done" && (
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                        <CheckCircle2 size={10} /> Terminé
                      </span>
                    )}
                    {rappelStatus === "due" && (
                      <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded font-medium flex items-center gap-1 animate-pulse">
                        <CalendarClock size={10} /> Échéance atteinte
                      </span>
                    )}
                    {rappelStatus === "today" && (
                      <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                        <Calendar size={10} /> Aujourd&apos;hui
                      </span>
                    )}
                    {rappelStatus === "upcoming" && (
                      <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                        <Calendar size={10} /> Planifié
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Date & Time Picker */}
              <div className="space-y-1.5">
                <label
                  htmlFor="d-rappelDate"
                  className="text-[11px] font-medium text-text-subtle"
                >
                  Date et heure importante
                </label>
                <input
                  id="d-rappelDate"
                  type="datetime-local"
                  value={fmtDateTimeForInput(formData.rappelDate)}
                  onChange={(e) => {
                    const val = e.target.value;
                    handleChange(
                      "rappelDate",
                      val ? new Date(val).toISOString() : null
                    );
                  }}
                  className="input-base text-xs w-full h-8"
                />
              </div>

              {/* Note / Motif de la date */}
              <div className="space-y-1.5">
                <label
                  htmlFor="d-rappelNote"
                  className="text-[11px] font-medium text-text-subtle"
                >
                  Motif / Note du rendez-vous ou de la livraison
                </label>
                <input
                  id="d-rappelNote"
                  type="text"
                  value={formData.rappelNote || ""}
                  onChange={(e) => handleChange("rappelNote", e.target.value)}
                  placeholder="Ex: Rencontre client au café, Livraison démo 3D..."
                  className="input-base text-xs w-full h-8"
                />

                {/* Quick preset buttons */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    "Rencontre client",
                    "Date de livraison",
                    "Appel téléphonique convenu",
                    "Visite sur place",
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        handleChange("rappelNote", preset);
                      }}
                      className="text-[10px] px-2 py-0.5 rounded bg-surface border border-border text-text-muted hover:text-text hover:bg-surface-muted transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions on reminder */}
              {formData.rappelDate && (
                <div className="pt-2 border-t border-border flex items-center justify-between gap-2">
                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-text">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.rappelFait)}
                      onChange={(e) =>
                        handleChange("rappelFait", e.target.checked)
                      }
                      className="rounded border-border text-accent focus:ring-accent w-3.5 h-3.5"
                    />
                    <span className={formData.rappelFait ? "text-emerald-700 font-medium" : ""}>
                      Marquer comme terminé
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      handleChange("rappelDate", null);
                      handleChange("rappelNote", "");
                      handleChange("rappelFait", false);
                    }}
                    className="text-[11px] text-text-subtle hover:text-rose-600 transition-colors"
                  >
                    Effacer le rendez-vous
                  </button>
                </div>
              )}
            </div>

            {/* General Notes section */}
            <div className="space-y-1.5">
              <label
                htmlFor="d-general-notes"
                className="text-xs font-semibold text-text flex items-center gap-1.5"
              >
                <span>Notes générales</span>
              </label>
              <textarea
                id="d-general-notes"
                aria-label="Notes"
                value={formData.notes || ""}
                onChange={(e) => handleChange("notes", e.target.value)}
                className="input-base text-sm w-full h-36 resize-y py-2"
                placeholder="Ajouter des notes libres sur ce lead..."
              />
            </div>
          </div>
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

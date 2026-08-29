"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  X, 
  Loader2, 
  Check, 
  AlertTriangle,
  Calendar,
  CalendarClock,
  CalendarCheck,
  CheckCircle2
} from "lucide-react";
import type { Lead } from "@/types";
import { STATUT_OPTIONS, CANAL_OPTIONS, SECTEUR_LABELS_FR, VILLES } from "@/types";
import { getRappelStatus } from "@/lib/lead-alerts";

// Les listes (statuts, canaux, secteurs, villes) viennent du vocabulaire
// partagé types/vocabulaire.ts — plus aucune copie locale.

type Tab = "infos" | "suivi" | "notes";

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
// Sub-components
// ---------------------------------------------------------------------------

function FieldRow({
  label,
  id,
  required,
  children,
}: {
  label: string;
  id: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
      <label htmlFor={id} className="text-xs font-medium text-text-subtle">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
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

// ---------------------------------------------------------------------------
// LeadCreateModal
// ---------------------------------------------------------------------------

export function LeadCreateModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("infos");

  const [formData, setFormData] = useState<Partial<Lead>>({
    nom: "",
    telephone: "",
    email: "",
    canal: "",
    ville: "",
    typeDeBien: "",
    surface: "",
    dateFormulaire: new Date().toISOString().split("T")[0],
    statut: "Nouveau",
    date1erContact: "",
    appelTelephonique: "Non",
    contacteSurWhatsapp: "Non",
    devisEnvoye: "Non",
    demoEnvoye: "Non",
    prixProposeMAD: "",
    dateDeEchange: "",
    notes: "",
    rappelDate: null,
    rappelNote: "",
    rappelFait: false,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">(
    "idle"
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [isDuplicate, setIsDuplicate] = useState(false);

  const [isCustomVille, setIsCustomVille] = useState(false);
  const [isCustomTypeBien, setIsCustomTypeBien] = useState(false);
  const [isCustomCanal, setIsCustomCanal] = useState(false);

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

  function handleToggle(key: keyof Lead, value: boolean) {
    handleChange(key, value ? "Oui" : "Non");
  }

  async function handleSave() {
    if (!formData.nom?.trim() || !formData.telephone?.trim()) {
      setSaveStatus("error");
      setErrorMessage("Le nom et le téléphone sont obligatoires.");
      setActiveTab("infos");
      return;
    }

    setIsSaving(true);
    setSaveStatus("idle");
    try {
      const res = await fetch(`/api/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de la création");
      }

      setSaveStatus("success");
      setIsDuplicate(!!data.duplicate);
      router.refresh();

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setSaveStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Erreur inconnue"
      );
      setIsSaving(false);
      router.refresh();
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "infos", label: "Infos" },
    { key: "suivi", label: "Suivi" },
    { key: "notes", label: "Notes" },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Créer un lead"
          className="bg-surface border border-border rounded-lg shadow-md w-full max-w-lg max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="h-14 border-b border-border px-5 flex items-center justify-between flex-shrink-0">
            <h2 className="text-sm font-semibold text-text">Nouveau Lead</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded text-text-muted hover:text-text hover:bg-surface-muted transition-colors"
              aria-label="Fermer"
            >
              <X size={15} aria-hidden="true" />
            </button>
          </div>

          {/* Tabs */}
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

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {activeTab === "infos" && (
              <>
                <FieldRow label="Nom" id="c-nom" required>
                  <input
                    id="c-nom"
                    type="text"
                    required
                    value={formData.nom || ""}
                    onChange={(e) => handleChange("nom", e.target.value)}
                    className="input-base text-sm w-full h-8"
                    placeholder="Ex: Jean Dupont"
                  />
                </FieldRow>

                <FieldRow label="Téléphone" id="c-telephone" required>
                  <input
                    id="c-telephone"
                    type="tel"
                    required
                    value={formData.telephone || ""}
                    onChange={(e) =>
                      handleChange("telephone", e.target.value)
                    }
                    className="input-base text-sm w-full h-8"
                    placeholder="Ex: +212 600 000 000"
                  />
                </FieldRow>

                <FieldRow label="Email" id="c-email">
                  <input
                    id="c-email"
                    type="email"
                    value={formData.email || ""}
                    onChange={(e) => handleChange("email", e.target.value)}
                    className="input-base text-sm w-full h-8"
                    placeholder="Ex: contact@email.com"
                  />
                </FieldRow>

                <FieldRow label="Canal" id="c-canal">
                  <div className="flex flex-col gap-2 w-full">
                    <select
                      id="c-canal"
                      value={isCustomCanal ? "Autre" : formData.canal || ""}
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
                        id="c-canal-custom"
                        type="text"
                        value={formData.canal || ""}
                        onChange={(e) => handleChange("canal", e.target.value)}
                        className="input-base text-sm w-full h-8"
                        placeholder="Saisissez le canal..."
                        autoFocus
                      />
                    )}
                  </div>
                </FieldRow>

                <FieldRow label="Ville" id="c-ville">
                  <div className="flex flex-col gap-2 w-full">
                    <select
                      id="c-ville"
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
                      {VILLES.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                      <option value="Autre">Autre</option>
                    </select>
                    {isCustomVille && (
                      <input
                        id="c-ville-custom"
                        type="text"
                        value={formData.ville || ""}
                        onChange={(e) => handleChange("ville", e.target.value)}
                        className="input-base text-sm w-full h-8"
                        placeholder="Saisissez la ville..."
                        autoFocus
                      />
                    )}
                  </div>
                </FieldRow>

                <FieldRow label="Type de bien" id="c-typeDeBien">
                  <div className="flex flex-col gap-2 w-full">
                    <select
                      id="c-typeDeBien"
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
                      {SECTEUR_LABELS_FR.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                      <option value="Autre">Autre</option>
                    </select>
                    {isCustomTypeBien && (
                      <input
                        id="c-typeDeBien-custom"
                        type="text"
                        value={formData.typeDeBien || ""}
                        onChange={(e) =>
                          handleChange("typeDeBien", e.target.value)
                        }
                        className="input-base text-sm w-full h-8"
                        placeholder="Saisissez le type de bien..."
                        autoFocus
                      />
                    )}
                  </div>
                </FieldRow>

                <FieldRow label="Surface (m²)" id="c-surface">
                  <input
                    id="c-surface"
                    type="text"
                    value={formData.surface || ""}
                    onChange={(e) => handleChange("surface", e.target.value)}
                    className="input-base text-sm w-full h-8"
                    placeholder="Ex: 120"
                  />
                </FieldRow>

                <FieldRow label="Date formulaire" id="c-dateFormulaire">
                  <input
                    id="c-dateFormulaire"
                    type="date"
                    value={formData.dateFormulaire || ""}
                    onChange={(e) =>
                      handleChange("dateFormulaire", e.target.value)
                    }
                    className="input-base text-sm w-full h-8"
                  />
                </FieldRow>
              </>
            )}

            {activeTab === "suivi" && (
              <>
                <FieldRow label="Statut" id="c-statut">
                  <select
                    id="c-statut"
                    value={formData.statut || "Nouveau"}
                    onChange={(e) => handleChange("statut", e.target.value)}
                    className="input-base text-sm w-full h-8"
                  >
                    {STATUT_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </FieldRow>

                <FieldRow label="1er contact" id="c-date1erContact">
                  <input
                    id="c-date1erContact"
                    type="date"
                    value={formData.date1erContact || ""}
                    onChange={(e) =>
                      handleChange("date1erContact", e.target.value)
                    }
                    className="input-base text-sm w-full h-8"
                  />
                </FieldRow>

                <FieldRow label="Appel tél." id="c-appel">
                  <div className="flex items-center gap-2">
                    <ToggleSwitch
                      id="c-appel"
                      checked={formData.appelTelephonique === "Oui"}
                      onChange={(val) =>
                        handleToggle("appelTelephonique", val)
                      }
                      label="Appel téléphonique"
                    />
                    <span className="text-xs text-text-muted">
                      {formData.appelTelephonique === "Oui" ? "Oui" : "Non"}
                    </span>
                  </div>
                </FieldRow>

                <FieldRow label="WhatsApp" id="c-whatsapp">
                  <div className="flex items-center gap-2">
                    <ToggleSwitch
                      id="c-whatsapp"
                      checked={formData.contacteSurWhatsapp === "Oui"}
                      onChange={(val) =>
                        handleToggle("contacteSurWhatsapp", val)
                      }
                      label="Contacté sur WhatsApp"
                    />
                    <span className="text-xs text-text-muted">
                      {formData.contacteSurWhatsapp === "Oui"
                        ? "Oui"
                        : "Non"}
                    </span>
                  </div>
                </FieldRow>

                <FieldRow label="Devis envoyé" id="c-devis">
                  <div className="flex items-center gap-2">
                    <ToggleSwitch
                      id="c-devis"
                      checked={formData.devisEnvoye === "Oui"}
                      onChange={(val) => handleToggle("devisEnvoye", val)}
                      label="Devis envoyé"
                    />
                    <span className="text-xs text-text-muted">
                      {formData.devisEnvoye === "Oui" ? "Oui" : "Non"}
                    </span>
                  </div>
                </FieldRow>

                <FieldRow label="Démo envoyée" id="c-demo">
                  <div className="flex items-center gap-2">
                    <ToggleSwitch
                      id="c-demo"
                      checked={formData.demoEnvoye === "Oui"}
                      onChange={(val) => handleToggle("demoEnvoye", val)}
                      label="Démo envoyée"
                    />
                    <span className="text-xs text-text-muted">
                      {formData.demoEnvoye === "Oui" ? "Oui" : "Non"}
                    </span>
                  </div>
                </FieldRow>

                <FieldRow label="Prix (MAD)" id="c-prix">
                  <input
                    id="c-prix"
                    type="text"
                    value={formData.prixProposeMAD || ""}
                    onChange={(e) =>
                      handleChange("prixProposeMAD", e.target.value)
                    }
                    className="input-base text-sm w-full h-8"
                    placeholder="Ex: 50 000"
                  />
                </FieldRow>

                <FieldRow label="Dernier échange" id="c-dateDeEchange">
                  <input
                    id="c-dateDeEchange"
                    type="date"
                    value={formData.dateDeEchange || ""}
                    onChange={(e) =>
                      handleChange("dateDeEchange", e.target.value)
                    }
                    className="input-base text-sm w-full h-8"
                  />
                </FieldRow>
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
                      <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                        <Calendar size={10} /> Planifié
                      </span>
                    )}
                  </div>

                  {/* Date & Time Picker */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="c-rappelDate"
                      className="text-[11px] font-medium text-text-subtle"
                    >
                      Date et heure importante
                    </label>
                    <input
                      id="c-rappelDate"
                      type="datetime-local"
                      value={fmtDateTimeForInput(formData.rappelDate)}
                      onChange={(e) => {
                        const val = e.target.value;
                        handleChange(
                          "rappelDate",
                          val ? new Date(val).toISOString() : (null as any)
                        );
                      }}
                      className="input-base text-xs w-full h-8"
                    />
                  </div>

                  {/* Note / Motif de la date */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="c-rappelNote"
                      className="text-[11px] font-medium text-text-subtle"
                    >
                      Motif / Note du rendez-vous ou de la livraison
                    </label>
                    <input
                      id="c-rappelNote"
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

                  {/* Clear button if set */}
                  {formData.rappelDate && (
                    <div className="pt-2 border-t border-border flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          handleChange("rappelDate", null as any);
                          handleChange("rappelNote", "");
                        }}
                        className="text-[11px] text-text-subtle hover:text-rose-600 transition-colors"
                      >
                        Effacer le rendez-vous
                      </button>
                    </div>
                  )}
                </div>

                {/* General Notes */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="c-general-notes"
                    className="text-xs font-semibold text-text flex items-center gap-1.5"
                  >
                    <span>Notes générales</span>
                  </label>
                  <textarea
                    id="c-general-notes"
                    aria-label="Notes"
                    value={formData.notes || ""}
                    onChange={(e) => handleChange("notes", e.target.value)}
                    className="input-base text-sm w-full h-32 resize-y py-2"
                    placeholder="Ajouter des notes libres sur ce lead..."
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border px-5 py-3 flex-shrink-0 bg-surface flex flex-col gap-3 rounded-b-lg">
            {saveStatus === "error" && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-2 rounded text-xs border border-red-200">
                <AlertTriangle size={14} />
                <span>{errorMessage}</span>
              </div>
            )}

            {saveStatus === "success" && (
              <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 px-3 py-2 rounded text-xs border border-emerald-200">
                <Check size={14} />
                <span>
                  Lead créé avec succès !
                  {isDuplicate ? " (Attention : doublon détecté)" : ""}
                </span>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary text-sm px-4 py-2"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || saveStatus === "success"}
                className="btn-primary text-sm px-4 py-2 flex items-center gap-2"
              >
                {isSaving && (
                  <Loader2 size={14} className="animate-spin" />
                )}
                Enregistrer le lead
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

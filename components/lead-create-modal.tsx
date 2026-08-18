"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2, Check, AlertTriangle } from "lucide-react";
import type { Lead } from "@/types";

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

type Tab = "infos" | "suivi" | "notes";

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
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">(
    "idle"
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [isDuplicate, setIsDuplicate] = useState(false);

  const [isCustomVille, setIsCustomVille] = useState(false);
  const [isCustomTypeBien, setIsCustomTypeBien] = useState(false);

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

                <FieldRow label="Canal" id="c-canal">
                  <select
                    id="c-canal"
                    value={formData.canal || ""}
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
                      <option value="Rabat">Rabat</option>
                      <option value="Casablanca">Casablanca</option>
                      <option value="Kénitra">Kénitra</option>
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
                      {TYPE_BIEN_OPTIONS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
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
              <textarea
                aria-label="Notes"
                value={formData.notes || ""}
                onChange={(e) => handleChange("notes", e.target.value)}
                className="input-base text-sm w-full h-48 resize-y py-2"
                placeholder="Ajouter des notes sur ce lead..."
              />
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

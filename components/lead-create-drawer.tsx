"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2, Check, AlertTriangle } from "lucide-react";
import type { Lead } from "@/types";

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
      <label htmlFor={id} className="text-xs font-medium text-text-subtle">{label}</label>
      <div>{children}</div>
    </div>
  );
}

export function LeadCreateDrawer({
  onClose,
}: {
  onClose: () => void;
}) {
  const router = useRouter();

  const [formData, setFormData] = useState<Partial<Lead>>({
    nom: "",
    telephone: "",
    canal: "",
    ville: "",
    typeDeBien: "",
    surface: "",
    dateFormulaire: new Date().toISOString().split("T")[0],
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [isDuplicate, setIsDuplicate] = useState(false);

  const [isCustomCanal, setIsCustomCanal] = useState(false);
  const [isCustomTypeBien, setIsCustomTypeBien] = useState(false);
  const [isCustomVille, setIsCustomVille] = useState(false);

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
    if (!formData.nom?.trim() || !formData.telephone?.trim()) {
      setSaveStatus("error");
      setErrorMessage("Le nom et le téléphone sont obligatoires.");
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
      }, 2000);
    } catch (err) {
      setSaveStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Erreur inconnue");
      setIsSaving(false);
      // Refresh even on error — the lead may have been created server-side
      // before the error occurred, so the table should reflect it.
      router.refresh();
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" aria-hidden="true" onClick={onClose} />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Créer un lead"
        className="fixed inset-y-0 right-0 z-50 w-full max-w-sm md:max-w-md bg-surface border-l border-border flex flex-col shadow-md"
      >
        {/* Header */}
        <div className="h-14 border-b border-border px-4 flex items-center justify-between flex-shrink-0">
          <h2 className="text-sm font-medium text-text">Nouveau Lead</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded text-text-muted hover:text-text hover:bg-surface-muted transition-colors flex-shrink-0"
            aria-label="Fermer"
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
          <section>
            <h3 className="text-[10px] font-semibold text-text-subtle uppercase tracking-widest mb-3">
              Informations générales
            </h3>
            <div className="space-y-4">
              <EditField label="Nom *" id="create-nom">
                <input
                  id="create-nom"
                  type="text"
                  required
                  value={formData.nom || ""}
                  onChange={(e) => handleChange("nom", e.target.value)}
                  className="input-base text-sm w-full h-9"
                  placeholder="Ex: Jean Dupont"
                />
              </EditField>

              <EditField label="Téléphone *" id="create-telephone">
                <input
                  id="create-telephone"
                  type="tel"
                  required
                  value={formData.telephone || ""}
                  onChange={(e) => handleChange("telephone", e.target.value)}
                  className="input-base text-sm w-full h-9"
                  placeholder="Ex: +212 600 000 000"
                />
              </EditField>

              <EditField label="Canal" id="create-canal">
                <div className="flex flex-col gap-2 w-full">
                  <select
                    id="create-canal"
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
                    className="input-base text-sm w-full h-9"
                  >
                    <option value="">—</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Facebook">Facebook</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Référence">Référence</option>
                    <option value="Site web">Site web</option>
                    <option value="Autre">Autre</option>
                  </select>
                  {isCustomCanal && (
                    <input
                      id="create-canal-custom"
                      type="text"
                      value={formData.canal || ""}
                      onChange={(e) => handleChange("canal", e.target.value)}
                      className="input-base text-sm w-full h-9"
                      placeholder="Saisissez le canal..."
                      autoFocus
                    />
                  )}
                </div>
              </EditField>

              <EditField label="Ville" id="create-ville">
                <div className="flex flex-col gap-2 w-full">
                  <select
                    id="create-ville"
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
                    className="input-base text-sm w-full h-9"
                  >
                    <option value="">—</option>
                    <option value="Rabat">Rabat</option>
                    <option value="Casablanca">Casablanca</option>
                    <option value="Kénitra">Kénitra</option>
                    <option value="Autre">Autre</option>
                  </select>
                  {isCustomVille && (
                    <input
                      id="create-ville-custom"
                      type="text"
                      value={formData.ville || ""}
                      onChange={(e) => handleChange("ville", e.target.value)}
                      className="input-base text-sm w-full h-9"
                      placeholder="Saisissez la ville..."
                      autoFocus
                    />
                  )}
                </div>
              </EditField>
            </div>
          </section>

          <section>
            <h3 className="text-[10px] font-semibold text-text-subtle uppercase tracking-widest mb-3">
              Projet
            </h3>
            <div className="space-y-4">
              <EditField label="Type de bien" id="create-typeDeBien">
                <div className="flex flex-col gap-2 w-full">
                  <select
                    id="create-typeDeBien"
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
                    className="input-base text-sm w-full h-9"
                  >
                    <option value="">—</option>
                    <option value="Appartement">Appartement</option>
                    <option value="Villa">Villa</option>
                    <option value="Bureau">Bureau</option>
                    <option value="Local commercial">Local commercial</option>
                    <option value="Terrain">Terrain</option>
                    <option value="Résidence">Résidence</option>
                    <option value="Cabinet">Cabinet</option>
                    <option value="Hôtel">Hôtel</option>
                    <option value="Riad">Riad</option>
                    <option value="Autre">Autre</option>
                  </select>
                  {isCustomTypeBien && (
                    <input
                      id="create-typeDeBien-custom"
                      type="text"
                      value={formData.typeDeBien || ""}
                      onChange={(e) => handleChange("typeDeBien", e.target.value)}
                      className="input-base text-sm w-full h-9"
                      placeholder="Saisissez le type de bien..."
                      autoFocus
                    />
                  )}
                </div>
              </EditField>

              <EditField label="Surface (m²)" id="create-surface">
                <input
                  id="create-surface"
                  type="text"
                  value={formData.surface || ""}
                  onChange={(e) => handleChange("surface", e.target.value)}
                  className="input-base text-sm w-full h-9"
                  placeholder="Ex: 120"
                />
              </EditField>
              
              <EditField label="Date formulaire" id="create-dateFormulaire">
                <input
                  id="create-dateFormulaire"
                  type="date"
                  value={formData.dateFormulaire || ""}
                  onChange={(e) => handleChange("dateFormulaire", e.target.value)}
                  className="input-base text-sm w-full h-9 text-text-muted"
                />
              </EditField>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-4 py-3 flex-shrink-0 bg-surface flex flex-col gap-3">
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

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || saveStatus === "success"}
              className="btn-primary text-sm px-4 py-2 flex items-center gap-2"
            >
              {isSaving && <Loader2 size={14} className="animate-spin" />}
              Enregistrer le lead
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

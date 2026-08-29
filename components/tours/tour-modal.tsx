"use client";

import { useState, useEffect } from "react";
import { X, Globe, Sparkles, Loader2, ExternalLink, Code2, Eye, EyeOff, Pencil } from "lucide-react";
import { TOUR_SECTORS, type Tour, type TourInsert, type TourUpdate } from "@/types";

interface TourModalProps {
  isOpen: boolean;
  tourToEdit?: Tour | null;
  /** Ouvre en consultation : tout est visible, rien n'est modifiable. */
  readOnly?: boolean;
  onClose: () => void;
  onSuccess: (tour: Tour, isNew: boolean) => void;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9]+/g, "_") // replace non-alphanumeric with underscore
    .replace(/^_+|_+$/g, ""); // trim underscores
}

export function TourModal({
  isOpen,
  tourToEdit,
  readOnly = false,
  onClose,
  onSuccess,
}: TourModalProps) {
  const isEdit = Boolean(tourToEdit);
  // Le mode est un état : « Modifier » bascule la fiche ouverte.
  const [editable, setEditable] = useState(!readOnly);

  const [propertyName, setPropertyName] = useState("");
  const [slug, setSlug] = useState("");
  const [clientName, setClientName] = useState("");
  const [sector, setSector] = useState<string>("immobilier");
  const [realseeUrl, setRealseeUrl] = useState("");
  const [active, setActive] = useState(true);
  const [iframe, setIframe] = useState("");

  const [showPreview, setShowPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync state with tourToEdit or defaults when opened
  useEffect(() => {
    if (isOpen) {
      setEditable(!readOnly);
      if (tourToEdit) {
        setPropertyName(tourToEdit.property_name || "");
        setSlug(tourToEdit.slug || "");
        setClientName(tourToEdit.client_name || "");
        setSector(tourToEdit.sector || "immobilier");
        setRealseeUrl(tourToEdit.realsee_url || "");
        setActive(tourToEdit.active ?? true);
        setIframe(tourToEdit.iframe || "");
      } else {
        setPropertyName("");
        setSlug("");
        setClientName("");
        setSector("immobilier");
        setRealseeUrl("");
        setActive(true);
        setIframe("");
      }
      setShowPreview(false);
      setErrorMsg(null);
    }
  }, [isOpen, tourToEdit]);

  if (!isOpen) return null;

  const handleGenerateSlug = () => {
    if (propertyName) {
      setSlug(slugify(propertyName));
    }
  };

  const handleGenerateDefaultIframe = () => {
    const currentSlug = slug || slugify(propertyName) || "mon-tour";
    setIframe(
      `<iframe src="https://immersio.ma/visite/${currentSlug}" width="100%" height="100%" frameborder="0" scrolling="no"></iframe>`
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanSlug = slug.trim().toLowerCase();
    const cleanPropertyName = propertyName.trim();

    if (!cleanSlug) {
      setErrorMsg("Le slug est obligatoire.");
      return;
    }
    if (!cleanPropertyName) {
      setErrorMsg("Le nom du bien ou projet est obligatoire.");
      return;
    }

    // Default iframe if not provided
    const finalIframe =
      iframe.trim() ||
      `<iframe src="https://immersio.ma/visite/${cleanSlug}" width="100%" height="100%" frameborder="0" scrolling="no"></iframe>`;

    setIsSubmitting(true);

    try {
      if (isEdit && tourToEdit) {
        const payload: TourUpdate = {
          slug: cleanSlug,
          property_name: cleanPropertyName,
          client_name: clientName.trim() || null,
          sector: sector || null,
          realsee_url: realseeUrl.trim() || null,
          active,
          iframe: finalIframe,
        };

        const res = await fetch(`/api/tours/${tourToEdit.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Erreur lors de la mise à jour du tour.");
        }

        onSuccess(data.data, false);
      } else {
        const payload: TourInsert = {
          slug: cleanSlug,
          property_name: cleanPropertyName,
          client_name: clientName.trim() || null,
          sector: sector || null,
          realsee_url: realseeUrl.trim() || null,
          active,
          iframe: finalIframe,
        };

        const res = await fetch("/api/tours", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Erreur lors de la création du tour.");
        }

        onSuccess(data.data, true);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Une erreur est survenue.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const previewSrc =
    realseeUrl.trim() ||
    (slug.trim() ? `https://immersio.ma/visite/${slug.trim().toLowerCase()}` : "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-surface border border-border rounded-xl max-w-2xl w-full my-8 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-subtle/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10 border border-accent/20 text-accent">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-text">
                {isEdit ? "Modifier la visite virtuelle" : "Créer une nouvelle visite virtuelle"}
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                {isEdit
                  ? `Mise à jour des paramètres de "${tourToEdit?.property_name}"`
                  : "Renseignez les détails du tour 3D et configurez son intégration"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content / Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* `contents` retire le fieldset de la mise en page : il ne sert
              qu'à neutraliser les contrôles, pas à les encadrer. */}
          <fieldset disabled={!editable} className="contents">
          {errorMsg && (
            <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-2">
              <span className="font-medium flex-1">{errorMsg}</span>
            </div>
          )}

          {/* Grid 2 cols: Nom du bien & Slug */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted flex items-center gap-1">
                <span>Nom du bien / Projet</span>
                <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={propertyName}
                onChange={(e) => setPropertyName(e.target.value)}
                placeholder="Ex: Appartement de Luxe Bouznika"
                required
                className="w-full px-3.5 py-2 text-sm bg-surface-subtle border border-border rounded-lg text-text placeholder:text-text-subtle focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-text-muted flex items-center gap-1">
                  <span>Slug (Identifiant URL)</span>
                  <span className="text-red-400">*</span>
                </label>
                {!isEdit && propertyName && (
                  <button
                    type="button"
                    onClick={handleGenerateSlug}
                    className="text-[11px] text-accent hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    Auto-générer
                  </button>
                )}
              </div>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                placeholder="ex: appartement_bouznika"
                required
                className="w-full px-3.5 py-2 text-sm bg-surface-subtle border border-border rounded-lg text-text placeholder:text-text-subtle font-mono text-xs focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
              />
              <p className="text-[11px] text-text-subtle">
                Lien généré : <span className="text-accent">https://immersio.ma/visite/{slug || "slug"}</span>
              </p>
            </div>
          </div>

          {/* Grid 2 cols: Client & Secteur */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted">Nom du Client / Propriétaire</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Ex: Med Brk, Dr. Marcu, Living Clinic..."
                className="w-full px-3.5 py-2 text-sm bg-surface-subtle border border-border rounded-lg text-text placeholder:text-text-subtle focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted">Secteur d&apos;activité</label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-surface-subtle border border-border rounded-lg text-text focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
              >
                {TOUR_SECTORS.map((s) => (
                  <option key={s.value} value={s.value} className="bg-surface text-text">
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Realsee / Matterport Source URL */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted flex items-center justify-between">
              <span>Lien source de la visite 3D (Realsee / Matterport / Google)</span>
              {realseeUrl && (
                <a
                  href={realseeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-accent hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Tester le lien
                </a>
              )}
            </label>
            <input
              type="url"
              value={realseeUrl}
              onChange={(e) => setRealseeUrl(e.target.value)}
              placeholder="https://realsee.ai/... ou https://my.matterport.com/show?m=..."
              className="w-full px-3.5 py-2 text-sm bg-surface-subtle border border-border rounded-lg text-text placeholder:text-text-subtle focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all font-mono text-xs"
            />
          </div>

          {/* Iframe Code */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-text-muted flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-accent" />
                <span>Code Iframe d&apos;intégration</span>
              </label>
              <button
                type="button"
                onClick={handleGenerateDefaultIframe}
                className="text-[11px] text-accent hover:underline flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                Générer code standard
              </button>
            </div>
            <textarea
              rows={3}
              value={iframe}
              onChange={(e) => setIframe(e.target.value)}
              placeholder={`<iframe src="https://immersio.ma/visite/${slug || "slug"}" width="100%" height="100%" frameborder="0" scrolling="no"></iframe>`}
              className="w-full px-3.5 py-2 text-xs bg-surface-subtle border border-border rounded-lg text-text placeholder:text-text-subtle font-mono focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
            />
          </div>

          {/* Toggle Actif */}
          <div className="flex items-center justify-between p-3.5 rounded-lg bg-surface-subtle border border-border">
            <div>
              <p className="text-sm font-medium text-text">Visite virtuelle active</p>
              <p className="text-xs text-text-muted mt-0.5">
                Définit si le tour est public et accessible sur immersio.ma
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-surface-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          </fieldset>

          {/* Live Preview Collapsible —
              hors fieldset : afficher la visite est une consultation, pas une
              saisie. Un `disabled={false}` n'aurait rien changé : un contrôle
              est désactivé s'il porte l'attribut OU s'il descend d'un fieldset
              désactivé. */}
          {previewSrc && (
            <div className="border border-border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="w-full px-4 py-2.5 bg-surface-subtle flex items-center justify-between text-xs font-medium text-text-muted hover:text-text transition-colors"
              >
                <div className="flex items-center gap-2">
                  {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPreview ? "Masquer l&apos;aperçu 3D" : "Afficher l&apos;aperçu 3D en direct"}</span>
                </div>
                <span className="text-[10px] text-text-subtle font-mono">{previewSrc}</span>
              </button>
              {showPreview && (
                <div className="p-3 bg-black/40 border-t border-border">
                  <div className="w-full h-64 rounded-lg overflow-hidden border border-border bg-black">
                    <iframe
                      src={previewSrc}
                      className="w-full h-full border-0"
                      title="Aperçu du tour 3D"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium rounded-lg text-text-muted hover:text-text hover:bg-surface-muted transition-colors disabled:opacity-50"
            >
              {editable ? "Annuler" : "Fermer"}
            </button>
            {editable ? (
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-sm font-medium rounded-lg bg-accent text-accent-foreground hover:bg-accent-hover transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Enregistrement...</span>
                  </>
                ) : (
                  <span>{isEdit ? "Enregistrer les modifications" : "Créer le tour"}</span>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setEditable(true)}
                className="px-5 py-2 text-sm font-medium rounded-lg bg-accent text-accent-foreground hover:bg-accent-hover transition-colors flex items-center gap-2 shadow-sm"
              >
                <Pencil className="w-4 h-4" />
                <span>Modifier</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

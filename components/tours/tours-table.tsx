"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Plus,
  Copy,
  Check,
  Code2,
  ExternalLink,
  Edit2,
  Trash2,
  Globe,
  SlidersHorizontal,
  Compass,
  Link as LinkIcon,
  Layers,
  Sparkles,
} from "lucide-react";
import type { Tour } from "@/types";
import { TOUR_SECTORS } from "@/types";
import { TourModal } from "./tour-modal";
import { TourDeleteDialog } from "./tour-delete-dialog";

interface ToursTableProps {
  initialTours: Tour[];
}

export function ToursTable({ initialTours }: ToursTableProps) {
  const [tours, setTours] = useState<Tour[]>(initialTours);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSector, setSelectedSector] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<"all" | "active" | "inactive">("all");

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [tourToEdit, setTourToEdit] = useState<Tour | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tourToDelete, setTourToDelete] = useState<Tour | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Copied feedback states (key: `${tourId}-${type}`)
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Trigger toast
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 2600);
  };

  // Copy helper with feedback
  const handleCopy = async (text: string, key: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      showToast(`${label} copié dans le presse-papier !`);
      setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? null : prev));
      }, 2000);
    } catch (err) {
      console.error("Échec de la copie:", err);
      showToast("Échec de la copie dans le presse-papier.");
    }
  };

  // Toggle active status directly from table
  const handleToggleActive = async (tour: Tour) => {
    const newStatus = !tour.active;
    // Optimistic update
    setTours((prev) =>
      prev.map((t) => (t.id === tour.id ? { ...t, active: newStatus } : t))
    );

    try {
      const res = await fetch(`/api/tours/${tour.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: newStatus }),
      });
      if (!res.ok) {
        throw new Error("Erreur de mise à jour");
      }
      showToast(`Tour "${tour.property_name}" ${newStatus ? "activé" : "désactivé"}.`);
    } catch (err) {
      // Revert on error
      setTours((prev) =>
        prev.map((t) => (t.id === tour.id ? { ...t, active: tour.active } : t))
      );
      showToast("Erreur lors de la modification du statut.");
    }
  };

  // Modal open helpers
  const handleCreateNew = () => {
    setTourToEdit(null);
    setModalOpen(true);
  };

  const handleEdit = (tour: Tour) => {
    setTourToEdit(tour);
    setModalOpen(true);
  };

  const handleDeletePrompt = (tour: Tour) => {
    setTourToDelete(tour);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!tourToDelete) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/tours/${tourToDelete.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erreur lors de la suppression");
      }

      setTours((prev) => prev.filter((t) => t.id !== tourToDelete.id));
      showToast(`Tour "${tourToDelete.property_name}" supprimé.`);
      setDeleteDialogOpen(false);
      setTourToDelete(null);
    } catch (err: any) {
      showToast(err.message || "Erreur lors de la suppression.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Success handler for create/edit modal
  const handleModalSuccess = (savedTour: Tour, isNew: boolean) => {
    if (isNew) {
      setTours((prev) => [savedTour, ...prev]);
      showToast(`Nouveau tour "${savedTour.property_name}" créé avec succès.`);
    } else {
      setTours((prev) =>
        prev.map((t) => (t.id === savedTour.id ? savedTour : t))
      );
      showToast(`Tour "${savedTour.property_name}" mis à jour.`);
    }
    setModalOpen(false);
    setTourToEdit(null);
  };

  // Filtering & Search
  const filteredTours = useMemo(() => {
    return tours.filter((tour) => {
      // Search term
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (tour.property_name || "").toLowerCase().includes(q);
        const matchesClient = (tour.client_name || "").toLowerCase().includes(q);
        const matchesSlug = (tour.slug || "").toLowerCase().includes(q);
        const matchesSector = (tour.sector || "").toLowerCase().includes(q);
        if (!matchesName && !matchesClient && !matchesSlug && !matchesSector) {
          return false;
        }
      }

      // Sector filter
      if (selectedSector !== "all") {
        const qSector = selectedSector.toLowerCase();
        let tSector = (tour.sector || "").toLowerCase();
        if (tSector === "clinique" || tSector === "sante" || tSector === "santé") tSector = "clinic";
        if (tSector === "musee" || tSector === "musée" || tSector === "galerie" || tSector === "gallery") tSector = "museum";
        if (tSector === "sport" || tSector === "fitness" || tSector === "salle de sport") tSector = "gym";
        if (tSector === "evenement" || tSector === "événement" || tSector === "evenementiel" || tSector === "événementiel") tSector = "event";
        if (tSector === "hotel" || tSector === "hôtel") tSector = "hotel";

        if (tSector !== qSector) {
          return false;
        }
      }

      // Status filter
      if (selectedStatus === "active" && !tour.active) return false;
      if (selectedStatus === "inactive" && tour.active) return false;

      return true;
    });
  }, [tours, searchQuery, selectedSector, selectedStatus]);

  // Sector badge helper with high-contrast vibrant colors and indicator dots
  const getSectorBadge = (sectorValue: string | null) => {
    if (!sectorValue) {
      return (
        <span className="whitespace-nowrap inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded-md bg-slate-100 text-slate-700 border border-slate-300">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 flex-shrink-0" />
          <span>Non défini</span>
        </span>
      );
    }

    const raw = sectorValue.trim().toLowerCase();
    
    // Normalize aliases from DB or user inputs
    let key = raw;
    if (raw === "clinique" || raw === "sante" || raw === "santé") key = "clinic";
    if (raw === "musee" || raw === "musée" || raw === "galerie" || raw === "gallery") key = "museum";
    if (raw === "sport" || raw === "fitness" || raw === "salle de sport") key = "gym";
    if (raw === "evenement" || raw === "événement" || raw === "evenementiel" || raw === "événementiel") key = "event";
    if (raw === "hotel" || raw === "hôtel") key = "hotel";

    const match = TOUR_SECTORS.find((s) => s.value.toLowerCase() === key);
    const label = match ? match.label : sectorValue;
    const colorClass = match ? match.badgeColor : "bg-slate-100 text-slate-700 border-slate-300";
    const dotColor = match ? match.dotColor : "bg-slate-500";

    return (
      <span
        title={label}
        className={`whitespace-nowrap inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-semibold rounded-md border ${colorClass} capitalize flex-shrink-0 shadow-xs`}
      >
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
        <span className="truncate">{label}</span>
      </span>
    );
  };

  return (
    <div className="space-y-3 relative flex flex-col flex-1 min-h-0">
      {/* Toast Notification Popup */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-surface border border-accent/40 text-text px-4 py-2.5 rounded-xl shadow-2xl animate-in slide-in-from-bottom-3 duration-200">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="text-xs font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Top Header & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-3.5 rounded-xl border border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent/10 border border-accent/20 text-accent flex-shrink-0">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-text">Visites Virtuelles (Tours 3D)</h2>
            <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
              <span>{tours.length} tours au total</span>
              <span>•</span>
              <span className="text-emerald-400 font-medium">
                {tours.filter((t) => t.active).length} actifs
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCreateNew}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-accent text-accent-foreground hover:bg-accent-hover transition-all shadow-sm active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nouveau tour</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-surface p-2.5 rounded-xl border border-border">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-subtle" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par bien, client, slug, secteur..."
            className="w-full pl-8 pr-4 py-1 text-xs bg-surface-subtle border border-border rounded-lg text-text placeholder:text-text-subtle focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-text-muted hover:text-text"
            >
              Effacer
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Sector filter */}
          <div className="flex items-center gap-1.5 bg-surface-subtle px-2.5 py-1 rounded-lg border border-border text-xs">
            <Layers className="w-3 h-3 text-text-muted flex-shrink-0" />
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="bg-transparent text-text text-xs font-medium focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-surface text-text">Tous les secteurs</option>
              {TOUR_SECTORS.map((s) => (
                <option key={s.value} value={s.value} className="bg-surface text-text">
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1.5 bg-surface-subtle px-2.5 py-1 rounded-lg border border-border text-xs">
            <SlidersHorizontal className="w-3 h-3 text-text-muted flex-shrink-0" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="bg-transparent text-text text-xs font-medium focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-surface text-text">Tous les statuts</option>
              <option value="active" className="bg-surface text-text">Actifs uniquement</option>
              <option value="inactive" className="bg-surface text-text">Inactifs uniquement</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table with tightened cells and truncation */}
      <div className="bg-surface border border-border rounded-xl flex-1 flex flex-col min-h-0 overflow-hidden shadow-sm">
        <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-surface-subtle/90 border-b border-border sticky top-0 z-10 backdrop-blur-sm">
              <tr>
                <th className="py-2.5 px-3 text-[11px] font-semibold text-text-muted tracking-wider whitespace-nowrap min-w-[180px]">
                  Bien / Projet
                </th>
                <th className="py-2.5 px-3 text-[11px] font-semibold text-text-muted tracking-wider whitespace-nowrap min-w-[120px]">
                  Client
                </th>
                <th className="py-2.5 px-3 text-[11px] font-semibold text-text-muted tracking-wider whitespace-nowrap min-w-[130px]">
                  Secteur
                </th>
                <th className="py-2.5 px-3 text-[11px] font-semibold text-text-muted tracking-wider whitespace-nowrap min-w-[150px]">
                  Lien Visite Immersio
                </th>
                <th className="py-2.5 px-3 text-[11px] font-semibold text-text-muted tracking-wider whitespace-nowrap text-center min-w-[80px]">
                  Statut
                </th>
                <th className="py-2.5 px-3 text-[11px] font-semibold text-text-muted tracking-wider whitespace-nowrap text-right min-w-[170px]">
                  Copier & Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredTours.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-text-muted">
                    <div className="flex flex-col items-center justify-center space-y-1.5">
                      <Globe className="w-6 h-6 text-text-subtle" />
                      <p className="font-medium text-xs text-text">Aucun tour virtuel trouvé</p>
                      <p className="text-[11px] text-text-subtle">
                        {searchQuery || selectedSector !== "all" || selectedStatus !== "all"
                          ? "Modifiez vos filtres ou termes de recherche."
                          : "Commencez par ajouter votre premier tour."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTours.map((tour) => {
                  const immersioUrl = `https://immersio.ma/visite/${tour.slug}`;
                  const iframeCode =
                    tour.iframe ||
                    `<iframe src="${immersioUrl}" width="100%" height="100%" frameborder="0" scrolling="no"></iframe>`;

                  const linkCopied = copiedKey === `${tour.id}-link`;
                  const iframeCopied = copiedKey === `${tour.id}-iframe`;
                  const directCopied = copiedKey === `${tour.id}-direct`;

                  return (
                    <tr
                      key={tour.id}
                      className="hover:bg-surface-subtle/50 transition-colors group"
                    >
                      {/* 1. Property Name with ellipsis */}
                      <td className="py-2 px-3 font-medium text-text max-w-[200px]">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="truncate text-xs text-text block flex-1"
                            title={tour.property_name}
                          >
                            {tour.property_name}
                          </span>
                          {tour.realsee_url && (
                            <a
                              href={tour.realsee_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Ouvrir la visite 3D source (Realsee / Matterport)"
                              className="text-text-subtle hover:text-accent p-0.5 rounded transition-colors flex-shrink-0"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </td>

                      {/* 2. Client Name with ellipsis */}
                      <td className="py-2 px-3 text-text-muted text-xs max-w-[140px]">
                        <span
                          className="truncate block"
                          title={tour.client_name || "Non renseigné"}
                        >
                          {tour.client_name || <span className="text-text-subtle">—</span>}
                        </span>
                      </td>

                      {/* 3. Sector (never wraps) */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        {getSectorBadge(tour.sector)}
                      </td>

                      {/* 4. Slug & Immersio Link with ellipsis */}
                      <td className="py-2 px-3 max-w-[160px]">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <code
                            className="text-[11px] text-accent font-mono bg-accent/5 px-1.5 py-0.5 rounded border border-accent/15 truncate block flex-1"
                            title={tour.slug}
                          >
                            {tour.slug}
                          </code>
                          <a
                            href={immersioUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Ouvrir la page visite immersio.ma"
                            className="text-text-subtle hover:text-accent p-0.5 rounded hover:bg-surface-muted transition-colors flex-shrink-0"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </td>

                      {/* 5. Status Toggle */}
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(tour)}
                          title="Cliquer pour activer/désactiver"
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${
                            tour.active
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/25 hover:bg-emerald-500/25"
                              : "bg-zinc-500/15 text-zinc-400 border-zinc-500/25 hover:bg-zinc-500/25"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              tour.active ? "bg-emerald-400" : "bg-zinc-400"
                            }`}
                          />
                          {tour.active ? "Actif" : "Inactif"}
                        </button>
                      </td>

                      {/* 6. Quick Copy & CRUD Actions */}
                      <td className="py-2 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1 flex-shrink-0">
                          {/* Copier Lien Immersio */}
                          <button
                            type="button"
                            onClick={() =>
                              handleCopy(immersioUrl, `${tour.id}-link`, "Lien Immersio")
                            }
                            title="Copier le lien Immersio"
                            className={`p-1 rounded-md border transition-all ${
                              linkCopied
                                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 scale-105"
                                : "bg-surface-subtle text-text-muted hover:text-text hover:bg-surface-muted border-border"
                            }`}
                          >
                            {linkCopied ? (
                              <Check className="w-3.5 h-3.5" />
                            ) : (
                              <LinkIcon className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Copier Code Iframe */}
                          <button
                            type="button"
                            onClick={() =>
                              handleCopy(iframeCode, `${tour.id}-iframe`, "Code Iframe")
                            }
                            title="Copier le code d'intégration Iframe"
                            className={`p-1 rounded-md border transition-all ${
                              iframeCopied
                                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 scale-105"
                                : "bg-surface-subtle text-text-muted hover:text-accent hover:bg-surface-muted border-border"
                            }`}
                          >
                            {iframeCopied ? (
                              <Check className="w-3.5 h-3.5" />
                            ) : (
                              <Code2 className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Copier URL source 3D (Realsee / Matterport) */}
                          {tour.realsee_url && (
                            <button
                              type="button"
                              onClick={() =>
                                handleCopy(
                                  tour.realsee_url!,
                                  `${tour.id}-direct`,
                                  "Lien 3D source"
                                )
                              }
                              title="Copier l'URL source directe"
                              className={`p-1 rounded-md border transition-all ${
                                directCopied
                                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 scale-105"
                                  : "bg-surface-subtle text-text-muted hover:text-text hover:bg-surface-muted border-border"
                              }`}
                            >
                              {directCopied ? (
                                <Check className="w-3.5 h-3.5" />
                              ) : (
                                <Compass className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}

                          {/* Divider */}
                          <div className="w-[1px] h-3.5 bg-border mx-0.5" />

                          {/* Modifier */}
                          <button
                            type="button"
                            onClick={() => handleEdit(tour)}
                            title="Modifier le tour"
                            className="p-1 rounded-md text-text-muted hover:text-text hover:bg-surface-muted transition-colors border border-transparent hover:border-border"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Supprimer */}
                          <button
                            type="button"
                            onClick={() => handleDeletePrompt(tour)}
                            title="Supprimer le tour"
                            className="p-1 rounded-md text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors border border-transparent hover:border-red-500/20"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      <TourModal
        isOpen={modalOpen}
        tourToEdit={tourToEdit}
        onClose={() => {
          setModalOpen(false);
          setTourToEdit(null);
        }}
        onSuccess={handleModalSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <TourDeleteDialog
        isOpen={deleteDialogOpen}
        tour={tourToDelete}
        isDeleting={isDeleting}
        onClose={() => {
          setDeleteDialogOpen(false);
          setTourToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

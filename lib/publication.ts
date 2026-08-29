/**
 * lib/publication.ts — État de publication du blog et du portfolio.
 *
 * Le statut stocké ne connaît que « Published » et « Draft ». Un contenu daté
 * du futur mais marqué publié partait donc en ligne immédiatement : la date de
 * publication était décorative.
 *
 * Un troisième état, « Programmé », est déduit de la paire (statut, date)
 * plutôt que stocké : rien à migrer, aucune valeur à maintenir en base, et
 * surtout aucun risque qu'un contenu reste « Programmé » après son échéance
 * faute de tâche planifiée pour le basculer. Le site filtre sur la date, le
 * dashboard affiche l'état correspondant.
 */

export const PUBLISHED = "Published";
export const DRAFT = "Draft";

export type PublicationState = "publie" | "programme" | "brouillon";

/** Date du jour au format `YYYY-MM-DD`, dans le fuseau du serveur. */
export function todayISO(): string {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

/**
 * État réel d'un contenu.
 *
 * Une date absente vaut « publié maintenant » : les lignes importées du Sheet
 * n'en portaient pas, et les traiter comme programmées les ferait disparaître
 * du site.
 */
export function getPublicationState(
  status: string | null | undefined,
  date: string | null | undefined
): PublicationState {
  if (status !== PUBLISHED) return "brouillon";
  if (!date) return "publie";
  // Comparaison lexicographique : les colonnes sont de type `date`, donc au
  // format YYYY-MM-DD, où l'ordre alphabétique est l'ordre chronologique.
  return date.slice(0, 10) > todayISO() ? "programme" : "publie";
}

/** Libellé français de l'état, pour les tableaux et les formulaires. */
export const PUBLICATION_LABELS: Record<PublicationState, string> = {
  publie: "Publié",
  programme: "Programmé",
  brouillon: "Brouillon",
};

/** Classes de badge par état, alignées sur les statuts des leads. */
export const PUBLICATION_STYLES: Record<PublicationState, string> = {
  publie: "bg-emerald-50 text-emerald-700 border-emerald-200",
  programme: "bg-blue-50 text-blue-700 border-blue-200",
  brouillon: "bg-surface-muted text-text-muted border-border",
};

/**
 * Restreint une requête Supabase aux contenus réellement en ligne.
 *
 * `status = Published` ET (date nulle OU date <= aujourd'hui). Sans le volet
 * date, un article programmé pour la semaine prochaine est servi aujourd'hui.
 */
export function onlyLive<T extends { eq: (c: string, v: unknown) => T; or: (f: string) => T }>(
  query: T,
  dateColumn: string
): T {
  return query.eq("status", PUBLISHED).or(`${dateColumn}.is.null,${dateColumn}.lte.${todayISO()}`);
}

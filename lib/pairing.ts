/**
 * lib/pairing.ts — Regroupe les deux langues d'un même contenu.
 *
 * Le blog et le portfolio stockent une ligne par langue, appariées par
 * `linked_topic_id`. Le tableau les affichait comme deux entrées distinctes :
 * un même projet occupait deux lignes, se comptait deux fois, et se modifiait
 * en deux allers-retours — avec le risque de laisser les versions diverger.
 *
 * Une paire est ici une seule entrée, portant sa version française et sa
 * version anglaise. Un contenu qui n'existe que dans une langue reste une
 * entrée valide, avec l'autre moitié vide : c'est précisément ce qu'il faut
 * voir pour aller la créer.
 */

export type ContentLanguage = "French" | "English";

/** Le minimum qu'une ligne doit exposer pour être appariée. */
export interface PairableRecord {
  id: string;
  slug: string;
  language: ContentLanguage;
  linked_topic_id: string | null;
}

export interface Pair<T extends PairableRecord> {
  /**
   * Clé stable de la paire : l'identifiant de sujet lié quand il existe,
   * sinon l'id de la ligne orpheline. Sert de `key` React et de sélection.
   */
  key: string;
  /** Identifiant de sujet partagé, vide pour un contenu non apparié. */
  topicId: string;
  fr: T | null;
  en: T | null;
}

/**
 * Regroupe des lignes en paires, dans l'ordre d'arrivée.
 *
 * Deux lignes de même langue partageant un `linked_topic_id` ne devraient pas
 * exister ; si cela arrive, la seconde forme sa propre entrée plutôt que
 * d'écraser la première — un doublon visible se corrige, un doublon masqué se
 * découvre le jour où la mauvaise version part en ligne.
 */
export function pairByTopic<T extends PairableRecord>(rows: ReadonlyArray<T>): Pair<T>[] {
  const pairs: Pair<T>[] = [];
  const byTopic = new Map<string, Pair<T>>();

  for (const row of rows) {
    const topicId = row.linked_topic_id?.trim() ?? "";
    const side = row.language === "French" ? "fr" : "en";

    if (!topicId) {
      pairs.push({ key: row.id, topicId: "", fr: null, en: null, [side]: row } as Pair<T>);
      continue;
    }

    const existing = byTopic.get(topicId);
    if (existing && existing[side] === null) {
      existing[side] = row;
      continue;
    }
    if (existing) {
      // Collision de langue : entrée séparée, visible comme telle.
      pairs.push({ key: row.id, topicId, fr: null, en: null, [side]: row } as Pair<T>);
      continue;
    }

    const pair: Pair<T> = { key: topicId, topicId, fr: null, en: null };
    pair[side] = row;
    byTopic.set(topicId, pair);
    pairs.push(pair);
  }

  return pairs;
}

/** La version à afficher dans la liste : le français par défaut. */
export function primary<T extends PairableRecord>(pair: Pair<T>): T {
  // Une paire est toujours construite depuis au moins une ligne.
  return (pair.fr ?? pair.en) as T;
}

/** Langues réellement présentes, dans l'ordre d'affichage. */
export function languagesOf<T extends PairableRecord>(pair: Pair<T>): Array<"FR" | "EN"> {
  const out: Array<"FR" | "EN"> = [];
  if (pair.fr) out.push("FR");
  if (pair.en) out.push("EN");
  return out;
}

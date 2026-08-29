/**
 * lib/csv.ts — Export CSV partagé par les cinq tableaux du dashboard.
 *
 * Aucune donnée ne pouvait sortir de l'outil : ni liste de leads à confier à
 * un commercial, ni récapitulatif de devis pour la comptabilité, ni
 * sauvegarde hors Supabase.
 *
 * Deux choix dictés par Excel en français, qui est l'usage réel ici :
 *   - séparateur point-virgule, car la virgule y est le séparateur décimal ;
 *   - BOM UTF-8 en tête, sans lequel Excel lit les accents en Windows-1252 et
 *     affiche « KÃ©nitra ».
 */

export interface CsvColumn<T> {
  /** En-tête de colonne, tel qu'il apparaîtra dans le fichier. */
  header: string;
  /** Valeur pour une ligne. Les null/undefined deviennent une cellule vide. */
  value: (row: T) => string | number | null | undefined;
}

/**
 * Échappe une cellule.
 *
 * Le guillemet double est le caractère d'échappement du format ; il doit être
 * doublé. Une cellule qui commence par =, +, - ou @ est interprétée comme une
 * formule par Excel : on la préfixe d'une apostrophe, faute de quoi un nom de
 * prospect saisi « =1+1 » deviendrait une formule exécutée à l'ouverture.
 */
function escapeCell(raw: string | number | null | undefined): string {
  if (raw === null || raw === undefined) return "";
  let text = String(raw);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

/** Construit le contenu CSV (sans BOM). */
export function buildCsv<T>(rows: ReadonlyArray<T>, columns: ReadonlyArray<CsvColumn<T>>): string {
  const head = columns.map((c) => escapeCell(c.header)).join(";");
  const body = rows.map((row) => columns.map((c) => escapeCell(c.value(row))).join(";"));
  return [head, ...body].join("\r\n");
}

/** Nom de fichier horodaté : `leads-2026-08-29.csv`. */
export function csvFileName(prefix: string): string {
  const d = new Date();
  const stamp = [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
  return `${prefix}-${stamp}.csv`;
}

/**
 * Déclenche le téléchargement du CSV dans le navigateur.
 *
 * L'URL blob est révoquée après le clic : sans cela, chaque export laisse le
 * fichier en mémoire jusqu'au rechargement de la page.
 */
export function downloadCsv<T>(
  rows: ReadonlyArray<T>,
  columns: ReadonlyArray<CsvColumn<T>>,
  fileNamePrefix: string
): void {
  const content = buildCsv(rows, columns);
  // ﻿ : BOM UTF-8, pour qu'Excel reconnaisse l'encodage.
  const blob = new Blob([`﻿${content}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = csvFileName(fileNamePrefix);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

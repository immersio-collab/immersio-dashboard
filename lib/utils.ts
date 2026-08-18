/**
 * lib/ — reusable utilities.
 * Placeholder module to assert the folder exists and export a small
 * deterministic helper that is safe to import from anywhere.
 */

/**
 * Join truthy class names into a single string.
 * Intentionally tiny; replace with a library if/when approved.
 */
export function cn(...args: Array<string | false | null | undefined>): string {
  return args.filter(Boolean).join(" ");
}

/**
 * Formatage automatique du numéro de téléphone pour WhatsApp :
 * Nettoie les espaces, tirets, points, parenthèses et gère tous les formats (06..., 07..., +212..., 212..., +33...)
 * pour obtenir un format international standard sans "+" (ex: 212612345678).
 */
export function formatPhoneForWhatsApp(phone?: string | null): string {
  if (!phone) return "";
  const raw = String(phone).trim();
  const hasPlus = raw.startsWith("+") || raw.startsWith("(+");
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";

  // 002126... -> 2126...
  if (digits.startsWith("00")) {
    return digits.slice(2);
  }

  // +2126... ou +336...
  if (hasPlus) {
    if (digits.startsWith("2120") && digits.length === 13) {
      return "212" + digits.slice(4);
    }
    return digits;
  }

  // Format local marocain standard : 06..., 07..., 05... (10 chiffres)
  if (digits.startsWith("0") && digits.length === 10) {
    return "212" + digits.slice(1);
  }

  // 21206... (13 chiffres avec 0 en trop après l'indicatif 212)
  if (digits.startsWith("2120") && digits.length === 13) {
    return "212" + digits.slice(4);
  }

  // Format marocain commençant par 212 sans + (ex: 2126..., 11 ou 12 chiffres)
  if (digits.startsWith("212") && (digits.length === 12 || digits.length === 11)) {
    return digits;
  }

  // Numéro marocain sans le 0 initial (9 chiffres commençant par 6, 7 ou 5)
  if (
    (digits.startsWith("6") || digits.startsWith("7") || digits.startsWith("5")) &&
    digits.length === 9
  ) {
    return "212" + digits;
  }

  return digits;
}

/**
 * Génère l'URL officielle WhatsApp wa.me.
 */
export function getWhatsAppUrl(phone?: string | null, message?: string): string {
  const formatted = formatPhoneForWhatsApp(phone);
  if (!formatted) return "";
  if (message) {
    return `https://wa.me/${formatted}?text=${encodeURIComponent(message)}`;
  }
  return `https://wa.me/${formatted}`;
}

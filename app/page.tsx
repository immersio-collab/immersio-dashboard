import { redirect } from "next/navigation";

import { hasSessionCookie } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Racine du dashboard.
 *
 * Redirige vers le tableau de bord quand la session est valide, vers la
 * connexion sinon. Rediriger inconditionnellement vers /login réaffichait le
 * formulaire de mot de passe à quelqu'un déjà authentifié.
 */
export default async function HomePage() {
  redirect((await hasSessionCookie()) ? "/dashboard" : "/login");
}

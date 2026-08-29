import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { hasSessionCookie } from "@/lib/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Connexion — Immersio Dashboard",
};

export const dynamic = "force-dynamic";

/**
 * Page de connexion (Server Component).
 *
 * Server plutôt que Client pour deux raisons : la session se vérifie ici —
 * arriver sur /login avec une session valide redirige vers le dashboard au
 * lieu de redemander un mot de passe — et le paramètre `next` posé par le
 * middleware est transmis au formulaire, qui le renvoie à la Server Action.
 * Sans cela, tout lien profond retombait sur la vue d'ensemble.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string | string[] };
}) {
  if (await hasSessionCookie()) {
    redirect("/dashboard");
  }

  const raw = searchParams.next;
  const next = Array.isArray(raw) ? raw[0] : raw;

  return <LoginForm next={next} />;
}

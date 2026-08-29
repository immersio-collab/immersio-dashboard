"use client";

import { useFormState, useFormStatus } from "react-dom";

import { login, type LoginState } from "@/lib/auth";

/**
 * Bouton de soumission, désactivé pendant l'exécution de la Server Action.
 */
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full" aria-busy={pending}>
      {pending ? "Connexion…" : "Se connecter"}
    </button>
  );
}

/**
 * Formulaire de connexion (Client Component, pour les hooks react-dom).
 *
 * `next` est le chemin demandé avant la redirection par le middleware. Il
 * voyage dans un champ caché plutôt que dans l'URL de l'action : la Server
 * Action ne reçoit pas les paramètres de requête de la page.
 */
export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useFormState(login, { ok: false } as LoginState);

  return (
    <div className="card p-6">
      <div className="mb-6">
        <h1 className="mb-1">Connexion</h1>
        <p className="text-sm text-text-muted">Accédez à votre tableau de bord Immersio.</p>
      </div>

      <form action={formAction} className="space-y-4" noValidate>
        {state.error ? (
          <div
            role="alert"
            className="border border-border rounded px-3 py-2 text-sm text-text bg-surface-muted"
          >
            {state.error}
          </div>
        ) : null}

        {next ? <input type="hidden" name="next" value={next} /> : null}

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-text mb-1.5">
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            name="password"
            autoComplete="current-password"
            required
            autoFocus
            className="input-base"
            placeholder="••••••••"
          />
        </div>

        <SubmitButton />
      </form>
    </div>
  );
}

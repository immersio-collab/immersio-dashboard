"use client";

/**
 * components/lead-picker.tsx — Sélecteur de lead partagé.
 *
 * Utilisé par le formulaire de devis et le modal portfolio pour lier un
 * enregistrement à un client du CRM (devis.lead_id, portfolio.lead_id).
 * Charge les leads une fois, filtre en local (une centaine de lignes), et
 * sait présélectionner un lead passé par identifiant (ex. ?lead= dans l'URL).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, UserCheck } from "lucide-react";
import type { Lead } from "@/types";

const inputClass =
  "w-full px-2.5 py-1.5 text-xs bg-surface-subtle border border-border rounded-lg text-text placeholder:text-text-subtle focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all";

export function LeadPicker({
  selected,
  onSelect,
  onClear,
  initialLeadId,
  placeholder = "Lier à un lead (nom, téléphone, ville…)",
}: {
  /** Lead actuellement lié — null pour afficher la recherche. */
  selected: Lead | null;
  onSelect: (lead: Lead) => void;
  onClear: () => void;
  /** Présélectionne ce lead dès que la liste est chargée (une seule fois). */
  initialLeadId?: string | null;
  placeholder?: string;
}) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/leads")
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((j) => {
        if (!cancelled) setLeads(Array.isArray(j.data) ? j.data : []);
      })
      .catch(() => {
        if (!cancelled) setLeads([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Présélection : appliquée une seule fois, quand la liste arrive.
  const applied = useRef(false);
  useEffect(() => {
    if (applied.current || !initialLeadId || leads.length === 0) return;
    const lead = leads.find((l) => l.leadId === initialLeadId);
    if (lead) {
      applied.current = true;
      onSelect(lead);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads, initialLeadId]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return leads
      .filter(
        (l) =>
          (l.nom || "").toLowerCase().includes(q) ||
          (l.telephone || "").toLowerCase().includes(q) ||
          (l.ville || "").toLowerCase().includes(q) ||
          l.leadId.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [leads, query]);

  if (selected) {
    return (
      <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-accent/10 border border-accent/30">
        <div className="flex items-center gap-2 min-w-0 text-xs text-text">
          <UserCheck className="w-3.5 h-3.5 text-accent flex-shrink-0" />
          <span className="font-medium truncate">{selected.nom || "Sans nom"}</span>
          <span className="text-text-subtle truncate">
            {[selected.ville, selected.telephone].filter(Boolean).join(" · ")}
          </span>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="text-[10px] uppercase font-bold text-text-subtle hover:text-text flex-shrink-0"
          title="Délier ce lead"
        >
          Délier
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-subtle pointer-events-none" />
      <input
        className={`${inputClass} pl-8`}
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {matches.length > 0 && (
        <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto bg-surface border border-border rounded-lg shadow-xl">
          {matches.map((l) => (
            <button
              key={l.leadId}
              type="button"
              onClick={() => {
                setQuery("");
                onSelect(l);
              }}
              className="w-full text-left px-3 py-2 text-xs hover:bg-surface-muted transition-colors border-b border-border last:border-b-0"
            >
              <span className="font-medium text-text">{l.nom || "Sans nom"}</span>
              <span className="block text-[10px] text-text-subtle">
                {[l.telephone, l.ville, l.typeDeBien].filter(Boolean).join(" · ")}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

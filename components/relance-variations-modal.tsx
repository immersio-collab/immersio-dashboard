"use client";

import { useState, useEffect } from "react";
import {
  MessageSquare,
  Copy,
  Check,
  MessageCircle,
  X,
} from "lucide-react";

export const RELANCE_MESSAGES = {
  relance1: [
    "Bonjour, je reviens vers vous concernant votre projet de visite virtuelle 360°. Je reste disponible si vous avez des questions ou besoin de précisions. À bientôt !",
    "Bonjour, petit rappel concernant notre échange sur la visite virtuelle 360° pour votre activité. N'hésitez pas si vous souhaitez qu'on en discute davantage.",
    "Bonjour, je me permets de relancer suite à votre demande. Je reste à votre écoute pour toute question sur le projet de tour virtuel 360°.",
  ],
  relance2: [
    "Bonjour, je voulais juste m'assurer que vous avez bien toutes les infos nécessaires. Beaucoup de nos clients constatent une vraie différence en visibilité et en confiance client grâce à la visite virtuelle 360°. Dites-moi si je peux répondre à une question.",
    "Bonjour, je repasse vers vous car je sais que ces décisions demandent parfois du temps. Si un point du projet reste flou (délais, tarif, mise en place), je suis là pour clarifier ça rapidement.",
    "Bonjour, je voulais savoir si votre projet de visite virtuelle 360° est toujours d'actualité de votre côté. Je peux vous proposer un créneau rapide pour en reparler si besoin.",
  ],
  relance3: [
    "Bonjour, je n'ai pas eu de retour de votre part donc je me permets une dernière relance. Si le projet n'est plus d'actualité, aucun souci, je reste disponible si cela change à l'avenir.",
    "Bonjour, je clôture le suivi de votre dossier faute de retour, mais n'hésitez pas à me recontacter quand vous le souhaitez si le projet redevient une priorité.",
    "Bonjour, dernier message de ma part pour ne pas trop insister. Si vous êtes toujours intéressé par une visite virtuelle 360°, je reste joignable à tout moment.",
  ],
} as const;

export type RelanceType = keyof typeof RELANCE_MESSAGES;

const RELANCE_LABELS: Record<RelanceType, { title: string; subtitle: string }> = {
  relance1: {
    title: "Relance 1",
    subtitle: "Premier rappel post-formulaire / premier contact",
  },
  relance2: {
    title: "Relance 2",
    subtitle: "Deuxième relance orientée valeur ajoutée et réassurance",
  },
  relance3: {
    title: "Relance 3",
    subtitle: "Dernière relance avant clôture ou mise en sommeil",
  },
};

import { formatPhoneForWhatsApp, getWhatsAppUrl } from "@/lib/utils";

export interface RelanceVariationsModalProps {
  relanceType: RelanceType;
  phoneNumber?: string;
  className?: string;
}

export function RelanceVariationsModal({
  relanceType,
  phoneNumber,
  className = "",
}: RelanceVariationsModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const variations = RELANCE_MESSAGES[relanceType] || [];
  const info = RELANCE_LABELS[relanceType] || {
    title: relanceType,
    subtitle: "Variations de relance",
  };
  const formattedPhone = formatPhoneForWhatsApp(phoneNumber);
  const hasValidPhone = Boolean(formattedPhone && formattedPhone.length >= 8);

  // Close modal on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  async function handleCopy(text: string, index: number) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => {
        setCopiedIndex((prev) => (prev === index ? null : prev));
      }, 2000);
    } catch (err) {
      console.error("Erreur lors de la copie :", err);
    }
  }

  function handleWhatsApp(text: string) {
    if (!hasValidPhone) return;
    const url = getWhatsAppUrl(formattedPhone, text);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <>
      {/* Trigger button beside the toggle */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`p-1 rounded text-text-muted hover:text-text hover:bg-surface-muted border border-border/60 hover:border-border transition-colors inline-flex items-center justify-center ${className}`}
        title={`Voir les variations de message (${info.title})`}
        aria-label={`Voir les variations de message pour ${info.title}`}
      >
        <MessageSquare size={13} className="text-text-muted" aria-hidden="true" />
      </button>

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-[1px] transition-opacity"
            aria-hidden="true"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal Container */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Messages ${info.title}`}
            className="relative bg-surface border border-border rounded-lg shadow-lg w-full max-w-lg max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-150 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="h-14 border-b border-border px-4 py-3 flex items-center justify-between flex-shrink-0 bg-surface">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-text">
                    Messages · {info.title}
                  </h2>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border border-border bg-surface-muted text-text-muted">
                    3 variations
                  </span>
                </div>
                <p className="text-[11px] text-text-subtle truncate max-w-[360px]">
                  {info.subtitle}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded text-text-muted hover:text-text hover:bg-surface-muted transition-colors"
                aria-label="Fermer la boîte de dialogue"
              >
                <X size={15} aria-hidden="true" />
              </button>
            </div>

            {/* Sub-header with recipient phone info */}
            <div className="px-4 py-2 bg-surface-muted/60 border-b border-border text-[11px] text-text-muted flex items-center justify-between">
              <span>Destinataire :</span>
              {hasValidPhone ? (
                <span className="font-mono text-xs text-text font-medium bg-surface px-2 py-0.5 rounded border border-border">
                  +{formattedPhone}
                </span>
              ) : (
                <span className="text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Numéro non renseigné
                </span>
              )}
            </div>

            {/* List of Variations */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5">
              {variations.map((msg, index) => {
                const isCopied = copiedIndex === index;
                return (
                  <div
                    key={index}
                    className="border border-border rounded bg-surface p-3 transition-colors hover:border-border-strong flex flex-col justify-between gap-2.5"
                  >
                    {/* Variation Header */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-text-subtle">
                        Variation {index + 1}
                      </span>
                      <span className="text-[10px] text-text-subtle">
                        {msg.length} caractères
                      </span>
                    </div>

                    {/* Message Body */}
                    <div className="text-xs text-text leading-relaxed p-2.5 rounded bg-surface-muted border border-border/60 select-text whitespace-pre-wrap">
                      {msg}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/40">
                      {/* Copy Button */}
                      <button
                        type="button"
                        onClick={() => handleCopy(msg, index)}
                        className={`inline-flex items-center gap-1.5 text-[11px] font-medium border rounded px-2.5 py-1 transition-all ${
                          isCopied
                            ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                            : "bg-surface text-text-muted hover:text-text hover:bg-surface-muted border-border"
                        }`}
                      >
                        {isCopied ? (
                          <>
                            <Check size={12} className="text-emerald-600" aria-hidden="true" />
                            <span>Copié ✓</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} aria-hidden="true" />
                            <span>Copier</span>
                          </>
                        )}
                      </button>

                      {/* WhatsApp Button */}
                      {hasValidPhone ? (
                        <button
                          type="button"
                          onClick={() => handleWhatsApp(msg)}
                          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 border border-emerald-200 bg-emerald-50 rounded px-2.5 py-1 hover:bg-emerald-100 transition-colors"
                          title="Ouvrir WhatsApp avec ce message pré-rempli"
                        >
                          <MessageCircle size={12} aria-hidden="true" />
                          <span>WhatsApp</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-text-subtle border border-border bg-surface-muted rounded px-2.5 py-1 opacity-50 cursor-not-allowed"
                          title="Numéro manquant"
                        >
                          <MessageCircle size={12} aria-hidden="true" />
                          <span>WhatsApp</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="border-t border-border px-4 py-2.5 flex items-center justify-end bg-surface-muted/40">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-xs font-medium text-text-muted hover:text-text border border-border bg-surface rounded px-3 py-1.5 hover:bg-surface-muted transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

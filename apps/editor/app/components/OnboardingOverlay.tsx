"use client";

import type { RefObject } from "react";
import { useState } from "react";
import styles from "./OnboardingOverlay.module.css";

const STEPS = [
  {
    title: "Benvenuto, Sig. Giusti",
    body: "Abbiamo preparato la Sua postazione di comando digitale. Questa piattaforma è stata progettata per proteggere il Suo sapere e massimizzare la Sua efficacia operativa. Le mostriamo brevemente i Suoi nuovi strumenti.",
    cta: "Iniziamo",
    spotlight: null as "none" | "navigator" | "programma" | "lock" | null,
  },
  {
    title: "La Gerarchia",
    body: "Qui può organizzare il Suo archivio. La sezione **Teoria** è dedicata alla formazione dei Suoi utenti, mentre in **Strategie** troverà i moduli interattivi per l'operatività in tempo reale.",
    cta: "Avanti",
    spotlight: "navigator" as const,
  },
  {
    title: "La Programmazione",
    body: "Il Suo tempo è prezioso. Grazie a questa funzione, Lei può redigere i contenuti in anticipo e decidere il momento esatto in cui verranno sbloccati per i Suoi utenti. Il sistema si occuperà di tutto il resto in totale autonomia.",
    cta: "Avanti",
    spotlight: "programma" as const,
  },
  {
    title: "La Sua Chiave Personale",
    body: "Sig. Giusti, grazie al certificato digitale (mTLS) installato su questo dispositivo, Lei è l'unico possessore della 'Chiave Master'. Nessuno, nemmeno i nostri tecnici o potenziali intrusi, può accedere a questo Editor o modificare i Suoi contenuti senza la Sua autorizzazione hardware. Assicurati di aver installato il certificato client sul dispositivo (vedi doc mTLS).",
    cta: "Avanti",
    spotlight: "lock" as const,
  },
];

export function OnboardingOverlay({
  onComplete,
  spotlightRefs,
}: {
  onComplete: () => void;
  spotlightRefs: {
    navigatorRef?: RefObject<HTMLElement | null>;
    programmaRef?: RefObject<HTMLElement | null>;
  };
}) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      onComplete();
      return;
    }
    setStep((s) => s + 1);
  };

  const navEl = spotlightRefs.navigatorRef?.current;
  const progEl = spotlightRefs.programmaRef?.current;
  const navRect = current.spotlight === "navigator" && navEl ? navEl.getBoundingClientRect() : null;
  const progRect = current.spotlight === "programma" && progEl ? progEl.getBoundingClientRect() : null;

  return (
    <div className={styles.overlay} aria-modal="true" role="dialog">
      <div className={styles.backdrop} />
      {navRect && (
        <div
          className={styles.spotlight}
          style={{
            top: navRect.top,
            left: navRect.left,
            width: navRect.width,
            height: navRect.height,
          }}
        />
      )}
      {progRect && (
        <div
          className={styles.spotlight}
          style={{
            top: progRect.top,
            left: progRect.left,
            width: progRect.width,
            height: progRect.height,
          }}
        />
      )}
      <div className={styles.card}>
        {current.spotlight === "lock" && (
          <div className={styles.lockIcon} aria-hidden>
            🔒
          </div>
        )}
        <h2 className={styles.title}>{current.title}</h2>
        <p className={styles.body}>
          {current.body.split("**").map((part, i) =>
            i % 2 === 1 ? <strong key={i}>{part}</strong> : part
          )}
        </p>
        <button type="button" className={styles.cta} onClick={handleNext}>
          {current.cta}
        </button>
      </div>
    </div>
  );
}

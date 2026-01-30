"use client";

import { useState } from "react";
import styles from "./KillSwitchModal.module.css";

export function KillSwitchModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<"propose" | "confirm">("propose");
  const [code, setCode] = useState("");

  const handleProponi = () => setStep("confirm");
  const handleConfirm = () => {
    onConfirm();
    onCancel();
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="kill-title">
      <div className={styles.backdrop} onClick={onCancel} aria-hidden />
      <div className={styles.modal}>
        <h2 id="kill-title" className={styles.title}>
          Global Kill Switch
        </h2>
        {step === "propose" && (
          <>
            <p className={styles.text}>
              Attivare il protocollo di isolamento invaliderà le sessioni e metterà la piattaforma in manutenzione.
            </p>
            <button type="button" className={styles.btnProponi} onClick={handleProponi}>
              Proponi
            </button>
          </>
        )}
        {step === "confirm" && (
          <>
            <p className={styles.text}>
              Sei sicuro? Richiede conferma Titolare.
            </p>
            <input
              type="text"
              className={styles.input}
              placeholder="Codice conferma (opzionale)"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              aria-label="Codice conferma"
            />
            <div className={styles.actions}>
              <button type="button" className={styles.btnConfirm} onClick={handleConfirm}>
                Conferma
              </button>
              <button type="button" className={styles.btnCancel} onClick={() => setStep("propose")}>
                Annulla
              </button>
            </div>
          </>
        )}
        <button type="button" className={styles.close} onClick={onCancel} aria-label="Chiudi">
          ×
        </button>
      </div>
    </div>
  );
}

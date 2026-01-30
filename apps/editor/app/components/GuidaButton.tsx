"use client";

import styles from "./GuidaButton.module.css";

export function GuidaButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className={styles.guida}
      onClick={onClick}
      title="Rivedi il tutorial"
    >
      Guida
    </button>
  );
}

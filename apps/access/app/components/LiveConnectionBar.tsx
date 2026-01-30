"use client";

import styles from "./LiveConnectionBar.module.css";

export function LiveConnectionBar({ connected }: { connected: boolean }) {
  return (
    <header className={styles.bar} role="banner">
      <div className={connected ? styles.indicatorOn : styles.indicatorOff} />
      <span className={styles.label}>{connected ? "Live Connection" : "Disconnesso"}</span>
    </header>
  );
}

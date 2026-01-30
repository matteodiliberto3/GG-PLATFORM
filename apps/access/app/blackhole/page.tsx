"use client";

import styles from "./blackhole.module.css";

export default function BlackholePage() {
  return (
    <main className={styles.screen}>
      <div className={styles.spinner} aria-hidden />
      <p className={styles.srOnly}>Caricamento</p>
    </main>
  );
}

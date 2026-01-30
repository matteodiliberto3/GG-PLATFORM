"use client";

import type { AdminContent } from "@/lib/api";
import styles from "./Navigator.module.css";

export function Navigator({
  contents,
  selectedId,
  onSelect,
  refForSpotlight,
}: {
  contents: AdminContent[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  refForSpotlight?: (el: HTMLElement | null) => void;
}) {
  const teoria = contents.filter((c) => c.content_type === "THEORY");
  const strategie = contents.filter((c) => c.content_type === "STRATEGY");

  return (
    <aside className={styles.nav} ref={refForSpotlight}>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Teoria</h2>
        <ul className={styles.list}>
          {teoria.length === 0 && <li className={styles.empty}>Nessun documento</li>}
          {teoria.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className={selectedId === c.id ? styles.itemActive : styles.item}
                onClick={() => onSelect(c.id)}
              >
                {c.title || "Senza titolo"}
              </button>
            </li>
          ))}
        </ul>
      </section>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Strategie</h2>
        <ul className={styles.list}>
          {strategie.length === 0 && <li className={styles.empty}>Nessun documento</li>}
          {strategie.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className={selectedId === c.id ? styles.itemActive : styles.item}
                onClick={() => onSelect(c.id)}
              >
                {c.title || "Senza titolo"}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}

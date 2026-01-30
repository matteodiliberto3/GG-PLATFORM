"use client";

import type { SocHealth } from "@/lib/api";
import styles from "./TopBar.module.css";

export function TopBar({
  health,
  onKillSwitchClick,
}: {
  health: SocHealth | null;
  onKillSwitchClick: () => void;
}) {
  const edge = health?.edge ?? "?";
  const backend = health?.backend ?? "?";
  const db = health?.db ?? "?";
  const killActive = health?.global_kill ?? false;

  return (
    <header className={styles.bar} role="banner">
      <div className={styles.nodes}>
        <span className={styles.node} data-status={edge}>
          Edge
        </span>
        <span className={styles.node} data-status={backend}>
          Backend
        </span>
        <span className={styles.node} data-status={db}>
          DB
        </span>
      </div>
      <button
        type="button"
        className={killActive ? styles.killActive : styles.killSwitch}
        onClick={onKillSwitchClick}
        title="Global Kill Switch (Maker-Checker)"
      >
        Global Kill Switch
      </button>
    </header>
  );
}

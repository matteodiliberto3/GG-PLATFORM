"use client";

import type { SocEvent } from "@/lib/api";
import styles from "./ThreatFeed.module.css";

export function ThreatFeed({
  events,
  onSelectEvent,
  selectedEventId,
}: {
  events: SocEvent[];
  onSelectEvent: (event: SocEvent) => void;
  selectedEventId: string | null;
}) {
  const severityColor = (s: string) => {
    if (s === "RED") return styles.sevRed;
    if (s === "YELLOW") return styles.sevYellow;
    return styles.sevGrey;
  };

  const formatTs = (ts: string) => {
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString("it-IT", { hour12: false }) + " " + d.toLocaleDateString("it-IT");
    } catch {
      return ts;
    }
  };

  return (
    <main className={styles.feed}>
      <h2 className={styles.title}>Threat Feed</h2>
      <ul className={styles.list}>
        {events.length === 0 && (
          <li className={styles.empty}>Nessun evento</li>
        )}
        {events.map((ev) => (
          <li
            key={ev.id}
            className={`${styles.item} ${severityColor(ev.severity)} ${selectedEventId === ev.id ? styles.selected : ""}`}
            onClick={() => onSelectEvent(ev)}
          >
            <span className={styles.dot} data-severity={ev.severity} />
            <span className={styles.time}>{formatTs(ev.created_at)}</span>
            <span className={styles.code}>{ev.violation_code}</span>
            {ev.user_id && (
              <span className={styles.user}>{ev.user_id.slice(0, 8)}…</span>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}

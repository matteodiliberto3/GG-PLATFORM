"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./Inspector.module.css";

export function Inspector({
  contentId,
  onScheduleConfirm,
  openScheduling,
  onSchedulingOpened,
  programmaRefForSpotlight,
}: {
  contentId: string | null;
  onScheduleConfirm: (payload: { content_id: string; publish_at: string; timezone: string }) => void;
  openScheduling?: boolean;
  onSchedulingOpened?: () => void;
  programmaRefForSpotlight?: (el: HTMLButtonElement | null) => void;
}) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("12:00");
  const [timezone] = useState("Europe/Rome");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const schedulingRef = useRef<HTMLDivElement>(null);
  const onSchedulingOpenedRef = useRef(onSchedulingOpened);
  onSchedulingOpenedRef.current = onSchedulingOpened;

  useEffect(() => {
    if (!openScheduling) return;
    const d = new Date();
    setDate(d.toISOString().slice(0, 10));
    setTime(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
    setScheduleError(null);
    onSchedulingOpenedRef.current?.();
    schedulingRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [openScheduling]);

  const handleOpenScheduling = useCallback(() => {
    const d = new Date();
    setDate(d.toISOString().slice(0, 10));
    setTime(
      `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
    );
    setConfirmOpen(false);
    setScheduleError(null);
  }, []);

  const handleRequestSchedule = useCallback(() => {
    if (!contentId) {
      setScheduleError("Selezioni o crei un contenuto prima di programmare.");
      return;
    }
    const publishAt = new Date(`${date}T${time}:00`).toISOString();
    setConfirmOpen(true);
  }, [contentId, date, time]);

  const handleConfirmSchedule = useCallback(() => {
    if (!contentId) return;
    const publishAt = new Date(`${date}T${time}:00`).toISOString();
    onScheduleConfirm({ content_id: contentId, publish_at: publishAt, timezone });
    setConfirmOpen(false);
  }, [contentId, date, time, timezone, onScheduleConfirm]);

  return (
    <aside className={styles.inspector}>
      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Programmazione</h2>
        <button
          type="button"
          className={styles.programmaBtn}
          ref={programmaRefForSpotlight}
          onClick={handleOpenScheduling}
          title="Apri pannello programmazione"
        >
          Programma
        </button>
        <div className={styles.scheduling} ref={schedulingRef}>
          <label className={styles.label}>
            Data
            <input
              type="date"
              className={styles.input}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label className={styles.label}>
            Ora
            <input
              type="time"
              className={styles.input}
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </label>
          {scheduleError && <p className={styles.error}>{scheduleError}</p>}
          <button
            type="button"
            className={styles.scheduleCta}
            onClick={handleRequestSchedule}
          >
            Conferma data e ora
          </button>
        </div>

        {confirmOpen && (
          <div className={styles.confirmOverlay}>
            <div className={styles.confirmCard}>
              <p className={styles.confirmText}>
                Sig. Giusti, conferma la pubblicazione per questa data?
              </p>
              <div className={styles.confirmActions}>
                <button
                  type="button"
                  className={styles.confirmYes}
                  onClick={handleConfirmSchedule}
                >
                  Conferma Programmazione
                </button>
                <button
                  type="button"
                  className={styles.confirmNo}
                  onClick={() => setConfirmOpen(false)}
                >
                  Annulla
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Security Live Feed</h2>
        <p className={styles.placeholder}>
          Qui appariranno gli alert in tempo reale (PROMPT D).
        </p>
      </section>

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>User Status Monitor</h2>
        <p className={styles.placeholder}>
          Qui apparirà il monitoraggio utenti (PROMPT D).
        </p>
      </section>
    </aside>
  );
}

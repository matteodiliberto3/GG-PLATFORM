"use client";

import type { ForensicDetail } from "@/lib/api";
import styles from "./ForensicsPanel.module.css";

export function ForensicsPanel({
  detail,
  hwHash,
  userId,
  ipOverride,
  onSetGhosting,
  onPardon,
  loading,
}: {
  detail: ForensicDetail | null;
  hwHash: string | null;
  userId: string | null;
  ipOverride?: string | null;
  onSetGhosting: (hwHash: string) => void;
  onPardon: (hwHash?: string, userId?: string) => void;
  loading: boolean;
}) {
  if (!userId && !hwHash && !detail) {
    return (
      <aside className={styles.panel}>
        <h2 className={styles.title}>Forensics</h2>
        <p className={styles.placeholder}>Selezioni un utente o un evento dal Gate / Threat Feed.</p>
      </aside>
    );
  }

  const telemetry = detail?.telemetry ?? {};
  const hwId = (telemetry as { hw_hash?: string }).hw_hash ?? hwHash ?? "—";
  const ip = ipOverride ?? (telemetry as { ip?: string }).ip ?? "—";
  const isp = (telemetry as { isp?: string }).isp ?? "—";

  return (
    <aside className={styles.panel}>
      <h2 className={styles.title}>Forensics</h2>
      {loading && <p className={styles.loading}>Caricamento…</p>}
      {!loading && (
        <div className={styles.content}>
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Hardware ID</h3>
            <pre className={styles.log}>{hwId}</pre>
          </section>
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>IP / Geo</h3>
            <pre className={styles.log}>IP: {String(ip)}</pre>
            <pre className={styles.log}>ISP: {String(isp)}</pre>
          </section>
          {detail && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>User Action Log</h3>
              <pre className={styles.log}>
                Severity: {detail.severity}
                {"\n"}
                Code: {detail.violation_code}
                {"\n"}
                At: {detail.created_at}
              </pre>
              {Object.keys(telemetry).length > 0 && (
                <pre className={styles.log}>{JSON.stringify(telemetry, null, 2)}</pre>
              )}
            </section>
          )}
          <div className={styles.actions}>
            {hwHash && (
              <button
                type="button"
                className={styles.btnGhost}
                onClick={() => onSetGhosting(hwHash)}
              >
                Set Ghosting
              </button>
            )}
            <button
              type="button"
              className={styles.btnPardon}
              onClick={() => onPardon(hwHash ?? undefined, userId ?? undefined)}
            >
              Pardon / Whitelist
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}

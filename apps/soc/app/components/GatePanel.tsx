"use client";

import type { PendingRow } from "@/lib/api";
import styles from "./GatePanel.module.css";

export function GatePanel({
  pending,
  onApprove,
  onDeny,
  onSelectUser,
  selectedUserId,
}: {
  pending: PendingRow[];
  onApprove: (sessionId: string) => void;
  onDeny: (sessionId: string) => void;
  onSelectUser: (userId: string, hwHash: string | null, ip: string | null) => void;
  selectedUserId: string | null;
}) {
  return (
    <aside className={styles.panel}>
      <h2 className={styles.title}>The Gate</h2>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nickname</th>
              <th>IP / Geo</th>
              <th>Trust</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {pending.length === 0 && (
              <tr>
                <td colSpan={4} className={styles.empty}>
                  Nessuna richiesta PENDING
                </td>
              </tr>
            )}
            {pending.map((row) => (
              <tr
                key={row.id}
                className={selectedUserId === row.user_id ? styles.rowSelected : undefined}
                onClick={() => onSelectUser(row.user_id, row.hw_hash, row.ip)}
              >
                <td className={styles.mono}>{row.nickname ?? "—"}</td>
                <td className={styles.mono}>{row.ip ?? "—"}</td>
                <td>{row.trust_score}</td>
                <td>
                  <button
                    type="button"
                    className={styles.btnApprove}
                    onClick={(e) => {
                      e.stopPropagation();
                      onApprove(row.id);
                    }}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className={styles.btnDeny}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeny(row.id);
                    }}
                  >
                    Deny
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </aside>
  );
}

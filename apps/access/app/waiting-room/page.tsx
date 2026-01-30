"use client";

import styles from "./waiting-room.module.css";

export default function WaitingRoomPage() {
  return (
    <main className={styles.screen}>
      <div className={styles.spinner} aria-hidden />
      <p className={styles.srOnly}>In attesa di approvazione</p>
    </main>
  );
}

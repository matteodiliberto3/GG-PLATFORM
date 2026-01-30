"use client";

import { createClient } from "@/lib/supabase";
import { gateRequest } from "@/lib/api";
import { getHwHash } from "@/lib/hw-hash";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./page.module.css";

export default function Home() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = nickname.trim();
    if (!name || name.length < 2) {
      setError("Inserisci un nickname di almeno 2 caratteri.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      let { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const { error: signInError } = await supabase.auth.signInAnonymously();
        if (signInError) throw new Error(signInError.message);
        const { data: { session: s } } = await supabase.auth.getSession();
        session = s ?? null;
      }
      if (!session?.access_token) throw new Error("Sessione non disponibile.");
      const hw_hash = getHwHash();
      await gateRequest(session.access_token, { nickname: name, hw_hash });
      router.push(`/gate?nickname=${encodeURIComponent(name)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore di connessione.");
      setLoading(false);
    }
  }

  return (
    <main className={styles.gatekeeperLanding}>
      <div className={styles.gatekeeperCard}>
        <h1>Accesso alla Fortezza</h1>
        <p>Inserisci il tuo nickname per continuare.</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Nickname"
            minLength={2}
            maxLength={32}
            disabled={loading}
            autoFocus
          />
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? "Caricamento…" : "Continua"}
          </button>
        </form>
      </div>
    </main>
  );
}

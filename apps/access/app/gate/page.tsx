"use client";

import { createClient } from "@/lib/supabase";
import { gatePolicyResponse } from "@/lib/api";
import { getHwHash } from "@/lib/hw-hash";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback, Suspense } from "react";
import styles from "./gate.module.css";

type Step = "welcome" | "rules" | "choice";
type Attempt = 1 | 2;

function GateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nickname = searchParams.get("nickname")?.trim() ?? "";
  const [step, setStep] = useState<Step>("welcome");
  const [attempt, setAttempt] = useState<Attempt>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finalMessage, setFinalMessage] = useState(false);

  useEffect(() => {
    if (!nickname) {
      router.replace("/");
      return;
    }
  }, [nickname, router]);

  useEffect(() => {
    if (!nickname || step !== "welcome") return;
    const t = setTimeout(() => setStep("rules"), 2000);
    return () => clearTimeout(t);
  }, [nickname, step]);

  useEffect(() => {
    if (!finalMessage) return;
    const t = setTimeout(() => router.replace("/blackhole"), 20000);
    return () => clearTimeout(t);
  }, [finalMessage, router]);

  const getSession = useCallback(async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }, []);

  const handleAccept = async () => {
    setError(null);
    setLoading(true);
    try {
      const token = await getSession();
      if (!token) {
        router.replace("/");
        return;
      }
      await gatePolicyResponse(token, {
        nickname,
        accepted: true,
        attempt,
      });
      router.replace("/waiting-room");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore");
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (attempt === 1) {
      setAttempt(2);
      setError(null);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const token = await getSession();
      if (!token) {
        router.replace("/");
        return;
      }
      const hw_hash = getHwHash();
      try {
        await gatePolicyResponse(token, {
          nickname,
          accepted: false,
          attempt: 2,
          hw_hash,
        });
      } catch {
        // 403 expected when policy rejected twice
      }
      setFinalMessage(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore");
    }
    setLoading(false);
  };

  if (!nickname) return null;

  if (finalMessage) {
    return (
      <main className={styles.screen}>
        <p className={styles.finalMessage}>
          Okay, <strong>{nickname}</strong>. Vuol dire che le nostre strade non coincidono, ma non preoccuparti: ogni percorso è diverso.
        </p>
      </main>
    );
  }

  return (
    <main className={styles.screen}>
      {step === "welcome" && (
        <p className={styles.welcome} key="welcome">
          Benvenuto, <strong>{nickname}</strong>.
        </p>
      )}

      {step === "rules" && (
        <div className={styles.rulesBlock} key="rules">
          <p className={styles.rulesTitle}>Prima di continuare su questa piattaforma le regole sono:</p>
          <ol className={styles.rulesList}>
            {RULES.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ol>
          <div className={styles.buttons}>
            <button
              type="button"
              className={styles.acceptBtn}
              onClick={handleAccept}
              disabled={loading}
            >
              Accetta
            </button>
            <button
              type="button"
              className={attempt === 2 ? `${styles.rejectBtn} ${styles.rejectBtnActive}` : styles.rejectBtn}
              onClick={handleReject}
              disabled={loading}
            >
              Rifiuta
            </button>
          </div>
          {attempt === 2 && (
            <p className={styles.lastChance}>Ultima possibilità, quale scegli?</p>
          )}
          {error && <p className={styles.error}>{error}</p>}
        </div>
      )}
    </main>
  );
}

const RULES = [
  "Non tentare attacchi di hacking: il sito è una fortezza. Ogni anomalia viene tracciata.",
  "Proprietà Intellettuale Inviolabile: non puoi condividere le informazioni. Screenshot, copia-incolla e foto con smartphone sono rilevati e portano al ban.",
  "Cookie & Policy di Sicurezza: accetti la conservazione dei dati necessari a proteggere l'integrità dei contenuti del Sig. Giusti.",
];

function GateFallback() {
  return (
    <main className={styles.screen}>
      <div className={styles.spinner} aria-hidden />
    </main>
  );
}

export default function GatePage() {
  return (
    <Suspense fallback={<GateFallback />}>
      <GateContent />
    </Suspense>
  );
}

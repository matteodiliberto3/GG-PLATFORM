"use client";

import { createClient } from "@/lib/supabase";
import { getReaderContent } from "@/lib/api";
import { getHwHash } from "@/lib/hw-hash";
import { sendEdrLog, embedWatermark } from "@/lib/edr-log";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { LiveConnectionBar } from "../../components/LiveConnectionBar";
import { SandboxWidget } from "../../components/SandboxWidget";
import styles from "./content.module.css";

const HMAC_SECRET = process.env.NEXT_PUBLIC_HMAC_SECRET ?? "";

type Content = {
  id: string;
  title: string;
  content_type: "THEORY" | "STRATEGY";
  status: string;
  publish_at: string | null;
  created_at: string;
};

export default function ReaderContentPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [content, setContent] = useState<Content | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blur, setBlur] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [watermarkedTitle, setWatermarkedTitle] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) return;
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          router.replace("/");
          return;
        }
        if (!cancelled && session.user?.id) setUserId(session.user.id);
        const hwHash = getHwHash();
        const data = await getReaderContent(session.access_token, id, hwHash);
        if (!cancelled) setContent(data);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Errore";
        if (msg.includes("403") || msg.includes("not approved")) {
          router.replace("/waiting-room");
          return;
        }
        if (!cancelled) setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  useEffect(() => {
    const handleVisibility = () => {
      setBlur(document.hidden);
      if (document.hidden && content?.content_type === "STRATEGY" && HMAC_SECRET) {
        createClient()
          .auth.getSession()
          .then(({ data: { session } }) => {
            if (session?.access_token) {
              sendEdrLog(session.access_token, { event_type: "focus_loss" }, HMAC_SECRET).catch(() => { });
            }
          });
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [content?.content_type]);

  useEffect(() => {
    if (!content || content.content_type !== "STRATEGY" || !userId) {
      setWatermarkedTitle(null);
      return;
    }
    let cancelled = false;
    embedWatermark(content.title, userId).then((w) => {
      if (!cancelled) setWatermarkedTitle(w);
    });
    return () => {
      cancelled = true;
    };
  }, [content?.id, content?.title, content?.content_type, userId]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (content?.content_type === "STRATEGY") {
        e.preventDefault();
        if (HMAC_SECRET) {
          createClient()
            .auth.getSession()
            .then(({ data: { session } }) => {
              if (session?.access_token) {
                sendEdrLog(session.access_token, { event_type: "copy_attempt" }, HMAC_SECRET).catch(() => { });
              }
            });
        }
      }
    },
    [content?.content_type]
  );

  if (loading) {
    return (
      <div className={styles.screen}>
        <LiveConnectionBar connected />
        <div className={styles.spinner} aria-hidden />
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className={styles.screen}>
        <LiveConnectionBar connected />
        <main className={styles.main}>
          <p className={styles.error}>{error ?? "Contenuto non trovato."}</p>
          <Link href="/reader" className={styles.back}>← Torna al Notebook</Link>
        </main>
      </div>
    );
  }

  const isStrategie = content.content_type === "STRATEGY";
  const displayTitle = isStrategie && watermarkedTitle != null ? watermarkedTitle : content.title;

  return (
    <div
      className={`${styles.screen} ${isStrategie ? styles.screenStrategie : styles.screenTeoria} ${blur ? styles.blur : ""}`}
      onContextMenu={handleContextMenu}
    >
      {isStrategie && userId && (
        <div className={styles.watermark} aria-hidden>
          ID {userId.slice(-8)}
        </div>
      )}
      <LiveConnectionBar connected />
      <main className={styles.main}>
        <Link href="/reader" className={styles.back}>← Torna al Notebook</Link>

        {!isStrategie && (
          <aside className={styles.sidebarTeoria}>
            <h2 className={styles.sidebarTitle}>Indice</h2>
            <nav>
              <ul className={styles.chapterList}>
                <li><a href="#cap1" className={styles.chapterLink}>Capitolo 1</a></li>
                <li><a href="#cap2" className={styles.chapterLink}>Capitolo 2</a></li>
              </ul>
            </nav>
            <p className={styles.progress}>Completamento: 0%</p>
          </aside>
        )}

        {isStrategie && (
          <aside className={styles.sidebarStrategie}>
            <h2 className={styles.sidebarTitle}>Alert</h2>
            <p className={styles.sidebarMeta}>Nessun alert attivo.</p>
            <h2 className={styles.sidebarTitle}>Strategie attive</h2>
            <p className={styles.sidebarMeta}>{displayTitle}</p>
          </aside>
        )}

        <div className={isStrategie ? styles.contentStrategie : styles.contentTeoria}>
          <h1 className={styles.title}>{displayTitle}</h1>
          {!isStrategie && (
            <div className={styles.bodyTeoria}>
              <p>Contenuto protetto (Teoria). Larghezza max 800px, tipografia serif per la lettura.</p>
              <p>Placeholder: il contenuto reale sarà decifrato e iniettato dal modulo Wasm.</p>
            </div>
          )}
          {isStrategie && (
            <div className={styles.bodyStrategie}>
              <div className={styles.ctaRow}>
                <button type="button" className={styles.cta}>Copia Segnale</button>
                <button type="button" className={`${styles.cta} ${styles.ctaSecondary}`}>Apri Calcolatore</button>
              </div>
              <div className={styles.widgetSlot}>
                <SandboxWidget title="Calcolatore / TradingView" />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

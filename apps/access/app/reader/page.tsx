"use client";

import { createClient } from "@/lib/supabase";
import { getReaderContents, type ReaderContent } from "@/lib/api";
import { getHwHash } from "@/lib/hw-hash";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LiveConnectionBar } from "../components/LiveConnectionBar";
import styles from "./reader.module.css";

function Countdown({ publishAt }: { publishAt: string }) {
  const [text, setText] = useState("");

  useEffect(() => {
    const update = () => {
      const now = Date.now();
      const end = new Date(publishAt).getTime();
      if (end <= now) {
        setText("Disponibile ora");
        return;
      }
      const d = Math.max(0, end - now);
      const h = Math.floor(d / 3600000);
      const m = Math.floor((d % 3600000) / 60000);
      const s = Math.floor((d % 60000) / 1000);
      setText(`Disponibile tra: ${h}h ${m}m ${s}s`);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [publishAt]);

  return <span className={styles.countdown}>{text}</span>;
}

function ContentCard({ item }: { item: ReaderContent }) {
  const isLocked = item.status === "SCHEDULED" && item.publish_at;

  return (
    <article className={`${styles.card} ${isLocked ? styles.cardLocked : ""}`}>
      <h3 className={styles.cardTitle}>{item.title}</h3>
      <p className={styles.cardMeta}>
        {item.content_type === "THEORY" ? "Teoria" : "Strategia"}
        {isLocked && item.publish_at && (
          <>
            {" · "}
            <Countdown publishAt={item.publish_at} />
          </>
        )}
      </p>
      {!isLocked && (
        <Link href={`/reader/${item.id}`} className={styles.cardLink}>
          Apri
        </Link>
      )}
      {isLocked && <span className={styles.locked}>Locked</span>}
    </article>
  );
}

export default function ReaderPage() {
  const router = useRouter();
  const [contents, setContents] = useState<ReaderContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          router.replace("/");
          return;
        }
        const hwHash = getHwHash();
        const { contents: list } = await getReaderContents(session.access_token, hwHash);
        if (!cancelled) setContents(list);
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
  }, [router]);

  if (loading) {
    return (
      <div className={styles.screen}>
        <LiveConnectionBar connected />
        <div className={styles.spinner} aria-hidden />
      </div>
    );
  }

  return (
    <div className={styles.screen}>
      <LiveConnectionBar connected />
      <main className={styles.main}>
        <h1 className={styles.title}>Notebook</h1>
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.grid}>
          {contents.map((item) => (
            <ContentCard key={item.id} item={item} />
          ))}
        </div>
        {contents.length === 0 && !error && (
          <p className={styles.empty}>Nessun contenuto disponibile.</p>
        )}
      </main>
    </div>
  );
}

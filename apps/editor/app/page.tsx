"use client";

import { createClient } from "@/lib/supabase";
import {
  getAdminMe,
  getAdminContents,
  postOnboardingComplete,
  postPublish,
  postSchedule,
  type AdminContent,
} from "@/lib/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { OnboardingOverlay } from "./components/OnboardingOverlay";
import { GuidaButton } from "./components/GuidaButton";
import { Navigator } from "./components/Navigator";
import { Canvas } from "./components/Canvas";
import { Inspector } from "./components/Inspector";
import styles from "./page.module.css";

const ONBOARDING_KEY = "editor_onboarding_complete";

export default function EditorPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contents, setContents] = useState<AdminContent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [contentType, setContentType] = useState<"THEORY" | "STRATEGY">("THEORY");

  const navigatorRef = useRef<HTMLElement | null>(null);
  const programmaRef = useRef<HTMLButtonElement | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [schedulingOpen, setSchedulingOpen] = useState(false);
  const handleSchedulingOpened = useCallback(() => setSchedulingOpen(false), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) {
          router.replace("/login");
          return;
        }
        const me = await getAdminMe(session.access_token);
        const fromStorage = typeof window !== "undefined" && localStorage.getItem(ONBOARDING_KEY) === "1";
        const firstLogin = me.first_login && !fromStorage;
        if (!cancelled) {
          setShowOnboarding(firstLogin);
          const { contents: list } = await getAdminContents(session.access_token);
          setContents(list);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Errore");
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleOnboardingComplete = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.access_token) {
        await postOnboardingComplete(session.access_token);
      }
      if (typeof window !== "undefined") localStorage.setItem(ONBOARDING_KEY, "1");
      setShowOnboarding(false);
    } catch {
      if (typeof window !== "undefined") localStorage.setItem(ONBOARDING_KEY, "1");
      setShowOnboarding(false);
    }
  }, []);

  const handlePublishNow = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setMessage("Ci scusi, Sig. Giusti. Effettui l'accesso per pubblicare.");
        return;
      }
      const created = await postPublish(session.access_token, {
        title: title || "Senza titolo",
        encrypted_payload_b64: btoa(unescape(encodeURIComponent(JSON.stringify({ title, body })))),
        type: contentType,
      });
      setMessage("Complimenti, Sig. Giusti. Il Suo nuovo contenuto è ora disponibile per gli utenti autorizzati.");
      const { contents: list } = await getAdminContents(session.access_token);
      setContents(list);
      setSelectedId(created.id);
      setTitle(created.title);
      setBody("");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Ci scusi, Sig. Giusti. Non è stato possibile salvare la bozza. Verifichi la Sua connessione.");
    }
  }, [title, body, contentType]);

  const handleScheduleConfirm = useCallback(
    async (payload: { content_id: string; publish_at: string; timezone: string }) => {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setMessage("Ci scusi, Sig. Giusti. Effettui l'accesso per programmare.");
          return;
        }
        await postSchedule(session.access_token, payload);
        setMessage("Perfetto. Il contenuto verrà sbloccato come richiesto.");
        const { contents: list } = await getAdminContents(session.access_token);
        setContents(list);
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Ci scusi, Sig. Giusti. La programmazione non è andata a buon fine.");
      }
    },
    []
  );

  const handleSelectDoc = useCallback((id: string) => {
    setSelectedId(id);
    const doc = contents.find((c) => c.id === id);
    if (doc) {
      setTitle(doc.title);
      setBody(""); // In futuro: decifrare payload da API
      setContentType(doc.content_type);
    }
  }, [contents]);

  if (!ready) {
    return (
      <div className={styles.screen}>
        <div className={styles.spinner} aria-hidden />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.screen}>
        <p className={styles.error}>{error}</p>
      </div>
    );
  }

  return (
    <div className={styles.screen}>
      <div className={styles.layout}>
        <Navigator
          contents={contents}
          selectedId={selectedId}
          onSelect={handleSelectDoc}
          refForSpotlight={(el) => {
            navigatorRef.current = el;
          }}
        />
        <Canvas
          contentId={selectedId}
          title={title}
          body={body}
          contentType={contentType}
          onTitleChange={setTitle}
          onBodyChange={setBody}
          onContentTypeChange={setContentType}
          onPublishNow={handlePublishNow}
          onProgramma={() => setSchedulingOpen(true)}
        />
        <Inspector
          contentId={selectedId}
          onScheduleConfirm={handleScheduleConfirm}
          openScheduling={schedulingOpen}
          onSchedulingOpened={handleSchedulingOpened}
          programmaRefForSpotlight={(el) => {
            programmaRef.current = el;
          }}
        />
      </div>

      {message && (
        <div className={styles.toast} role="status">
          {message}
          <button type="button" className={styles.toastClose} onClick={() => setMessage(null)}>
            ×
          </button>
        </div>
      )}

      {showOnboarding && (
        <OnboardingOverlay
          onComplete={handleOnboardingComplete}
          spotlightRefs={{
            navigatorRef,
            programmaRef,
          }}
        />
      )}

      <GuidaButton onClick={() => setShowOnboarding(true)} />
    </div>
  );
}

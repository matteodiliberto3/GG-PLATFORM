"use client";

import { createClient } from "@/lib/supabase";
import {
  getSocPending,
  getSocEvents,
  getSocHealth,
  getSocForensicDetails,
  postSocApprove,
  postSocDeny,
  postSocSetGhosting,
  postSocPardon,
  postSocGlobalKill,
  type PendingRow,
  type SocEvent,
  type ForensicDetail,
} from "@/lib/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "./components/TopBar";
import { GatePanel } from "./components/GatePanel";
import { ThreatFeed } from "./components/ThreatFeed";
import { ForensicsPanel } from "./components/ForensicsPanel";
import { KillSwitchModal } from "./components/KillSwitchModal";
import styles from "./page.module.css";

export default function SocPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingRow[]>([]);
  const [events, setEvents] = useState<SocEvent[]>([]);
  const [health, setHealth] = useState<{ edge: string; backend: string; db: string; global_kill: boolean } | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedHwHash, setSelectedHwHash] = useState<string | null>(null);
  const [selectedIp, setSelectedIp] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [forensicDetail, setForensicDetail] = useState<ForensicDetail | null>(null);
  const [forensicLoading, setForensicLoading] = useState(false);
  const [killModalOpen, setKillModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const bearerRef = useRef("");

  const fetchData = useCallback(async (token: string) => {
    try {
      const [pendingRes, eventsRes, healthRes] = await Promise.all([
        getSocPending(token),
        getSocEvents(token, 100),
        getSocHealth(token),
      ]);
      setPending(pendingRes.pending);
      setEvents(eventsRes.events);
      setHealth(healthRes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore");
    }
  }, []);

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
        bearerRef.current = session.access_token;
        if (!cancelled) await fetchData(session.access_token);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Errore");
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchData]);

  const poll = useCallback(() => {
    if (bearerRef.current) fetchData(bearerRef.current);
  }, [fetchData]);

  useEffect(() => {
    const t = setInterval(poll, 8000);
    return () => clearInterval(t);
  }, [poll]);

  useEffect(() => {
    if (!selectedUserId || !bearerRef.current) {
      setForensicDetail(null);
      return;
    }
    let cancelled = false;
    setForensicDetail(null);
    setForensicLoading(true);
    getSocForensicDetails(bearerRef.current, selectedUserId)
      .then((d) => {
        if (!cancelled) setForensicDetail(d);
      })
      .catch(() => {
        if (!cancelled) setForensicDetail(null);
      })
      .finally(() => {
        if (!cancelled) setForensicLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedUserId]);

  const handleApprove = useCallback(
    async (sessionId: string) => {
      try {
        await postSocApprove(bearerRef.current, { session_id: sessionId });
        setToast("Sessione approvata.");
        await fetchData(bearerRef.current);
      } catch (e) {
        setToast(e instanceof Error ? e.message : "Errore approve");
      }
    },
    [fetchData]
  );

  const handleDeny = useCallback(
    async (sessionId: string) => {
      try {
        await postSocDeny(bearerRef.current, { session_id: sessionId });
        setToast("Sessione negata.");
        await fetchData(bearerRef.current);
      } catch (e) {
        setToast(e instanceof Error ? e.message : "Errore deny");
      }
    },
    [fetchData]
  );

  const handleSelectUser = useCallback((userId: string, hwHash: string | null, ip: string | null) => {
    setSelectedUserId(userId);
    setSelectedHwHash(hwHash);
    setSelectedIp(ip);
    setSelectedEventId(null);
  }, []);

  const handleSelectEvent = useCallback((event: SocEvent) => {
    setSelectedEventId(event.id);
    setSelectedIp(null);
    if (event.user_id) {
      setSelectedUserId(event.user_id);
      setForensicDetail({
        id: event.id,
        severity: event.severity,
        violation_code: event.violation_code,
        evidence_score: event.evidence_score,
        telemetry: event.telemetry,
        created_at: event.created_at,
      });
    } else {
      setSelectedUserId(null);
      setSelectedHwHash(null);
      setForensicDetail(null);
    }
  }, []);

  const handleSetGhosting = useCallback(
    async (hwHash: string) => {
      try {
        await postSocSetGhosting(bearerRef.current, { hw_hash: hwHash });
        setToast("Ghosting attivato.");
        await fetchData(bearerRef.current);
      } catch (e) {
        setToast(e instanceof Error ? e.message : "Errore set-ghosting");
      }
    },
    [fetchData]
  );

  const handlePardon = useCallback(
    async (hwHash?: string, userId?: string) => {
      try {
        await postSocPardon(bearerRef.current, { hw_hash: hwHash, user_id: userId });
        setToast("Pardon eseguito.");
        setSelectedUserId(null);
        setSelectedHwHash(null);
        setSelectedIp(null);
        setForensicDetail(null);
        await fetchData(bearerRef.current);
      } catch (e) {
        setToast(e instanceof Error ? e.message : "Errore pardon");
      }
    },
    [fetchData]
  );

  const handleGlobalKill = useCallback(async () => {
    try {
      await postSocGlobalKill(bearerRef.current);
      setToast("Global Kill attivato.");
      await fetchData(bearerRef.current);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Errore global-kill");
    }
  }, [fetchData]);

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
      <TopBar health={health} onKillSwitchClick={() => setKillModalOpen(true)} />
      <div className={styles.layout}>
        <GatePanel
          pending={pending}
          onApprove={handleApprove}
          onDeny={handleDeny}
          onSelectUser={(userId, hwHash, ip) => handleSelectUser(userId, hwHash, ip)}
          selectedUserId={selectedUserId}
        />
        <ThreatFeed
          events={events}
          onSelectEvent={handleSelectEvent}
          selectedEventId={selectedEventId}
        />
        <ForensicsPanel
          detail={forensicDetail}
          hwHash={selectedHwHash}
          userId={selectedUserId}
          ipOverride={selectedIp}
          onSetGhosting={handleSetGhosting}
          onPardon={handlePardon}
          loading={forensicLoading && !!selectedUserId}
        />
      </div>

      {toast && (
        <div className={styles.toast} role="status">
          {toast}
          <button type="button" className={styles.toastClose} onClick={() => setToast(null)}>
            ×
          </button>
        </div>
      )}

      {killModalOpen && (
        <KillSwitchModal
          onConfirm={handleGlobalKill}
          onCancel={() => setKillModalOpen(false)}
        />
      )}
    </div>
  );
}

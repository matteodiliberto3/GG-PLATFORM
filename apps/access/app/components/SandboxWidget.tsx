"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { getWidgetConfig } from "@/lib/api";
import styles from "./SandboxWidget.module.css";

const ALLOWED_ORIGIN = typeof window !== "undefined" ? window.location.origin : "";

function buildPlaceholderSrcdoc(cspHeaders: string): string {
  const cspMeta = cspHeaders
    ? `<meta http-equiv="Content-Security-Policy" content="${cspHeaders.replace(/"/g, "&quot;")}">`
    : "";
  return `<!DOCTYPE html><html><head>${cspMeta}</head><body style='margin:0;background:#1a1a1a;color:#888;font-family:system-ui;padding:1rem;'>Placeholder: TradingView / Calcolatore. Riceve dati solo dal parent via postMessage.</body></html>`;
}

export type SandboxWidgetHandle = {
  sendToWidget: (data: unknown) => void;
};

export const SandboxWidget = forwardRef<
  SandboxWidgetHandle,
  {
    src?: string;
    title?: string;
    onMessage?: (data: unknown) => void;
  }
>(function SandboxWidget({ src, title = "Widget", onMessage }, ref) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [config, setConfig] = useState<{ sandbox_rules: string; csp_headers: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      sendToWidget(data: unknown) {
        const win = iframeRef.current?.contentWindow;
        if (win) win.postMessage(data, "*");
      },
    }),
    []
  );

  useEffect(() => {
    getWidgetConfig()
      .then(setConfig)
      .catch(() => setError("Config non disponibile"));
  }, []);

  useEffect(() => {
    if (!onMessage || !ALLOWED_ORIGIN) return;
    const handler = (event: MessageEvent) => {
      if (event.origin !== ALLOWED_ORIGIN) return;
      if (event.source !== iframeRef.current?.contentWindow) return;
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        onMessage(data);
      } catch {
        onMessage(event.data);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onMessage]);

  if (error) return <div className={styles.error}>{error}</div>;
  if (!config) return <div className={styles.placeholder}>Caricamento widget…</div>;

  const sandbox = config.sandbox_rules || "allow-scripts allow-same-origin";
  const srcdoc = !src ? buildPlaceholderSrcdoc(config.csp_headers || "") : undefined;

  return (
    <div className={styles.wrapper}>
      <iframe
        ref={iframeRef}
        title={title}
        sandbox={sandbox as SandboxAllow}
        className={styles.iframe}
        src={src || undefined}
        srcDoc={srcdoc}
      />
    </div>
  );
});

type SandboxAllow = "allow-scripts" | "allow-same-origin" | (string & {});

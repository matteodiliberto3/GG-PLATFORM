"use client";

import { useCallback, useState } from "react";
import styles from "./Canvas.module.css";

type Mode = "THEORY" | "STRATEGY";

const THEORY_MESSAGE =
  "Sig. Giusti, sta redigendo un contenuto formativo. Il layout è ottimizzato per la lettura.";
const STRATEGY_MESSAGE =
  "Sig. Giusti, sta creando una strategia operativa. I moduli interattivi sono pronti.";

export function Canvas({
  contentId,
  title,
  body,
  contentType,
  onTitleChange,
  onBodyChange,
  onContentTypeChange,
  onPublishNow,
  onProgramma,
}: {
  contentId: string | null;
  title: string;
  body: string;
  contentType: Mode;
  onTitleChange: (v: string) => void;
  onBodyChange: (v: string) => void;
  onContentTypeChange: (v: Mode) => void;
  onPublishNow: () => void;
  onProgramma: () => void;
}) {
  const [preview, setPreview] = useState(false);

  const handleBodyChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => onBodyChange(e.target.value),
    [onBodyChange]
  );
  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onTitleChange(e.target.value),
    [onTitleChange]
  );

  return (
    <main className={styles.canvas}>
      <div className={styles.toolbar}>
        <div className={styles.toggleGroup}>
          <button
            type="button"
            className={contentType === "THEORY" ? styles.toggleActive : styles.toggle}
            onClick={() => onContentTypeChange("THEORY")}
          >
            Teoria
          </button>
          <button
            type="button"
            className={contentType === "STRATEGY" ? styles.toggleActive : styles.toggle}
            onClick={() => onContentTypeChange("STRATEGY")}
          >
            Strategie
          </button>
        </div>
        <p className={styles.contextMessage} role="status">
          {contentType === "THEORY" ? THEORY_MESSAGE : STRATEGY_MESSAGE}
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.btnPrimary} onClick={onPublishNow}>
            Pubblica ora
          </button>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={onProgramma}
            title="Programmazione"
          >
            Programma
          </button>
          <button
            type="button"
            className={styles.previewToggle}
            onClick={() => setPreview((p) => !p)}
          >
            {preview ? "Modifica" : "Anteprima"}
          </button>
        </div>
      </div>

      <div className={styles.editorArea}>
        {!preview ? (
          <>
            <input
              type="text"
              className={styles.titleInput}
              placeholder="Titolo"
              value={title}
              onChange={handleTitleChange}
            />
            <textarea
              className={styles.textarea}
              placeholder="Scriva qui il Suo contenuto (Markdown)..."
              value={body}
              onChange={handleBodyChange}
              spellCheck
            />
          </>
        ) : (
          <div className={styles.preview}>
            <h1 className={styles.previewTitle}>{title || "Senza titolo"}</h1>
            <div
              className={styles.previewBody}
              dangerouslySetInnerHTML={{
                __html: body
                  .split("\n")
                  .map((line) => `<p>${escapeHtml(line || " ")}</p>`)
                  .join(""),
              }}
            />
          </div>
        )}
      </div>
    </main>
  );
}

function escapeHtml(s: string): string {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

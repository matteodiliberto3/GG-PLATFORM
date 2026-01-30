# Watermarking dinamico – Strategie e analisi forense

**Codice:** GG-WATERMARK-V1  
**Contesto:** Vista Strategie (Reader), modulo Wasm `gg-wasm-hmac`.

Invece della webcam (facilmente copribile), i professionisti usano il **watermarking invisibile**: dati invisibili o micro-variazioni (tramite Wasm) unici per ogni utente. Se un utente scatta una foto allo schermo e la pubblica, puoi analizzare il testo estratto (copy-paste, HTML salvato o OCR sulla foto) e risalire all’identificativo dell’utente che l’ha generato.

---

## 1. Come funziona

- **Embed:** Il modulo Wasm `embed_watermark(text, user_id)` inserisce nel testo una codifica **invisibile** (caratteri zero-width Unicode) dell’`user_id`, ogni 20 caratteri circa.
- **Dove si applica:** Nella vista **Strategie** del Reader (Access), titolo (e in futuro il body della strategia) vengono mostrati dopo aver applicato il watermark con l’`user_id` della sessione.
- **Efficacia:** Se l’utente copia il testo, salva la pagina o qualcuno estrae il testo da una foto (OCR), la sequenza zero-width è presente e può essere decodificata per ottenere l’`user_id`. Da lì si risale al nickname/profilo nel backend.

---

## 2. Decodifica forense (estrarre user_id dal testo)

Dato un testo che potrebbe essere stato watermarked (es. contenuto incollato da un leak, o HTML salvato dalla pagina Strategie):

1. **Lato JS (stesso modulo Wasm):**  
   Dopo aver caricato il modulo (`/pkg/gg_wasm_hmac.js`), chiamare:
   ```js
   const user_id = decode_watermark(suspicious_text);
   ```
   Se il testo contiene il watermark, `user_id` sarà una stringa non vuota (es. UUID dell’utente).

2. **Risoluzione nickname:**  
   Con l’`user_id` recuperato, interrogare il backend (profili, sessioni) per ottenere il nickname e l’identità dell’utente.

3. **Riferimento codice:**  
   - Wasm: `packages/gg-wasm-hmac/src/lib.rs` (`embed_watermark`, `decode_watermark`).  
   - Frontend: `apps/access/lib/edr-log.ts` (`embedWatermark`, `decodeWatermark`).  
   - Uso in Reader: `apps/access/app/reader/[id]/page.tsx` (titolo Strategie).

---

## 3. Limitazioni

- **Screenshot/foto:** I caratteri zero-width non sono visibili nell’immagine. L’identificazione da foto funziona solo se dal supporto si estrae il **testo** (es. OCR su screenshot, o testo incollato da qualcuno che ha copiato dalla pagina). Il watermark è quindi particolarmente efficace su copy-paste e su HTML salvato.
- **Estensioni testo:** Quando l’API esporrà il body delle strategie, il watermark andrà applicato anche a quel testo (stessa funzione Wasm) per massimizzare la tracciabilità.

---

## 4. Riferimenti

- **Modulo Wasm:** [packages/gg-wasm-hmac/README.md](../packages/gg-wasm-hmac/README.md) (build, API `embed_watermark` / `decode_watermark`).
- **Blueprint / UX:** [ARC. NOTEBOOK](T%20BLUEPRINTS/ARC.%20NOTEBOOK.md), [NOTEBOOK READER (User Experience)](USER%20EXPERIENCE/NOTEBOOK%20READER%20(User%20Experience).md).

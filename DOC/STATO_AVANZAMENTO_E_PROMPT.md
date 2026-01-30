# Stato avanzamento GG Platform vs Technical Blueprints

**Riferimento:** Tutti i documenti in `DOC/` (T BLUEPRINTS, USER EXPERIENCE, PROFESSIONAL SUIT, STRATEGY & VISION, Security Operations) incluso il nuovo **TERRAFORM INFRASTRUCTURE BLUEPRINT (The Failover Manual)**.

---

## 1. Componenti già realizzate

### 1.1 Fondazioni (Day01)
- **Monorepo:** `apps/editor`, `apps/access`, `apps/soc`, `apps/api`; npm workspaces; script root `dev` / `build` / `lint`.
- **CI:** GitHub Actions (`lint` + `build`).
- **Env:** Template per-app (`env.example`) e `ENVIRONMENT.md`.

### 1.2 Database (Day02)
- **Supabase:** Migrazione unica con tabelle `profiles`, `user_sessions`, `content`, `content_schedule`, `banlist`, `forensic_logs`, `audit_log` (append-only).
- **Enum:** `gg_user_status`, `gg_content_type`, `gg_content_status`, `gg_severity`.
- **RLS:** Policy per ruoli `admin` / `soc` / `user`; audit e forensic solo staff; content LIVE visibile agli utenti.

### 1.3 API (Day03)
- **Gate:** `POST /v1/gate/request`, `POST /v1/gate/policy-response` (con banlist + 403 al 2° rifiuto).
- **Admin:** `POST /v1/admin/publish`, `POST /v1/admin/schedule`, `GET /v1/admin/user-monitor`.
- **SOC:** `POST /v1/soc/set-ghosting`, `GET /v1/soc/forensic-details/:user_id`.
- **Security:** `GET /v1/security/widget-config`.
- **Validazione:** Zod; error model `{ status, error: { code, message, details? } }`.
- **Auth:** Bearer JWT Supabase; `requireAuth` / `requireRole(admin|soc)`.

### 1.4 Redis / Fast-Kill (Day04)
- **State machine:** `ACTIVE` | `SUSPICIOUS` | `SHADOW_BANNED` | `HARD_BANNED` in Redis con TTL.
- **Guard:** In `preHandler`, se header `X-HW-Hash` presente e stato in Redis è SHADOW_BANNED/HARD_BANNED → 403 prima di servire la route.
- **Scrittura stato:** gate/request → ACTIVE; policy-response (2° rifiuto) → HARD_BANNED; set-ghosting → SHADOW_BANNED.

### 1.5 Access – Gatekeeper (Day05)
- **Landing:** Inserimento nickname, auth anonima Supabase, `POST /v1/gate/request`, redirect a `/gate?nickname=...`.
- **Gate:** Welcome “[Nome]” (2s) → Regole della Fortezza (3 punti) → Pulsanti Accetta/Rifiuta; Accetta → `policy-response` accepted + redirect `/waiting-room`; 1° Rifiuta → “Ultima possibilità”; 2° Rifiuta → `policy-response` attempt 2 + messaggio “Okay [Nome]…” + 20s → redirect `/blackhole`.
- **Waiting Room e Blackhole:** Schermate nere con spinner infinito (stesso aspetto).
- **hw_hash:** Persistenza in `localStorage`; invio in gate/request e policy-response (obbligatorio al 2° rifiuto).

---

## 2. Componenti mancanti (da blueprint e sitemap)

### 2.1 Dominio Access (Utente)
- **Notebook Reader:** Layout Teoria (sidebar indice, % completamento, main max 800px, font serif) e Layout Strategie (sidebar alert/strategie, griglia widget, CTA “Copia Segnale” / “Apri Calcolatore”).
- **Sandbox widget:** Iframe con `sandbox` + CSP da `GET /v1/security/widget-config`; bridge `postMessage` unidirezionale (Wasm → widget); origin check.
- **Contenuti cifrati:** Flusso richiesta capitolo → API verifica sessione/Redis → invio chunk cifrato → decrittazione lato client (in futuro Wasm); per ora può essere mock o payload base64.
- **Protezioni UX:** Anti-copy (no select/context menu in Strategie), blur on focus loss, watermark dinamico (ID utente).
- **Contenuti schedulati:** In lista contenuti, elementi “Locked” con countdown “Disponibile tra: Xh Ym Zs”.
- **Barra stato sessione:** Indicatore “Live Connection” (verde) in alto (doc Notebook Reader).

### 2.2 Dominio Editor (Professional Suite)
- **Login / mTLS:** Nessuna UI login; mTLS è richiesto dai doc (Cloudflare Client Certificate). Da implementare: configurazione WAF/Cloudflare per `editor.*` e messaggio chiaro se certificato assente.
- **Onboarding:** Tutorial solo al primo accesso: Step 1 Benvenuto, Step 2 Sidebar Teoria/Strategie, Step 3 Scheduling, Step 4 Chiave mTLS; spotlight sulle zone; CTA “Iniziamo” / “Avanti”; tasto “Guida” in basso a destra; `POST /v1/admin/onboarding_complete` (da aggiungere in API se non c’è).
- **Dashboard Master:** Layout 3 colonne (Navigator | Canvas | Inspector). Navigator: cartelle Teoria e Strategie. Canvas: editor WYSIWYG/Markdown con preview. Inspector: metadati, scheduling, widget.
- **Selettore tipo:** Toggle Teoria vs Strategia; messaggi contestuali (“Sig. Giusti, sta redigendo un contenuto formativo…” / “…moduli interattivi pronti”).
- **Scheduling UI:** Date/time picker; conferma “Sig. Giusti, conferma la pubblicazione per questa data?”; chiamata `POST /v1/admin/schedule`.
- **User Status Monitor:** Tabella (nickname, stato, motivazione, data/ora); filtri; badge Grigio/Giallo/Rosso; pulsante “Vedi Dettagli Tecnici” che apre modal forense (dati da `GET /v1/soc/forensic-details/:user_id`); pulsante “Ripristina Accesso” (Pardon) → endpoint da aggiungere.
- **Security Live Feed:** Badge/lista alert in tempo reale (Grigio/Giallo/Rosso) con click → modal Dettagli; in futuro WebSocket.
- **Modal Dettagli Tecnici:** Header utente + timestamp; motivo blocco; device; geolocalizzazione; confidence.
- **Widget in editor:** Inserimento TradingView, Risk/Reward, Segnale; anteprima in sandbox (stesso protocollo del Reader).
- **Messaggistica:** Tone “Lei” (es. “Ci scusi, Sig. Giusti…”, “Complimenti, Sig. Giusti…”).
- **Auto-save / Heartbeat:** Salvataggio locale cifrato (o in memoria); heartbeat verso SOC ogni 30s (endpoint da definire).

### 2.3 Dominio SOC (Tecnico)
- **Situation Room:** Sfondo #000; Top Bar (stato nodi Edge/Backend/DB + Global Kill Switch con Maker-Checker); Left Panel – coda PENDING con Approve/Deny e Trust Score; Center – Threat Feed (eventi Grigio/Giallo/Rosso); Right Panel – Forensics (HW ID, IP, ISP, action log).
- **Manual Whitelist / Pardon:** Azione per utente bannato che resetta trust e riabilita accesso (API + UI).
- **Global Kill Switch:** Doppia conferma (Maker-Checker); chiamata API che invalida sessioni / blocca accessi; messaggio al Sig. Giusti.
- **Set Ghosting:** UI che chiama `POST /v1/soc/set-ghosting` (già presente in API).
- **Colori doc:** Verde #00FF00 (ok), Giallo #FFFF00 (sospetto), Rosso #FF0000 (violazione).

### 2.4 API / Backend
- **Scheduler:** Worker o cron che controlla `content_schedule` e imposta `content.status = 'LIVE'` al `publish_at` (e eventuale invalidazione cache).
- **Notifiche real-time:** WebSocket (o polling) verso Editor per alert Grigio/Giallo/Rosso; routing per severità come in API Master.
- **Ghost Traffic:** Per utenti SHADOW_BANNED, su determinate route (es. contenuti) rispondere con junk data cifrati e jitter (0.8–1.5 s) invece di 403, come da RESPONSE_TO_ATTACK e EDR SOC.
- **Pardon/Whitelist:** `POST /v1/soc/pardon` o simile (rimozione da banlist / reset stato sessione + Redis); usato da Editor “Ripristina Accesso” e da SOC Manual Whitelist.
- **Approve/Deny accessi:** `POST /v1/soc/approve`, `POST /v1/soc/deny` per utenti PENDING (aggiornamento `user_sessions` + eventuale Redis).

### 2.5 Wasm / Sicurezza avanzata
- **HMAC in Rust:** Modulo Wasm (Rust, wasm-bindgen, hmac, sha2, hex) con `generate_hmac_signature(payload, secret)`; uso per header `X-Signature` su log/alert verso API (doc “Firma HMAC in Rust per il modulo Wasm”).
- **Decrittazione AES-256 + rendering:** Contenuti decifrati e renderizzati dentro Wasm (ARC. NOTEBOOK, EDR SOC); opzionale per una prima release.

### 2.6 Infrastruttura e DRP
- **Terraform (TERRAFORM INFRASTRUCTURE BLUEPRINT):** Cartella `/terraform` con moduli: `networking_security` (Cloudflare DNS, WAF, mTLS), `edge_compute` (Workers, KV, Cron), `application_frontend` (Vercel env, deployment protection). Remote state cifrato; README installazione; nessun segreto in chiaro nei file.
- **DRP:** Runbook che usa `terraform apply -var="env=dr"`; cambio CNAME; sync DB; rotazione segreti/revoca mTLS (doc DRP).
- **mTLS Cloudflare:** Regola WAF per Editor e SOC: richiesta client certificate; BLOCK se assente (doc ARC. NOTEBOOK / Deploy Stack).

---

## 3. Suddivisione in prompt (per realizzazione efficiente)

Ogni prompt sotto è autocontenuto e allineato ai doc di progettazione. Ordine suggerito: prima backend/API, poi Access Reader, poi Editor, poi SOC, infine Wasm e Terraform.

---

### PROMPT A – API: Scheduler, Pardon, Approve/Deny, notifiche base
- **Obiettivo:** Completare il backend per flussi SOC e Editor.
- **Contesto:** `DOC/T BLUEPRINTS/API MASTER SPECIFICATION.md`, `DOC/STRATEGY & VISION/SITEMAP.md`, schema Supabase esistente e RLS.
- **Task:**
  1. **Worker/Cron scheduling:** Ogni minuto (o intervallo configurato) leggere `content_schedule` dove `publish_at <= now()`; per ogni riga impostare `content.status = 'LIVE'` e rimuovere o marcare la riga in `content_schedule` come eseguita. Implementare come endpoint interno o job (es. `GET /internal/run-scheduler` protetto da secret, o script npm).
  2. **Pardon/Whitelist:** Aggiungere `POST /v1/soc/pardon` (body: `hw_hash` o `user_id`). Ruolo: soc o admin. Azioni: disattivare record in `banlist` (is_active = false o delete); aggiornare `user_sessions` a APPROVED/ACTIVE se applicabile; rimuovere chiave Redis per quel hw_hash (se usi `gg:session:<hw_hash>`). Restituire conferma.
  3. **Approve/Deny:** Aggiungere `POST /v1/soc/approve` e `POST /v1/soc/deny` (body: `session_id` o `user_id`). Approve: aggiornare `user_sessions.status` a APPROVED/ACTIVE; scrivere ACTIVE in Redis per l’hw_hash della sessione. Deny: aggiornare a DENIED; scrivere HARD_BANNED in Redis. Solo ruolo soc/admin.
  4. **Notifiche:** Aggiungere endpoint `GET /v1/admin/notifications` (ruolo admin) che restituisce ultimi N eventi da `forensic_logs` e/o `audit_log` con severità (Grigio/Giallo/Rosso) per alimentare il Security Live Feed dell’Editor. Opzionale: stub per WebSocket (es. documentare URL e formato messaggi per implementazione successiva).
- **Output atteso:** Codice in `apps/api`, testabili con curl/Postman; nessun breaking change sulle route esistenti.

---

### PROMPT B – Access: Notebook Reader (layout Teoria + Strategie, lista contenuti, sandbox widget)
- **Obiettivo:** Pagina Reader dopo approvazione SOC: due layout e sandbox widget.
- **Contesto:** `DOC/USER EXPERIENCE/NOTEBOOK READER (User Experience).md`, `DOC/USER EXPERIENCE/THEORY VS STRATEGY.md`, `DOC/STRATEGY & VISION/SITEMAP.md`, `GET /v1/security/widget-config`.
- **Task:**
  1. **Route e guard:** In `apps/access` creare route `/reader` (o `/notebook`). Solo utenti con sessione approvata (verifica tramite API o cookie/session); se non approvato redirect a `/waiting-room`. Header con barra “Live Connection” verde (stato sessione).
  2. **Layout Teoria:** Sidebar con indice capitoli e percentuale completamento; area main con larghezza max 800px; tipografia serif per corpo testo; sfondo #000 o ardesia (#121212) come da doc.
  3. **Layout Strategie:** Sidebar con “Alert” e “Strategie attive”; main a griglia; CTA “Copia Segnale”, “Apri Calcolatore”; sfondo Total Black #000 e accenti neon (verde/blu) come da THEORY VS STRATEGY.
  4. **Lista contenuti:** Chiamata API (da definire, es. `GET /v1/reader/contents`) che restituisce elenco con `id`, `title`, `content_type`, `status`, `publish_at`. Se `status === 'SCHEDULED'` mostrare card “Locked” con countdown “Disponibile tra: Xh Ym Zs” (usa `publish_at`).
  5. **Sandbox widget:** Componente che riceve `sandbox_rules` e `csp_headers` da `GET /v1/security/widget-config`; renderizza iframe con `sandbox` e CSP; placeholder per TradingView/calcolatore (URL o srcdoc). Bridge `postMessage`: solo ricezione da parent; nessuna chiamata API diretta dal widget (doc postMessage Wasm-to-Widget).
  6. **Protezioni UX:** In vista Strategie disabilitare selezione testo e context menu (user-select: none; preventDefault su contextmenu). Opzionale: blur sul focus loss (document visibility) e watermark leggero con ID utente (CSS/Canvas).
- **Output atteso:** Pagine e componenti in `apps/access`; contenuti possono essere mock finché l’API contenuti non è definitiva.

---

### PROMPT C – Editor: Onboarding + Dashboard Master (layout 3 colonne, Navigator, Canvas, Inspector)
- **Obiettivo:** Onboarding al primo accesso e struttura Dashboard come da EDITOR MASTER.
- **Contesto:** `DOC/PROFESSIONAL SUIT/EDITOR MASTER (Professional Workspace).md`, `DOC/PROFESSIONAL SUIT/ONBOARDING GIULIANO.md`, `DOC/T BLUEPRINTS/ARC. NOTEBOOK.md`.
- **Task:**
  1. **Onboarding:** Al primo accesso (flag da API o localStorage, es. `first_login` da profilo) mostrare overlay con 4 step: (1) Benvenuto “Sig. Giusti” + CTA “Iniziamo”; (2) Spotlight colonna sinistra + testo Teoria/Strategie; (3) Spotlight pulsante “Programma” + testo scheduling; (4) Chiave mTLS + lucchetto. Solo pulsanti “Avanti”/“Iniziamo”; nessuna X. Bottone “Guida” in basso a destra per rivedere tutorial. Al termine chiamare `POST /v1/admin/onboarding_complete` (implementare in API se non esiste).
  2. **Layout 3 colonne:** Navigator (sinistra), Canvas (centro), Inspector (destra). Colori: sfondo #000, pannelli #1D1D1F, accenti #007AFF. Font Inter o San Francisco.
  3. **Navigator:** Due sezioni “Teoria” e “Strategie”; lista documenti (per ora mock o da API `GET /v1/admin/contents`). Click su documento carica nel Canvas.
  4. **Canvas:** Editor Markdown con anteprima live (WYSIWYG o split). Toggle in alto “Teoria” / “Strategie” con messaggi contestuali come da doc. Salvataggio: “Pubblica ora” e “Programma” (apre pannello scheduling).
  5. **Inspector:** Pannello destra con (a) Scheduling: date/time picker; conferma “Sig. Giusti, conferma la pubblicazione per questa data?”; chiamata `POST /v1/admin/schedule`. (b) Placeholder per Security Live Feed e User Status Monitor (da PROMPT D). Messaggistica “Lei” in tutte le conferme ed errori.
- **Output atteso:** Flusso onboarding + dashboard utilizzabile; contenuti e publish possono usare le API esistenti (`publish`, `schedule`).

---

### PROMPT D – Editor: User Status Monitor, Security Live Feed, Modal Dettagli, Pardon
- **Obiettivo:** Monitor utenti e notifiche per il Sig. Giusti.
- **Contesto:** `DOC/PROFESSIONAL SUIT/EDITOR MASTER (Professional Workspace).md`, `DOC/T BLUEPRINTS/API MASTER SPECIFICATION.md` (payload forense, notifiche).
- **Task:**
  1. **User Status Monitor:** Tabella con colonne Nickname, Stato (Attivo/Bloccato/Policy Respinta), Motivazione, Data/Ora. Dati da `GET /v1/admin/user-monitor` (filtro ALL/BLOCKED). Badge colore per severità (Grigio/Giallo/Rosso). Pulsante “Vedi Dettagli Tecnici” per ogni riga che apre modal forense.
  2. **Modal Dettagli Tecnici:** Chiamata `GET /v1/soc/forensic-details/:user_id` (user_id dalla sessione/riga). Mostrare: violazione, evidence_score, device_info, location, log_history (o telemetry come da API). Pulsante “Ripristina Accesso” che chiama `POST /v1/soc/pardon` con hw_hash/user_id appropriato.
  3. **Security Live Feed:** Componente (sidebar o Inspector) che mostra ultimi alert (Grigio/Giallo/Rosso). Dati da `GET /v1/admin/notifications` (vedi PROMPT A). Click su alert apre stesso modal Dettagli se disponibile.
  4. **Tone di voce:** Tutte le label e messaggi in “Lei” (es. “Ripristina Accesso”, “Sig. Giusti, conferma…”).
- **Output atteso:** Inspector con Monitor + Feed + Modal; integrazione con API esistenti e con pardon di PROMPT A.

---

### PROMPT E – SOC: Situation Room (Gate, Threat Feed, Forensics, Kill Switch, Pardon)
- **Obiettivo:** Dashboard SOC completa come da EDR SOC & INTERFACCIA_EDR_SOC.
- **Contesto:** `DOC/T BLUEPRINTS/EDR SOC & INFRASTRUCTURE.md`, `DOC/T BLUEPRINTS/EDR & SOC (OLD VERSION)/interfaccia edr e soc V.3.md`, `DOC/STRATEGY & VISION/SITEMAP.md`.
- **Task:**
  1. **Layout:** Sfondo #000. Top Bar: stato nodi (Edge, Backend, DB) – può essere mock o health check – e Global Kill Switch con doppia conferma (Maker-Checker: primo click “Proponi”, secondo step “Conferma” o input codice). Left Panel: titolo “The Gate”; tabella/coda utenti PENDING (nickname, IP/Geo, Trust Score); pulsanti Approve / Deny per ogni riga. Chiamate `POST /v1/soc/approve` e `POST /v1/soc/deny` (PROMPT A).
  2. **Center:** Threat Feed – lista eventi (Grigio/Giallo/Rosso) con timestamp; dati da `GET /v1/soc/events` o da forensic_logs. Colori: #00FF00 verde, #FFFF00 giallo, #FF0000 rosso.
  3. **Right Panel:** Forensics – al click su utente/evento mostra Hardware ID, IP, ISP, User Action Log (da forensic-details o da sessione). Pulsante “Set Ghosting” che chiama `POST /v1/soc/set-ghosting` con hw_hash. Pulsante “Pardon/Whitelist” che chiama `POST /v1/soc/pardon`.
  4. **Global Kill Switch:** Conferma modale “Sei sicuro? Richiede conferma Titolare”. Chiamata a endpoint dedicato (es. `POST /v1/soc/global-kill`) che invalida sessioni / mette manutenzione; l’endpoint può essere stub che scrive in Redis e ritorna ok.
- **Output atteso:** Single page SOC con tutte le azioni collegate alle API; font monospace per log come da doc.

---

### PROMPT F – API: Ghost Traffic, WebSocket notifiche (opzionale)
- **Obiettivo:** Deception per utenti SHADOW_BANNED e notifiche real-time.
- **Contesto:** `DOC/STRATEGY & VISION/RESPONSE TO ATTACCK.md`, `DOC/T BLUEPRINTS/EDR SOC & INFRASTRUCTURE.md`, API Master (notifiche Sig. Giusti).
- **Task:**
  1. **Ghost Traffic:** Per route che servono “contenuti” (es. `GET /v1/reader/chapter/:id` o simile), se Redis per hw_hash (da header o da sessione) è SHADOW_BANNED: non restituire 403 subito; rispondere con stream o risposte ripetute di junk data (payload random cifrato o base64) con delay jitter 0.8–1.5 s tra un chunk e l’altro, per simulare caricamento lento. Timeout dopo N secondi o N chunk.
  2. **WebSocket (opzionale):** Endpoint o servizio WebSocket per client Editor: al ricevere evento da EDR/Gatekeeper (policy rejection, sospetto, hacking), inviare messaggio al client con severità e id utente/sessione. Client Editor si sottoscrive al login e aggiorna Security Live Feed e User Status Monitor in tempo reale. Se non implementi WS, lasciare GET /v1/admin/notifications polling come in PROMPT A.
- **Output atteso:** Comportamento Ghost Traffic su una route di esempio; documentazione o codice stub per WebSocket.

---

### PROMPT G – Wasm: modulo HMAC (Rust) e integrazione frontend
- **Obiettivo:** Firma HMAC per log/alert verso API.
- **Contesto:** `DOC/T BLUEPRINTS/INFRASTRUCTURE & OPS/Firma HMAC in Rust per il modulo Wasm.md`, `DOC/T BLUEPRINTS/API MASTER SPECIFICATION.md` (X-Signature).
- **Task:**
  1. **Progetto Rust:** Creare crate (es. `packages/gg-wasm-hmac` o in `apps/access`) con wasm-bindgen, hmac 0.12, sha2 0.10, hex 0.4. Funzione `generate_hmac_signature(payload: &str, secret: &str) -> Result<String, JsValue>` che restituisce firma esadecimale.
  2. **Build:** wasm-pack build --target web (o bundler). Output in `packages/gg-wasm-hmac/pkg` o path condiviso.
  3. **Integrazione:** In Access (o Editor), prima di inviare un log/alert (es. tentativo copia, focus loss) costruire JSON del payload, chiamare Wasm `generate_hmac_signature(JSON.stringify(payload), secret)` e aggiungere header `X-Signature` alla richiesta. Secret da env o da handshake (es. fornito dopo auth). API: validare X-Signature su quella route e rifiutare se assente/non valida.
- **Output atteso:** Modulo Wasm utilizzabile da JS; una route API che richiede X-Signature e la valida (stesso secret lato server).

---

### PROMPT H – Terraform e DRP (moduli Cloudflare, Vercel, state, runbook)
- **Obiettivo:** IaC come da TERRAFORM INFRASTRUCTURE BLUEPRINT e DRP.
- **Contesto:** `DOC/T BLUEPRINTS/TERRAFORM INFRASTRUCTURE BLUEPRINT (The Failover Manual).md`, `DOC/T BLUEPRINTS/INFRASTRUCTURE & OPS/DRP (Disaster and Recovery Plan).md`, `DOC/T BLUEPRINTS/INFRASTRUCTURE & OPS/DEPLOY STACK.md`.
- **Task:**
  1. **Struttura:** Cartella `terraform/` con moduli: `networking_security` (Cloudflare: DNS, WAF, mTLS client cert config), `edge_compute` (Workers script placeholder, KV namespace, Cron trigger opzionale), `application_frontend` (Vercel project, env vars da tf vars, domain binding). Provider: cloudflare, vercel. Nessun segreto in chiaro: usare variabili tf o backend remoto.
  2. **State:** Backend remoto (es. Terraform Cloud o S3) con encryption; bloccare state. Documentare in README.
  3. **README_INFRA.md:** Istruzioni per init, plan, apply; come passare env=dr per failover; dove configurare mTLS (Cloudflare dashboard link).
  4. **DRP runbook:** File `DOC/DRP_RUNBOOK.md` (o in terraform/) con step: (1) Rilevamento, (2) Cambio CNAME / apply con var env=dr, (3) Sync DB se necessario, (4) Rotazione segreti e revoca mTLS in caso compromissione. Checklist test ogni 6 mesi.
- **Output atteso:** Terraform applicabile in ambiente di test; runbook utilizzabile per DR.

---

### PROMPT I – mTLS e domini (configurazione e doc)
- **Obiettivo:** Proteggere Editor e SOC con client certificate (Cloudflare).
- **Contesto:** `DOC/T BLUEPRINTS/ARC. NOTEBOOK.md`, Deploy Stack, Sitemap (editor.*, soc.*).
- **Task:**
  1. **Documentazione:** File `DOC/MTLS_SETUP.md` con: come creare Client Certificate in Cloudflare (SSL/TLS → Client Certificates); come scaricare .p12 e installare su dispositivo; come creare WAF Custom Rule per `editor.*` e `soc.*`: se `cf.client_cert_present` è false allora BLOCK. Link dalla README del progetto.
  2. **Frontend:** In apps/editor e apps/soc, pagina o messaggio “Accesso richiede certificato client” se la richiesta arriva senza cert (opzionale: rilevare lato client non è possibile, quindi il BLOCK è solo Cloudflare; aggiungere in FAQ o in onboarding il passo “Assicurati di aver installato il certificato”).
- **Output atteso:** Doc operativa per mTLS; nessun cambiamento obbligatorio al codice app se il BLOCK è solo Cloudflare.

---

## 4. Riepilogo output richiesto

- **Componenti fatte:** § 1 (Fondazioni, DB, API, Redis, Access Gatekeeper).
- **Componenti mancanti:** § 2 (Reader, Editor completo, SOC completo, API scheduler/notifiche/pardon/approve-deny, Ghost Traffic, Wasm HMAC, Terraform, mTLS doc).
- **Prompt per realizzare il mancante:** § 3 (Prompt A–I), ciascuno utilizzabile in sequenza per implementazioni coerenti con i documenti di progettazione.

Fine documento.

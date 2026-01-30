# GG Platform API

Backend per gate, admin, SOC e notifiche.

## Env

Vedi `env.example`. Richiesti: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. Opzionali: `REDIS_URL`, `INTERNAL_SCHEDULER_SECRET`.

## Internal: Scheduler (cron)

- **GET** `/internal/run-scheduler`
- Protezione: header `X-Internal-Secret: <INTERNAL_SCHEDULER_SECRET>` oppure query `?secret=<INTERNAL_SCHEDULER_SECRET>`.
- Comportamento: legge `content_schedule` dove `publish_at <= now()`, imposta `content.status = 'LIVE'` e rimuove la riga da `content_schedule`.
- Esempio cron (ogni minuto):  
  `curl -H "X-Internal-Secret: YOUR_SECRET" "https://api.example.com/internal/run-scheduler"`

## EDR log (X-Signature)

- **POST** `/v1/edr/log` (auth: Bearer JWT).
- **Body:** `{ "event_type": string, "payload"?: object, "timestamp"?: ISO-8601 }`.
- **Header:** `X-Signature` = HMAC-SHA256 del **raw body** (stesso JSON inviato), in esadecimale. Stesso secret lato client (Wasm) e server (`HMAC_SECRET`).
- Se `X-Signature` manca o non corrisponde, risposta **401** (log spoofing). Il payload viene scritto in `forensic_logs` se la firma è valida.

## Ghost Traffic (SHADOW_BANNED)

Per utenti con stato Redis `SHADOW_BANNED` (es. dopo Set Ghosting dal SOC), le route che servono contenuti al Reader **non** restituiscono 403. Invece rispondono con uno **stream di junk data** (payload random in base64) con delay jitter **0,8–1,5 s** tra un chunk e l’altro, per simulare un caricamento lento (deception / Black Hole).

- **Route interessate:** `GET /v1/reader/contents`, `GET /v1/reader/contents/:id` (e qualsiasi route “contenuti” simile).
- **Condizione:** header `X-HW-Hash` presente e stato Redis per quell’hash = `SHADOW_BANNED`.
- **Risposta:** `Content-Type: application/octet-stream`, body = stream di chunk base64 random. Timeout dopo **20 chunk** o **30 secondi**.
- **HARD_BANNED:** continua a restituire 403 in preHandler (nessuno stream).

## Notifiche (Security Live Feed)

- **GET** `/v1/admin/notifications?limit=50` (ruolo admin, Bearer JWT).
- Restituisce gli ultimi N eventi da `forensic_logs` con `severity` (GREY / YELLOW / RED) per l’Editor.

### WebSocket (stub – implementazione futura)

Per notifiche real-time al Sig. Giusti (Editor):

- **URL (proposto):** `wss://api.example.com/v1/admin/notifications/ws` (stesso host dell’API, path dedicato).
- **Auth:** Query `?token=<JWT>` o primo messaggio `{ type: "auth", token: "<JWT>" }`. Solo ruolo `admin`.
- **Messaggi server → client:**  
  `{ type: "notification", severity: "GREY"|"YELLOW"|"RED", user_id?: string, violation_code?: string, message?: string, created_at: string }`
- **Client:** Sottoscrizione al login; aggiornamento Security Live Feed e User Status Monitor in tempo reale.

Implementazione attuale: polling su `GET /v1/admin/notifications`.

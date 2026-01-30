# Setup mTLS (Client Certificate) – Editor e SOC

**Codice:** GG-MTLS-SETUP  
**Contesto:** [ARC. NOTEBOOK](T%20BLUEPRINTS/ARC.%20NOTEBOOK.md), [Sitemap](STRATEGY%20%26%20VISION/SITEMAP.md) (editor.*, soc.*), [Deploy Stack](T%20BLUEPRINTS/INFRASTRUCTURE%20%26%20OPS/DEPLOY%20STACK.md).

L’accesso a **Editor** (Professional Suite) e **SOC** (Situation Room) è protetto da certificato client (mTLS) gestito da Cloudflare. Senza certificato valido, Cloudflare blocca la richiesta **prima** che raggiunga l’applicazione; lato client non è possibile rilevare l’assenza del certificato (il BLOCK avviene solo a livello Cloudflare).

---

## 1. Creare il Client Certificate in Cloudflare

1. Accedi alla **Dashboard Cloudflare** del dominio (es. `giustipiattaforma.it`).
2. Vai in **SSL/TLS** → **Client Certificates** (menu laterale).
   - *Alternativa (Zero Trust):* **Zero Trust** → **Access** → **mTLS** per gestione avanzata e revoca.
3. Clicca **Create Certificate**.
4. Cloudflare genera:
   - **Private Key** (resta sul server; non esportare).
   - **Certificate** (pubblico, per identificare il dispositivo).
5. **Validity**: imposta la durata (es. 15 anni).
6. **Download**: scarica il certificato in formato **.p12** (PKCS#12).  
   Durante il download ti verrà chiesta una **password** per il file .p12: scegline una forte e conservala; servirà in fase di import sul dispositivo.

**Riferimento:** [Cloudflare – Client Certificates](https://developers.cloudflare.com/ssl/client-certificates/).

---

## 2. Scaricare il .p12 e installarlo sul dispositivo

### Download

- Dopo la creazione del certificato, usa il pulsante **Download** per ottenere il file `.p12`.
- Conserva il file in un luogo sicuro; la password impostata al passo precedente è necessaria per l’import.

### Installazione

| Sistema | Procedura |
|--------|-----------|
| **Windows** | Doppio clic sul file `.p12` → si apre la procedura **Importazione guidata certificato**. Scegli “Utente corrente” o “Computer locale” (per tutti gli utenti). Inserisci la password del .p12 e completa; il certificato viene salvato in **Gestione certificati** (certmgr.msc). |
| **macOS** | Doppio clic sul `.p12` → si apre **Keychain Access**. Inserisci la password; il certificato viene aggiunto al keychain (es. “login”). Per l’uso in Safari/Chrome assicurati che sia nel keychain di accesso. |
| **Linux** | Dipende dal browser; spesso si importa da Impostazioni → Privacy e sicurezza → Certificati, oppure tramite `pk12util` (NSS). |

### Utilizzo nel browser

- Quando apri `editor.<tuodominio>` o `soc.<tuodominio>`, il browser può mostrare un popup: *“Seleziona il certificato per autenticarti”*.
- Scegli il certificato installato e conferma; Cloudflare valida il certificato e inoltra la richiesta all’app.

**Nota:** Assicurati di aver installato il certificato sul dispositivo che usi per Editor e SOC. Se la pagina non carica o la connessione viene chiusa, verifica di aver selezionato il certificato corretto quando richiesto dal browser.

---

## 3. Regola WAF: BLOCK se certificato assente (editor.* e soc.*)

Per far sì che **solo** le richieste con certificato client raggiungano Editor e SOC, configura una **Custom Rule** nel WAF Cloudflare.

1. In Cloudflare: **Security** → **WAF** → **Custom rules** (o **Rules** → **WAF Custom rules**).
2. **Create rule**.
3. **Nome** (es.): `Block Editor and SOC without client certificate`.
4. **Expression (Edit expression)**:

   - Per **bloccare** le richieste a `editor.*` e `soc.*` **senza** certificato client presentato:

   ```  
   (http.host contains "editor." or http.host contains "soc.") and not cf.tls_client_auth.cert_presented
   ```

   - Campo WAF: `cf.tls_client_auth.cert_presented` è `true` quando la richiesta presenta un certificato client (valido o meno). Per richiedere anche che sia **valido**, usa `cf.tls_client_auth.cert_verified eq true` e blocca quando è falso:

   ```  
   (http.host contains "editor." or http.host contains "soc.") and not cf.tls_client_auth.cert_verified
   ```

   *Nota: in documentazione legacy si trova a volte `cf.client_cert_present`; nell’attuale Ruleset Engine il campo corretto è `cf.tls_client_auth.cert_presented` / `cf.tls_client_auth.cert_verified`.*

5. **Action**: **Block**.
6. Salva e **Deploy**.

Risultato: le richieste a `editor.<dominio>` e `soc.<dominio>` senza certificato client (o non verificato, se usi `cert_verified`) vengono bloccate da Cloudflare; l’utente non vede la pagina (connessione chiusa / errore).

---

## 4. FAQ e troubleshooting

- **La pagina non si carica / connessione chiusa**  
  Verifica di aver installato il certificato .p12 sul dispositivo e di aver inserito la password corretta. Al successivo accesso, quando il browser chiede il certificato, seleziona quello creato per Editor/SOC.

- **Posso sapere lato app se l’utente ha il certificato?**  
  No. Il controllo avviene solo in Cloudflare (WAF/TLS). Se la richiesta arriva all’app, il certificato è già stato accettato; non è obbligatorio cambiare codice applicativo.

- **Revoca del certificato (laptop perso / compromissione)**  
  Vedi [DRP_RUNBOOK.md](DRP_RUNBOOK.md) (Fase 4: Rotazione segreti e revoca mTLS). In Cloudflare: **Zero Trust** → **Access** → **mTLS** → revoca/invalida il certificato client compromesso.  
  Link: [Cloudflare Zero Trust – mTLS](https://one.dash.cloudflare.com).

---

## 5. Riferimenti

- **Progetto:** [ENVIRONMENT.md](../ENVIRONMENT.md) (variabili e app), [terraform/README_INFRA.md](../terraform/README_INFRA.md) (infra e mTLS).
- **Blueprint:** [ARC. NOTEBOOK](T%20BLUEPRINTS/ARC.%20NOTEBOOK.md), [Sitemap](STRATEGY%20%26%20VISION/SITEMAP.md), [Deploy Stack](T%20BLUEPRINTS/INFRASTRUCTURE%20%26%20OPS/DEPLOY%20STACK.md).
- **DRP:** [DRP_RUNBOOK.md](DRP_RUNBOOK.md) (revoca mTLS in caso di compromissione).

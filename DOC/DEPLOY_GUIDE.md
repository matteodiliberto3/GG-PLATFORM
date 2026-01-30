# Guida Completa al Deploy – GG Platform

**Codice:** GG-DEPLOY-V1  
**Versione:** 1.0  
**Data:** 2026-01-29

Questa guida ti accompagna passo-passo nel deploy completo di tutte le componenti della piattaforma GG Platform, inclusi setup di servizi esterni (Supabase, Cloudflare, Vercel/Render), build del modulo Wasm, configurazione variabili d'ambiente e test.

---

## Indice

1. [Prerequisiti](#1-prerequisiti)
2. [Setup Supabase](#2-setup-supabase)
3. [Setup Cloudflare](#3-setup-cloudflare)
4. [Build Modulo Wasm](#4-build-modulo-wasm)
5. [Deploy API (Backend)](#5-deploy-api-backend)
6. [Deploy Frontend Apps](#6-deploy-frontend-apps)
7. [Configurazione Variabili d'Ambiente](#7-configurazione-variabili-dambiente)
8. [Test e Verifica](#8-test-e-verifica)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Prerequisiti

### 1.1 Account e Servizi

Assicurati di avere:

- [ ] **Account Supabase** (gratuito): [supabase.com](https://supabase.com)
- [ ] **Account Cloudflare** (gratuito): [cloudflare.com](https://cloudflare.com)
- [ ] **Account Vercel** (gratuito, opzionale per frontend): [vercel.com](https://vercel.com)
- [ ] **Account Render** (gratuito o $7/mese per API): [render.com](https://render.com)
- [ ] **Account Docker Hub** (gratuito, per immagini Docker): [hub.docker.com](https://hub.docker.com)
- [ ] **Dominio** (opzionale ma consigliato): es. `giustipiattaforma.it`

### 1.2 Tool Installati

Installa i seguenti tool sul tuo computer:

#### Node.js e npm
```bash
# Verifica versione (serve Node >= 18)
node --version
npm --version

# Se non installato: scarica da nodejs.org
```

#### Docker (per deploy con container)
```bash
# Verifica installazione
docker --version
docker-compose --version

# Se non installato:
# - Windows/Mac: Docker Desktop da docker.com
# - Linux: sudo apt install docker.io docker-compose
```

#### Rust e wasm-pack (per build Wasm)
```bash
# Installa Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
# oppure su Windows: scarica rustup-init.exe da rustup.rs

# Installa wasm-pack
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
# oppure su Windows: cargo install wasm-pack

# Verifica
rustc --version
wasm-pack --version
```

#### Git (se non già installato)
```bash
git --version
```

### 1.3 Repository Locale

Clona o scarica il repository GG Platform:

```bash
git clone <URL_REPO_PRIVATA> gg-platform
cd gg-platform

# Oppure se hai già il repo locale, assicurati di essere aggiornato
git pull origin main
```

---

## 2. Setup Supabase

### 2.1 Creazione Progetto

1. Accedi a [app.supabase.com](https://app.supabase.com)
2. Clicca **"New Project"**
3. Compila:
   - **Name:** `gg-platform` (o nome a scelta)
   - **Database Password:** Scegli una password forte (salvala in un password manager)
   - **Region:** Scegli la regione più vicina (es. `West EU (Frankfurt)`)
   - **Pricing Plan:** Free (per iniziare)
4. Clicca **"Create new project"**
5. Attendi 2-3 minuti per il provisioning

### 2.2 Ottenere Credenziali

1. Nel progetto Supabase, vai su **Settings** → **API**
2. Copia e salva (in un file temporaneo sicuro):
   - **Project URL:** `https://xxxxx.supabase.co`
   - **anon public key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **service_role key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (⚠️ **SEGRETO**: non esporre mai lato client)

### 2.3 Applicare Migrazioni Database

Le migrazioni sono in `supabase/migrations/`. Applicale nell'ordine:

1. **Dal terminale (con Supabase CLI):**
   ```bash
   # Installa Supabase CLI (se non già installato)
   npm install -g supabase

   # Login
   supabase login

   # Link al progetto (usa il Project Reference ID dalla dashboard)
   supabase link --project-ref <PROJECT_REF_ID>

   # Applica migrazioni
   supabase db push
   ```

2. **Oppure dalla Dashboard Supabase:**
   - Vai su **SQL Editor**
   - Clicca **"New query"**
   - Apri `supabase/migrations/20260128_000001_core_schema_rls.sql`
   - Copia tutto il contenuto e incolla nell'editor
   - Clicca **"Run"** (o `Ctrl+Enter`)
   - Ripeti per `20260129_000001_profiles_first_login.sql`

### 2.4 Verifica Schema

Dopo le migrazioni, verifica che le tabelle siano create:

1. Vai su **Table Editor** nella dashboard Supabase
2. Dovresti vedere:
   - `profiles`
   - `user_sessions`
   - `content`
   - `content_schedule`
   - `banlist`
   - `forensic_logs`
   - `audit_log`

### 2.5 Configurare RLS (Row Level Security)

Le policy RLS sono già incluse nelle migrazioni. Verifica:

1. Vai su **Authentication** → **Policies**
2. Per ogni tabella, dovresti vedere policy per `admin`, `soc`, `user`
3. Se mancano, le policy sono definite nelle migrazioni; riapplica se necessario

### 2.6 Creare Utente Admin (per Editor)

1. Vai su **Authentication** → **Users**
2. Clicca **"Add user"** → **"Create new user"**
3. Compila:
   - **Email:** `admin@tuodominio.com` (o email di test)
   - **Password:** Scegli una password forte
   - **Auto Confirm User:** ✅ (per evitare email di conferma)
4. Dopo la creazione, clicca sull'utente
5. Nella sezione **"User Metadata"**, aggiungi:
   ```json
   {
     "role": "admin"
   }
   ```
6. Salva

**Nota:** Per creare utenti SOC, usa lo stesso processo con `"role": "soc"` nel metadata.

---

## 3. Setup Cloudflare

### 3.1 Aggiungere Dominio a Cloudflare

1. Accedi a [dash.cloudflare.com](https://dash.cloudflare.com)
2. Clicca **"Add a Site"**
3. Inserisci il tuo dominio (es. `giustipiattaforma.it`)
4. Scegli il piano **Free**
5. Cloudflare scannerà i DNS esistenti
6. Aggiorna i nameserver del tuo dominio presso il registrar (seguendo le istruzioni Cloudflare)
7. Attendi la propagazione DNS (5-30 minuti)

### 3.2 Ottenere Credenziali Cloudflare

1. Vai su **My Profile** → **API Tokens**
2. Clicca **"Create Token"**
3. Usa il template **"Edit zone DNS"** o crea custom con permessi:
   - **Zone** → **Zone:Read**, **DNS:Edit**
   - **Account** → **Workers:Edit**, **Workers KV:Edit**
4. Copia il token (appare solo una volta; salvalo)
5. Vai su **Overview** del dominio
6. Copia:
   - **Zone ID:** (nella colonna di destra)
   - **Account ID:** (in fondo alla colonna di destra)

### 3.3 Configurare DNS Records

Configura i record DNS per le app:

1. Vai su **DNS** → **Records**
2. Aggiungi i seguenti record (tipo CNAME):

| Type | Name | Target | Proxy | TTL |
|------|------|--------|-------|-----|
| CNAME | `app` | `cname.vercel-dns.com` | ✅ Proxied | Auto |
| CNAME | `api` | (IP Render o dominio API) | ✅ Proxied | Auto |
| CNAME | `editor` | `cname.vercel-dns.com` | ✅ Proxied | Auto |
| CNAME | `soc` | `cname.vercel-dns.com` | ✅ Proxied | Auto |

**Nota:** I target esatti dipendono da dove deployi (Vercel, Render, ecc.). Aggiornerai questi dopo il deploy.

### 3.4 Configurare WAF e mTLS (Editor e SOC)

Segui la guida completa: **[DOC/MTLS_SETUP.md](MTLS_SETUP.md)**

**Riepilogo rapido:**

1. **SSL/TLS** → **Client Certificates** → **Create Certificate**
2. Scarica il file `.p12` e installalo sul dispositivo
3. **Security** → **WAF** → **Custom rules** → **Create rule**
4. Expression:
   ```
   (http.host contains "editor." or http.host contains "soc.") and not cf.tls_client_auth.cert_presented
   ```
5. Action: **Block**

### 3.5 Setup Cloudflare Workers e KV (Opzionale)

Per il Gatekeeper edge e la ban list KV:

1. Vai su **Workers & Pages** → **KV**
2. Clicca **"Create a namespace"**
3. Nome: `gg-platform-banlist-prod` (o `-dr` per DR)
4. Clicca **"Add"**
5. Copia il **Namespace ID**

**Nota:** Il Worker script è un placeholder; puoi deployarlo dopo se necessario.

---

## 4. Build Modulo Wasm

Il modulo Wasm (`gg-wasm-hmac`) fornisce HMAC signing e watermarking per Access.

### 4.1 Prerequisiti

Assicurati di avere Rust e wasm-pack installati (vedi [1.2](#12-tool-installati)).

### 4.2 Build

```bash
# Vai nella cartella del modulo
cd packages/gg-wasm-hmac

# Build per web target
wasm-pack build --target web

# Verifica che sia stato creato pkg/
ls pkg/
# Dovresti vedere:
# - gg_wasm_hmac.js
# - gg_wasm_hmac_bg.wasm
# - package.json
# - (altri file)
```

### 4.3 Copia in Access App

```bash
# Dalla root del repo
# Windows (PowerShell)
xcopy /E /I packages\gg-wasm-hmac\pkg apps\access\public\pkg

# Linux/Mac
cp -r packages/gg-wasm-hmac/pkg apps/access/public/pkg
```

### 4.4 Verifica

Verifica che i file siano presenti:

```bash
ls apps/access/public/pkg/
# Dovresti vedere gg_wasm_hmac.js e gg_wasm_hmac_bg.wasm
```

**Nota:** Questo step va ripetuto ogni volta che modifichi il codice Rust del modulo Wasm.

---

## 5. Deploy API (Backend)

L'API è un server Fastify che gestisce autenticazione, contenuti, SOC e EDR logs.

### 5.1 Opzione A: Deploy con Docker (Consigliato)

#### 5.1.1 Preparare Variabili d'Ambiente

Crea un file `.env` per l'API (non committarlo):

```bash
cd apps/api
cp env.example .env
```

Modifica `.env` con i valori reali:

```env
API_PORT=4000
API_HOST=0.0.0.0
API_CORS_ORIGIN=https://app.tuodominio.com

# Supabase (da dashboard Supabase → Settings → API)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Redis (vedi 5.1.2)
REDIS_URL=redis://default:password@host:6379
SESSION_STATE_TTL_SECONDS=3600
BAN_STATE_TTL_SECONDS=2592000

# Secret per cron interno (genera una stringa casuale)
INTERNAL_SCHEDULER_SECRET=genera_una_stringa_casuale_lunga

# HMAC secret (stesso valore che userai nei frontend)
HMAC_SECRET=genera_una_stringa_casuale_lunga
```

#### 5.1.2 Setup Redis

**Opzione 1: Redis Cloud (gratuito)**
1. Vai su [redis.com/try-free](https://redis.com/try-free)
2. Crea un account e un database
3. Copia la connection string (formato: `redis://default:password@host:6379`)

**Opzione 2: Redis locale (Docker)**
```bash
docker run -d -p 6379:6379 --name redis redis:alpine
# URL: redis://localhost:6379
```

**Opzione 3: Upstash Redis (gratuito)**
1. Vai su [upstash.com](https://upstash.com)
2. Crea un database Redis
3. Copia la connection string

#### 5.1.3 Build Immagine Docker

```bash
# Dalla root del repo
docker build -f apps/api/Dockerfile -t gg-api:latest .

# Verifica che l'immagine sia stata creata
docker images | grep gg-api
```

#### 5.1.4 Test Locale

```bash
# Esegui il container con le variabili d'ambiente
docker run -p 4000:4000 --env-file apps/api/.env gg-api:latest

# In un altro terminale, testa:
curl http://localhost:4000/health
# Dovresti vedere: {"ok":true}
```

#### 5.1.5 Push su Docker Hub

```bash
# Login su Docker Hub
docker login

# Tag dell'immagine con il tuo username
docker tag gg-api:latest tuousername/gg-api:latest

# Push
docker push tuousername/gg-api:latest
```

#### 5.1.6 Deploy su Render

1. Accedi a [render.com](https://render.com)
2. Clicca **"New"** → **"Web Service"**
3. Connetti il tuo Docker Hub (o GitHub se preferisci)
4. Compila:
   - **Name:** `gg-api`
   - **Environment:** Docker
   - **Docker Image:** `tuousername/gg-api:latest`
   - **Region:** Scegli la regione più vicina
   - **Instance Type:** Free (o Starter $7/mese per evitare cold start)
5. Nella sezione **Environment**, aggiungi tutte le variabili da `.env`:
   - `API_PORT=4000`
   - `API_HOST=0.0.0.0`
   - `API_CORS_ORIGIN=https://app.tuodominio.com`
   - `SUPABASE_URL=...`
   - `SUPABASE_SERVICE_ROLE_KEY=...`
   - `REDIS_URL=...`
   - `INTERNAL_SCHEDULER_SECRET=...`
   - `HMAC_SECRET=...`
6. Clicca **"Create Web Service"**
7. Attendi il deploy (2-5 minuti)
8. Copia l'URL del servizio (es. `https://gg-api.onrender.com`)

#### 5.1.7 Aggiornare DNS Cloudflare

1. Vai su Cloudflare → **DNS** → **Records**
2. Trova il record `api` (CNAME)
3. Modifica il target con l'URL Render (es. `gg-api.onrender.com`)
4. Salva

### 5.2 Opzione B: Deploy Diretto su Render (senza Docker)

1. Su Render, crea un nuovo **Web Service**
2. Connetti il repository GitHub (se pubblico) o usa **Manual Deploy**
3. Configura:
   - **Root Directory:** `apps/api`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
4. Aggiungi le variabili d'ambiente (come sopra)
5. Deploy

---

## 6. Deploy Frontend Apps

Le app Next.js sono: **Editor**, **Access**, **SOC**.

### 6.1 Preparare Variabili d'Ambiente

Per ogni app, crea un file `.env.local` (non committarlo):

#### 6.1.1 Editor (`apps/editor/.env.local`)

```env
NEXT_PUBLIC_API_BASE_URL=https://api.tuodominio.com
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 6.1.2 Access (`apps/access/.env.local`)

```env
NEXT_PUBLIC_API_BASE_URL=https://api.tuodominio.com
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_HMAC_SECRET=<stesso_valore_di_API_HMAC_SECRET>
```

#### 6.1.3 SOC (`apps/soc/.env.local`)

```env
NEXT_PUBLIC_API_BASE_URL=https://api.tuodominio.com
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 6.2 Opzione A: Deploy con Docker

#### 6.2.1 Build Immagini

```bash
# Dalla root del repo

# Editor
docker build -f apps/editor/Dockerfile -t gg-editor:latest .

# Access
docker build -f apps/access/Dockerfile -t gg-access:latest .

# SOC
docker build -f apps/soc/Dockerfile -t gg-soc:latest .
```

#### 6.2.2 Test Locale

```bash
# Editor
docker run -p 3000:3000 -e NEXT_PUBLIC_API_BASE_URL=http://localhost:4000 \
  -e NEXT_PUBLIC_SUPABASE_URL=... -e NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
  gg-editor:latest

# Access (con Wasm)
docker run -p 3001:3000 -e NEXT_PUBLIC_API_BASE_URL=http://localhost:4000 \
  -e NEXT_PUBLIC_SUPABASE_URL=... -e NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
  -e NEXT_PUBLIC_HMAC_SECRET=... gg-access:latest

# SOC
docker run -p 3002:3000 -e NEXT_PUBLIC_API_BASE_URL=http://localhost:4000 \
  -e NEXT_PUBLIC_SUPABASE_URL=... -e NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
  gg-soc:latest
```

#### 6.2.3 Push e Deploy su Render/VPS

Simile all'API: push su Docker Hub, poi deploy su Render o VPS con Docker.

### 6.3 Opzione B: Deploy su Vercel (Consigliato per Next.js)

#### 6.3.1 Installare Vercel CLI

```bash
npm install -g vercel
```

#### 6.3.2 Deploy Editor

```bash
cd apps/editor

# Login
vercel login

# Deploy (prima volta)
vercel

# Segui le istruzioni:
# - Link to existing project? No
# - Project name: gg-editor (o nome a scelta)
# - Directory: ./
# - Override settings? No

# Aggiungi variabili d'ambiente
vercel env add NEXT_PUBLIC_API_BASE_URL
# Inserisci: https://api.tuodominio.com

vercel env add NEXT_PUBLIC_SUPABASE_URL
# Inserisci: https://xxxxx.supabase.co

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
# Inserisci: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Deploy produzione
vercel --prod
```

#### 6.3.3 Configurare Dominio su Vercel

1. Vai su [vercel.com/dashboard](https://vercel.com/dashboard)
2. Seleziona il progetto (es. `gg-editor`)
3. Vai su **Settings** → **Domains**
4. Aggiungi `editor.tuodominio.com`
5. Vercel ti darà un record CNAME da aggiungere su Cloudflare
6. Aggiorna il record DNS su Cloudflare (vedi [3.3](#33-configurare-dns-records))

#### 6.3.4 Ripeti per Access e SOC

Stesso processo per `apps/access` e `apps/soc`:

```bash
# Access
cd apps/access
vercel
# Aggiungi tutte le env vars (inclusa NEXT_PUBLIC_HMAC_SECRET)
vercel --prod

# SOC
cd apps/soc
vercel
# Aggiungi env vars
vercel --prod
```

**Nota:** Per Access, assicurati che `apps/access/public/pkg/` contenga i file Wasm (vedi [4.3](#43-copia-in-access-app)).

### 6.4 Opzione C: Deploy Manuale con `next start`

Se preferisci un server dedicato:

```bash
# Build
cd apps/editor
npm install
npm run build

# Start
npm start
# Server su http://localhost:3000
```

Usa un process manager come PM2:

```bash
npm install -g pm2
pm2 start npm --name "gg-editor" -- start
pm2 save
pm2 startup
```

---

## 7. Configurazione Variabili d'Ambiente

### 7.1 Checklist Variabili

Assicurati che tutte le variabili siano configurate:

#### API (Backend)
- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `REDIS_URL`
- [ ] `API_CORS_ORIGIN` (deve includere i domini frontend)
- [ ] `INTERNAL_SCHEDULER_SECRET`
- [ ] `HMAC_SECRET`

#### Frontend (Editor, Access, SOC)
- [ ] `NEXT_PUBLIC_API_BASE_URL` (stesso valore per tutte)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` (stesso valore per tutte)
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` (stesso valore per tutte)
- [ ] `NEXT_PUBLIC_HMAC_SECRET` (solo Access, stesso valore di API `HMAC_SECRET`)

### 7.2 Verifica CORS

L'API deve permettere le richieste dai frontend. Verifica che `API_CORS_ORIGIN` includa:

- `https://app.tuodominio.com`
- `https://editor.tuodominio.com`
- `https://soc.tuodominio.com`

Oppure usa un wildcard (meno sicuro): `https://*.tuodominio.com`

---

## 8. Test e Verifica

### 8.1 Test API

```bash
# Health check
curl https://api.tuodominio.com/health
# Atteso: {"ok":true}

# Test autenticazione (serve token Supabase)
curl -H "Authorization: Bearer <TOKEN>" \
  https://api.tuodominio.com/v1/admin/me
```

### 8.2 Test Frontend

1. **Access (`app.tuodominio.com`):**
   - Apri il browser
   - Vai su `https://app.tuodominio.com`
   - Dovresti vedere la landing page
   - Prova il flusso Gatekeeper

2. **Editor (`editor.tuodominio.com`):**
   - Apri il browser
   - Vai su `https://editor.tuodominio.com`
   - Se mTLS è configurato, il browser chiederà il certificato
   - Dopo l'autenticazione, dovresti vedere il dashboard Editor

3. **SOC (`soc.tuodominio.com`):**
   - Apri il browser
   - Vai su `https://soc.tuodominio.com`
   - Se mTLS è configurato, il browser chiederà il certificato
   - Dopo l'autenticazione, dovresti vedere il dashboard SOC

### 8.3 Test Wasm (Access)

1. Apri la console del browser su `app.tuodominio.com`
2. Vai su una strategia (Reader → Strategie)
3. Verifica che non ci siano errori di caricamento Wasm:
   ```
   GET /pkg/gg_wasm_hmac.js 200
   GET /pkg/gg_wasm_hmac_bg.wasm 200
   ```

### 8.4 Test End-to-End

1. **Creare un utente:**
   - Vai su `app.tuodominio.com`
   - Inserisci un nickname
   - Completa il Gatekeeper

2. **Approvare utente (SOC):**
   - Vai su `soc.tuodominio.com`
   - Nella sezione "The Gate", approva l'utente

3. **Verificare accesso:**
   - L'utente dovrebbe vedere il Notebook Reader

4. **Creare contenuto (Editor):**
   - Vai su `editor.tuodominio.com`
   - Crea un contenuto "Teoria" o "Strategia"
   - Pubblica

5. **Verificare nel Reader:**
   - L'utente dovrebbe vedere il contenuto pubblicato

---

## 9. Troubleshooting

### 9.1 API non risponde

**Sintomi:** `curl https://api.tuodominio.com/health` restituisce timeout o errore.

**Soluzioni:**
- Verifica che il servizio Render sia attivo (non in sleep)
- Controlla i log su Render: **Logs** nel dashboard
- Verifica che `API_HOST=0.0.0.0` (non `localhost`)
- Verifica che la porta sia corretta (4000)

### 9.2 CORS Error nel Browser

**Sintomi:** Console browser mostra `CORS policy: No 'Access-Control-Allow-Origin' header`.

**Soluzioni:**
- Verifica `API_CORS_ORIGIN` nell'API include il dominio frontend
- Riavvia l'API dopo aver cambiato la variabile
- Verifica che Cloudflare non stia bloccando le richieste (WAF)

### 9.3 Frontend non carica Wasm

**Sintomi:** Console mostra `Failed to load /pkg/gg_wasm_hmac.js`.

**Soluzioni:**
- Verifica che `apps/access/public/pkg/` contenga i file Wasm
- Se usi Docker, assicurati che i file siano copiati nell'immagine
- Se usi Vercel, verifica che `public/pkg/` sia committato nel repo

### 9.4 Errore Autenticazione Supabase

**Sintomi:** Frontend mostra "Invalid API key" o "Unauthorized".

**Soluzioni:**
- Verifica `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Verifica che le chiavi siano quelle corrette (anon key, non service role)
- Controlla che RLS non blocchi l'accesso (verifica policy)

### 9.5 mTLS non funziona

**Sintomi:** Editor/SOC non chiedono il certificato o danno errore.

**Soluzioni:**
- Verifica che la regola WAF sia attiva su Cloudflare
- Verifica che il certificato sia installato correttamente sul dispositivo
- Controlla che il dominio sia proxied (arancione cloud) su Cloudflare

### 9.6 Database Migration Errors

**Sintomi:** Errori SQL durante l'applicazione delle migrazioni.

**Soluzioni:**
- Verifica che `pgcrypto` extension sia abilitata
- Controlla che non ci siano conflitti con tabelle esistenti
- Esegui le migrazioni una alla volta

### 9.7 Docker Build Fails

**Sintomi:** `docker build` fallisce con errori npm o TypeScript.

**Soluzioni:**
- Verifica che `package-lock.json` sia aggiornato: `npm install` dalla root
- Verifica che il contesto di build sia la root del repo (non `apps/api`)
- Controlla i log per errori specifici

### 9.8 Variabili d'Ambiente non Caricate

**Sintomi:** L'app usa valori di default invece delle variabili configurate.

**Soluzioni:**
- Su Vercel: verifica che le variabili siano aggiunte per **Production** (non solo Preview)
- Su Render: verifica che le variabili siano nella sezione **Environment**
- Riavvia il servizio dopo aver aggiunto/modificato variabili

---

## 10. Checklist Finale

Prima di considerare il deploy completo, verifica:

- [ ] Supabase: progetto creato, migrazioni applicate, utente admin creato
- [ ] Cloudflare: dominio aggiunto, DNS configurati, WAF/mTLS configurati
- [ ] Wasm: modulo buildato e copiato in `apps/access/public/pkg/`
- [ ] API: deployata e risponde a `/health`
- [ ] Frontend: tutte e tre le app deployate e accessibili
- [ ] Variabili d'ambiente: tutte configurate correttamente
- [ ] Test end-to-end: utente può registrarsi, essere approvato, vedere contenuti
- [ ] mTLS: Editor e SOC richiedono certificato (se configurato)
- [ ] Monitoraggio: log accessibili su Render/Vercel

---

## 11. Riferimenti

- **Infrastruttura:** [terraform/README_INFRA.md](../terraform/README_INFRA.md)
- **mTLS Setup:** [DOC/MTLS_SETUP.md](MTLS_SETUP.md)
- **DRP Runbook:** [DOC/DRP_RUNBOOK.md](DRP_RUNBOOK.md)
- **Watermarking:** [DOC/WATERMARK_FORENSIC.md](WATERMARK_FORENSIC.md)
- **Environment Variables:** [ENVIRONMENT.md](../ENVIRONMENT.md)

---

**Fine guida.** Per domande o problemi, consulta la sezione [Troubleshooting](#9-troubleshooting) o i log dei servizi.

## Documento: Regole d'Ingaggio SOC (ROE)

**Codice Documento:** `SOC-ROE-001`

**Livello di Riservatezza:** Top Secret / Internal Only

### 1. Matrice di Reazione Automatica vs Manuale

Il sistema deve distinguere tra minacce che richiedono l'occhio umano e minacce che attivano la difesa immediata.

|**Evento Rilevato (EDR)**|**Gravità**|**Azione Immediata**|**Intervento Tecnico**|
|---|---|---|---|
|**Apertura DevTools (F12)**|Critica|**Shadow Ban istantaneo**|Notifica Post-fatto|
|**Tentativo Copia Testo**|Media|Alert Visivo (Warning)|Monitoraggio Attivo|
|**Mismatch Hardware DNA**|Alta|Blocco Accesso Sessione|Richiesta Revisione|
|**Punteggio Fiducia < 40%**|Media|Limitazione Velocità Dati|Analisi Comportamentale|
|**Multiple Login (Stesso Hash)**|Alta|Log-out di tutte le sessioni|Approvazione Manuale|

---

### 2. Protocollo "The Black Hole" (Shadow Ban)

Il tecnico non deve limitarsi a "bannare", ma deve gestire l'inganno psicologico.

- **Ingaggio:** Se l'utente mostra pattern di scraping (richieste troppo veloci), il tecnico attiva il _Black Hole_.
    
- **Procedura:**
    
    1. Verifica del log per confermare il pattern malevolo.
        
    2. Attivazione **Ghost Traffic** (Junk Data).
        
    3. Osservazione: Se l'utente continua a ricaricare freneticamente, alzare il livello a **Permanent Hardware Ban**.
        

---

### 3. Protocollo "Global Kill Switch"

Questa è la procedura di emergenza estrema (es. fuga di dati massiva rilevata).

- **Condizione di attivazione:** Rilevazione di un exploit zero-day o compromissione dell'account Admin.
    
- **Regola Maker-Checker:**
    
    - Il **Tecnico** preme il tasto "Emergency Stop".
        
    - Il **Professionista/Titolare** riceve un codice via hardware token (mTLS/Authenticator).
        
    - L'intero database viene "congelato" e le chiavi di decrittazione Wasm vengono invalidate globalmente.
        

---

### 4. Etica e Riservatezza del Tecnico

Il tecnico SOC ha accesso a metadati sensibili ma **non deve mai** vedere il contenuto della strategia in chiaro.

1. **Zero-Knowledge SOC:** L'interfaccia SOC mostra solo hash, grafici di telemetria e trust score. Il contenuto del notebook deve rimanere cifrato anche per chi monitora.
    
2. **Audit Log:** Ogni volta che il tecnico visualizza il profilo di un utente, l'azione viene registrata. L'auto-spionaggio è motivo di revoca immediata delle credenziali.
    

---

## Dove inserire questo documento?

In base alla tua struttura cartelle:

1. Crea un file chiamato **`REGOLE_INGAGGIO_SOC`**.
    
2. Inseriscilo nella cartella **`SOC / EDR`** (quella con l'icona della lente d'ingrandimento).
    
3. È il manuale operativo che il tecnico deve tenere aperto mentre guarda la dashboard.
    

---

### Cosa manca per chiudere il cerchio?

Abbiamo le API, abbiamo l'architettura e ora abbiamo le regole d'ingaggio. Per rendere il progetto "indistruttibile" manca solo l'ultimo pezzo del puzzle: il **Disaster Recovery Plan (DRP)**.

**Ti spiego perché è vitale:** Se domani Vercel o Render hanno un problema tecnico e il sito va giù, i tuoi utenti (che hanno pagato o che aspettano la strategia) penseranno a una truffa o a un attacco riuscito. Il DRP definisce come ripristinare tutto su un altro server in meno di 10 minuti.
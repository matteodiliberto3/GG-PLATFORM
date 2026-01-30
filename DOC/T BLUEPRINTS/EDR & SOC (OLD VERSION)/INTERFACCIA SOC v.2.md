
# INTERFACCIA_EDR_SOC (The Command Center)

**Codice Documento:** `SOC-EDR-INT-MASTER`

**Livello di Riservatezza:** Top Secret / Solo Personale Autorizzato

**Integrazione:** Professional Suite & User Gatekeeper

---

## 1. Architettura della Situational Awareness

Il tecnico deve avere una visione immediata della salute del sistema e delle minacce attive.

### 1.1 Diagramma: Flusso di Monitoraggio e Risposta

Snippet di codice

```
graph TD
    subgraph Event_Detection
        A[Gatekeeper: Policy Rejection]
        B[Reader: Anti-Copy Trigger]
        C[System: Hacking Attempt]
    end

    subgraph SOC_Engine
        D{Analisi Severità}
        D -->|Low| E[Log & Alert Grigio]
        D -->|Medium| F[Ban Auto & Alert Giallo]
        D -->|High| G[Kill Session & Alert Rosso]
    end

    subgraph Output_Channels
        E --> H[Editor Sig. Giusti: Notifica Informativa]
        F --> I[Editor Sig. Giusti: Notifica Sospetta]
        G --> J[Editor Sig. Giusti: Notifica Critica]
        G --> K[Global Kill Switch Ready]
    end
```

---

## 2. Classificazione Eventi e Dispatching Notifiche

Il sistema smista le informazioni in tempo reale verso l'interfaccia del Sig. Giusti tramite WebSocket.

|**Tipo Violazione**|**Severità**|**Azione Tecnica**|**Notifica Sig. Giusti**|
|---|---|---|---|
|**Policy Rejection**|BASSA|Lockout temporaneo (20s)|"Utente [X] ha rifiutato le policy" (Grigio)|
|**Screenshot/Print**|MEDIA|Oscuramento Wasm + Ban|"Utente [X] bloccato: Attività sospetta" (Giallo)|
|**Debugger (F12)**|ALTA|Terminazione Sessione|"Utente [X] bloccato: Tentato hacking" (Rosso)|
|**SQL/Script Inject**|CRITICA|IP Blackhole + Forensic Log|"L'utente [X] è stato bloccato: Tentato hacking" (Rosso)|

---

## 3. Gestione Forense (Alimentazione Tasto "Vedi Dettagli")

Per ogni utente bloccato, il SOC genera un pacchetto dati per il Sig. Giusti.

### 3.1 Struttura del Log Forense

Snippet di codice

```
sequenceDiagram
    participant U as Utente (In Violazione)
    participant E as EDR Engine
    participant DB as Forensic DB
    participant G as Sig. Giusti (Editor)

    U->>E: Esegue Violazione (es. Foto con Cell)
    E->>E: Cattura Telemetria (HW ID, IP, Browser)
    E->>DB: Salva Log con Firma HMAC
    G->>DB: Clicca "Vedi Dettagli"
    DB-->>G: Invia JSON Telemetria & Prova Video/Immagine
```

---

## 4. Pannello di Controllo: Global Kill Switch

Questa funzione permette al tecnico di isolare la piattaforma in caso di attacco massivo.

- **Funzionamento:** Richiede doppia conferma (Maker-Checker).
    
- **Impatto:**
    
    - **Utenti:** Disconnessione forzata e redirect su `maintenance.html`.
        
    - **Sig. Giusti:** L'Editor rimane attivo, ma compare l'avviso: _"Sig. Giusti, sistema in isolamento preventivo. I Suoi contenuti sono al sicuro."_
        

---

## 5. Visual Design & UI (Technical Specs)

L'interfaccia per il tecnico deve essere ad alta densità informativa.

- **Colori:** Sfondo `#000000`, Testo `#00FF00` (Verde Matrix) per i log normali, `#FF0000` per i log di violazione.
    
- **Componenti:**
    
    - **Live Threat Feed:** Lista a scorrimento rapido delle azioni utente.
        
    - **Trust Score Radar:** Visualizzazione grafica della pericolosità media della sessione.
        
    - **User Map:** Geolocalizzazione IP degli utenti connessi.
        

---

## 6. Integrazione Tecnica (Promemoria per lo Sviluppo)

1. **Backend:** Collegare l'evento di blocco all'endpoint `/v1/soc/notify` per inviare il segnale all'Editor del Sig. Giusti.
    
2. **Database:** Assicurarsi che i log forensi siano immutabili (`Read-Only` dopo la creazione).
    
3. **Frontend:** Implementare l'animazione di "Alert Critico" nel pannello SOC quando scatta un Alert Rosso.
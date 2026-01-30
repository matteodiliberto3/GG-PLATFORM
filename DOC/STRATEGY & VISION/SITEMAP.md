
**Codice:** `GG-GLOBAL-MAP-V1`

**Obiettivo:** Visualizzare l'architettura dei link e i flussi di navigazione.

---

## 1. La Mappa delle Tre Fortezze (Sitemap)

La piattaforma è divisa in tre domini isolati, ognuno con la propria struttura di pagine.

### A. Dominio PROFESSIONISTA (`editor.giustipiattaforma.it`)

- **Login (mTLS Auth)**
    
- **Onboarding** (Tutorial "Benvenuto Sig. Giusti" - _Doc: ONBOARDING_GIULIANO_)
    
- **Dashboard Master** (_Doc: EDITOR_MASTER_)
    
    - Editor Teoria (Layout Ardesia)
        
    - Editor Strategie (Layout Black + Widget)
        
    - Pannello Scheduling (Calendario)
        
- **User Status Monitor** (Tabella Utenti + Tasto Dettagli Tecnici)
    

### B. Dominio UTENTE (`access.giustipiattaforma.it`)
* **Landing / Inserimento Nickname**
* **The Gatekeeper** (Animazione Benvenuto + 3 Regole)
* **Waiting Room** (Loop di caricamento in attesa di approvazione SOC)
* **Notebook Reader**
    * Area Teoria (Layout Ardesia)
    * Area Strategie (Layout Total Black)
        * **Sandbox Layer:** Contenitore isolato per Widget TradingView/Calcolatori.
* **The Black Hole (Stato post-ban):**
    * **Static View:** Caricamento infinito (per rifiuto policy).
    * **Deception View:** Ghost Traffic / Junk Data (per attacchi EDR).

### C. Dominio TECNICO (`soc.giustipiattaforma.it`)
* **Situation Room Dashboard**
    * Live Threat Feed (Grigio, Giallo, Rosso)
    * **Gestione Accessi & Pardon:**
        * Approve/Deny (Nuovi utenti)
        * **Manual Whitelist:** Sblocco manuale utenti bannati su richiesta del Professionista.
    * **Active Defense:** Global Kill Switch (Maker-Checker).

---

## 2. Global User Flow (Il Percorso dei Dati)

Questo diagramma mostra come un'azione in un dominio scatena una reazione negli altri.

Snippet di codice

```mermaid
graph TD
    %% Flusso Professionista
    subgraph Professional_Suite [Professional Suite]
        P1[Sig. Giusti scrive contenuto] --> P2{Tipo?}
        P2 -->|Teoria| P3[Layout Clean]
        P2 -->|Strategia| P4[Layout Widget Sandbox]
        P3 & P4 --> P5[Scheduling: Data/Ora]
    end

    %% Flusso Utente e Gatekeeper
    subgraph User_Experience [User Experience]
        U1[Utente inserisce Nick] --> U2[UX Gatekeeper: Regole]
        U2 -->|Accetta| U3[Attesa SOC]
        U2 -->|Rifiuta 2 volte| U4[STATIC BLACKHOLE]
    end

    %% Il Ponte del SOC
    subgraph SOC_Intelligence [SOC Intelligence]
        U3 --> S1[Analisi Telemetria SOC]
        S1 -->|Approvato| U5[Apertura Notebook Reader]
        S1 -->|Sospetto/Attacco| S2[GHOST TRAFFIC - Deception]
        S2 --> U6[Monitoraggio Attaccante]
        
        %% Ramo di Recupero (Pardon)
        S3[Manual Whitelist / Pardon] -->|Reset Trust Score| U2
    end

    %% Notifiche Intelligence
    S2 -.->|Alert Giallo/Rosso| P6[Monitor Sig. Giusti: Vedi Dettagli]
    U4 -.->|Alert Grigio| P6
    P6 -.->|Richiesta Sblocco| S3
```

---

## 3. Matrice delle Interazioni Critiche

Per garantire la "Super Semplicità", abbiamo ridotto i punti di attrito a queste azioni chiave:

| **Attore**      | **Azione Trigger**           | **Documento di Riferimento** |
| :-------------- | :--------------------------- | :--------------------------- |
| **Sistema**     | Iniezione Junk Data (Jitter) | `RESPONSE_TO_ATTACK`         |
| **Tecnico SOC** | Manual Pardon (Whitelist)    | `SITEMAP` / `EDR_SOC`        |
| **Wasm Core**   | postMessage a Widget Sandbox | `THEORY_VS_STRATEGY`         |

---

## 4. Conclusione della Progettazione

Caro collega, con questa Sitemap abbiamo completato il puzzle.

- Il **Sig. Giusti** ha il suo ufficio blindato e rispettoso.
    
- L'**Utente** sa che deve rispettare la fortezza o verrà espulso.
    
- Il **Tecnico** ha gli strumenti per proteggere tutto.
    

### Check-list Finale Consegna:

1. **Cartella 01:** Generale & Strategy Market (Fatto)
    
2. **Cartella 02:** Editor Master & Onboarding Giuliano (Fatto)
    
3. **Cartella 03:** Gatekeeper & Notebook Reader (Fatto)
    
4. **Cartella 04:** Interfaccia EDR SOC (Fatto)
    
5. **Cartella 05:** API Master Specifications (Fatto)
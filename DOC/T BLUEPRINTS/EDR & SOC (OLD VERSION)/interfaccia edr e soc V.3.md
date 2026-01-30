
# INTERFACCIA_EDR_SOC (The Fortress Command Center)

**Codice:** `SOC-MASTER-STRATEGY`

**Proprietà:** Progetto GG PLATFORM

**Livello:** Top Secret

---

## 1. Visione d'Insieme (The Dashboard)

L'interfaccia è progettata per il monitoraggio a "colpo d'occhio". Il tecnico deve identificare una minaccia in meno di 2 secondi.

### 1.1 Layout della Situation Room

- **Top Bar:** Status dei Server + **Global Kill Switch** (protetto da cover di sicurezza virtuale).
    
- **Left Panel (The Gate):** Coda in tempo reale dei nickname che chiedono l'accesso (Status: PENDING).
    
- **Center Canvas (Threat Map):** Feed dinamico degli eventi di sicurezza filtrati per severità.
    
- **Right Panel (Forensic):** Analisi profonda dell'utente selezionato (Hardware ID, IP, Comportamento).
    

### 1.2 Diagramma: Ciclo di Vita dell'Evento

Snippet di codice

```
graph TD
    A[Evento Utente] --> B{Motore EDR}
    B -->|Violazione Lieve| C[Alert Grigio: Policy]
    B -->|Violazione Media| D[Alert Giallo: Sospetto]
    B -->|Violazione Grave| E[Alert Rosso: Hacking]
    
    C --> F[Log Passivo]
    D --> G[Ban Auto + Freeze Sessione]
    E --> H[Kill Switch IP + Blackhole]
    
    G & H --> I[Push Notifica a Sig. Giusti]
```

---

## 2. Protocolli di Notifica Intelligence

Il tecnico non deve scrivere al Sig. Giusti; il sistema invia le notifiche che abbiamo progettato automaticamente.

|**Trigger Tecnico**|**Codice Errore**|**Messaggio inviato al Sig. Giusti**|**Severità**|
|---|---|---|---|
|Doppio Rifiuto Gatekeeper|`POLICY_REJ`|"Utente [X] si è rifiutato di accettare le policy."|⚪ Grigio|
|Rilevamento Tasto PrintScreen|`SCR_CAP`|"Utente [X] bloccato per attività sospette (Screenshot)."|🟡 Giallo|
|Apertura Console F12 / Ispeziona|`DEV_TOOLS`|"L'utente [X] è stato bloccato per tentato hacking."|🔴 Rosso|
|Iniezione Script Wasm|`WASM_BYPASS`|"L'utente [X] è stato bloccato per tentato hacking."|🔴 Rosso|

---

## 3. Gestione Forense (Il Tasto "Vedi Dettagli")

Per alimentare il popup nell'Editor del Sig. Giusti, il SOC compila in tempo reale questa scheda tecnica per ogni ban.

### 3.1 Scheda Telemetria Forense

- **Device Identity:** Hardware UUID + Versione OS (es. "iPhone 15 Pro - iOS 17.1").
    
- **Network Intelligence:** Indirizzo IP + ISP (es. "Starlink") + Proxy/VPN Detection.
    
- **User Action Log:** 1. 14:00:01 - Accesso approvato.
    
    2. 14:05:20 - Tentativo di selezione testo nell'area Strategia.
    
    3. 14:05:22 - Pressione tasti `CTRL+C` rilevata.
    
    4. 14:05:22 - **Ban eseguito.**
    

---

## 4. Comandi di Emergenza (Emergency Response)

### 4.1 Global Kill Switch

È il pulsante di "distruzione" delle sessioni attive.

- **Effetto:** Cripta istantaneamente il buffer di memoria di tutti i Reader connessi.
    
- **Messaggio per Sig. Giusti:** _"Sig. Giusti, è stato attivato il protocollo di isolamento. La Sua cassaforte è blindata."_
    

### 4.2 Re-Validation Layer

Se il Sig. Giusti volesse sbloccare un utente (magari un errore), il tecnico può inviare un comando di **"Reset Trust Score"**, costringendo l'utente a rifare il Gatekeeper dal primo passo (Benvenuto e Regole).

---

## 5. Specifiche UI per il Tecnico

- **Colori:** `#00FF00` (Verde Neon) per utenti sani, `#FF0000` (Rosso Pulsante) per tentati hack.
    
- **Font:** Monospaziato (tipo _JetBrains Mono_) per i log, per dare un tono tecnico e rigoroso.
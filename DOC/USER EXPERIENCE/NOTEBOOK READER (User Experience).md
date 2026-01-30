


**Proprietà:** Progetto GG PLATFORM

**Obiettivo:** Fruizione sicura, fluida e differenziata tra Teoria e Strategie.

---

## 1. Visual Design & Psychological Trigger

L'utente che accede deve percepire immediatamente di essere in un ambiente "Premium".

- **Dark Mode Nativa:** Sfondo `#000000` per ridurre l'affaticamento visivo durante le sessioni di studio.
    
- **Tipografia:** _Inter_ per i dati tecnici, _Georgia_ o un font Serif moderno per le parti teoriche (aumenta la memorizzazione).
    
- **Stato della Sessione:** Una sottile barra luminosa in alto indica il "Live Connection" con il SOC (Verde = Connesso/Protetto).
    

---

## 2. Architettura della Pagina (Layout Dinamico)

A differenza dell'Editor, il Reader adatta la sua struttura in base al tipo di contenuto programmato dal Sig. Giusti.

### A. Layout "Teoria"

Focus sulla lettura immersiva.

- **Sidebar:** Indice dei capitoli con "Percentuale di Completamento".
    
- **Main:** Larghezza testo ottimizzata (max 800px) per la leggibilità.
    
- **Interazione:** Possibilità di evidenziare porzioni di testo (note salvate solo in locale via Wasm).
    

### B. Layout "Strategie"

Focus sull'operatività.

- **Sidebar:** Elenco "Alert" e "Strategie Attive".
    
- **Main:** Layout a griglia per ospitare i widget trading e i calcolatori.
    
- **Interazione:** Pulsanti rapidi per "Copia Segnale" o "Apri Calcolatore".
    

---

## 3. Il Flusso di Decrittazione "Invisible"

L'utente non deve mai vedere caricamenti tecnici. Tutto deve sembrare istantaneo, nonostante la sicurezza mTLS e Wasm in background.

Snippet di codice

```
sequenceDiagram
    participant U as Utente (Browser)
    participant W as Wasm Module (Security)
    participant API as Backend (Encrypted)
    participant SOC as SOC Monitor

    U->>API: Richiesta Capitolo (ID)
    API->>SOC: Verifica Trust Score Utente
    SOC-->>API: Approvato
    API->>U: Invia Chunk Cifrato (AES-256)
    U->>W: Passa Buffer al modulo Wasm
    W->>W: Decripta con chiave effimera
    W->>U: Inietta HTML/Markdown nel DOM protetto
    Note over U: L'utente legge il contenuto del Sig. Giusti
```

---

## 4. Protezioni Attive (UX-Safe)

Dobbiamo proteggere il lavoro del Sig. Giusti senza rendere frustrante l'esperienza utente.

- **Anti-Copy:** Disabilitazione del tasto destro e della selezione testo nelle aree "Strategie".
    
- **Blur on Focus Loss:** Se l'utente cambia tab o riduce il browser ad icona, il contenuto del notebook viene sfocato (Blur) istantaneamente per impedire screenshot non autorizzati.
    
- **Watermarking Dinamico:** Un watermark quasi invisibile con l'ID dell'utente e il suo IP si muove sullo sfondo, scoraggiando foto allo schermo con il cellulare.
    

---

## 5. La "User Journey" semplificata

Snippet di codice

```
graph LR
    A[Accesso con Nickname] --> B{Validazione SOC}
    B -- Rifiutato --> C[Schermata Attesa/Ban]
    B -- Approvato --> D[Dashboard Notebook]
    D --> E[Area Teoria]
    D --> F[Area Strategie]
    F --> G[Widget Interattivi]
```

---

## 6. Integrazione con lo Scheduling

Quando il Sig. Giusti programma un post per il futuro, l'utente vedrà nella sua lista contenuti un elemento "Locked":

- **Stato:** Opaco con icona a lucchetto.
    
- **Testo:** "Strategia disponibile tra: 04h 22m 10s".
    
- **Effetto:** Crea anticipazione (Hype) e conferma la gestione professionale del tempo da parte del Sig. Giusti.


## 7. Flusso Logico: The Gatekeeper Experience

Questo flusso si inserisce tra la richiesta del nickname e l'approvazione del SOC. È la "prova del fuoco" dell'utente.

Snippet di codice

```
graph TD
    A[Inserimento Nickname] --> B[Animazione: Benvenuto Nome_Utente]
    B --> C[Dissolvenza: Regole della Fortezza]
    C --> D{L'utente accetta?}
    
    D -- SI --> E[Richiesta inviata al SOC]
    
    D -- NO (Primo Rifiuto) --> F[Animazione Pulsante Rosso + Vibrazione]
    F --> G[Messaggio: Ultima possibilità, quale scegli?]
    
    G -- SI --> E
    G -- NO (Secondo Rifiuto) --> H[Animazione: OKAY NOME_UTENTE]
    H --> I[Dissolvenza 20s]
    I --> J[Blacklist Automatica / Schermata Loading Bloccata]
```

---

## 8. Design delle Componenti (UI/UX)

### L'Estetica del Pulsante "Accetta"

Per ottenere l'effetto che desidera (trasparente, bordi bianchi, lampeggiante), utilizzeremo un **Glassmorphism Neon Style**:

- **Stato Normale:** Bordo `1px solid #FFFFFF`, sfondo `transparent`, testo `white`.
    
- **Animazione Lampeggiante:** Un'animazione CSS "Pulse" che varia l'intensità del `box-shadow` bianco e l'opacità del bordo. Crea un senso di urgenza e importanza.
    

### Il Rifiuto (L'Animazione "Glitch")

Quando l'utente clicca "Rifiuta", il pulsante non deve solo diventare rosso. Suggerisco un'animazione di **"Shake" (vibrazione)** violenta accompagnata da un flash rosso sangue (`#FF0000`). Comunica istantaneamente che ha commesso un errore sistemico.

---

## 8. Script del Tutorial (Copywriting)

**Schermata 1:**

> "Benvenuto, **[Nome_Utente]**." _(Dissolvenza lenta)_

**Schermata 2 (Le Regole):**

> "Prima di continuare, deve comprendere dove si trova. Le regole della fortezza sono inviolabili:"
> 
> - **Nessun attacco:** Ogni tentativo di hacking è tracciato e neutralizzato all'istante.
>     
> - **Nessuna condivisione:** La proprietà intellettuale è protetta. Screenshot, copia-incolla e foto esterne attiveranno il blocco immediato.
>     
> - **Policy di Protezione:** I suoi dati sono conservati esclusivamente per garantire l'integrità dei contenuti del Sig. Giusti.
>     

**Schermata 3 (Rifiuto Finale):**

> "Okay, **[Nome_Utente]**. Le nostre strade non coincidono. Ma non preoccuparti: ogni percorso è diverso." _(Dopo 20 secondi: Transizione verso il loop infinito di caricamento)_

---

## 10. Integrazione Tecnica (EDR & SOC)

Questa feature ha un risvolto tecnico critico che dobbiamo aggiungere ai documenti:

- **Trigger di Blocco:** Se l'utente rifiuta due volte, il frontend invia un segnale `POST /v1/soc/alert` con `event_type: POLICY_REJECTION`.
    
- **Auto-Ban:** Il server inserisce l'Hardware Hash dell'utente in una "Grey List". Da quel momento, ogni sua connessione rimarrà ferma alla schermata di loading standard, consumando le sue risorse mentre il nostro server lo ignora (tecnica del _Tarpit_).
    

---

## 5. Riorganizzazione Documenti (Aggiornamento)

Questa feature va inserita in un nuovo documento dedicato all'interno della cartella **03. USER EXPERIENCE**, chiamato: 📄 **`UX_GATEKEEPER_CONTRACT`**

**Perché un documento a parte?** Perché contiene logiche comportamentali (il rifiuto, il ban automatico) che non sono presenti nel semplice "Reader". È un filtro di sicurezza psicologica.


**Proprietà:** Progetto GG PLATFORM

**Status:** In fase di definizione componenti

**Obiettivo:** Validazione etica e comportamentale dell'utente prima dell'accesso.

---

## 1. Fase 1: Benvenuto Dinamico

Subito dopo che l'utente ha inserito il nickname e il sistema ha eseguito il fingerprinting silenzioso, inizia l'esperienza visiva.

- **Animazione:** Testo in _fade-in_ lento su sfondo nero assoluto.
    
- **Copia:** `"Benvenuto, [Nome_Utente]"` (dove `[Nome_Utente]` è la variabile catturata nel campo d'ingresso).
    
- **Transizione:** Dopo 2 secondi, il testo scompare in _fade-out_ per lasciare spazio alle regole.
    

---

## 2. Fase 2: Le Regole della Fortezza

Compare un elenco puntato, una riga alla volta, per forzare la lettura:

> **PRIMA DI CONTINUARE SU QUESTA PIATTFORMA LE REGOLE SONO:**
> 
> 1. **Non tentare attacchi di hacking:** Il sito è una fortezza. Ogni anomalia viene tracciata.
>     
> 2. **Proprietà Intellettuale Inviolabile:** Non puoi condividere le informazioni. Screenshot, copia-incolla e foto con smartphone sono rilevati e portano al ban.
>     
> 3. **Cookie & Policy di Sicurezza:** Accetti la conservazione dei dati necessari a proteggere l'integrità dei contenuti del Sig. Giusti.
>     

---

## 3. Fase 3: Il Sistema dei Pulsanti (Interazioni Critiche)

### A. Il Pulsante "ACCETTA" (Design Richiesto)

- **Stile:** Sfondo trasparente, bordi bianchi (1px), testo bianco.
    
- **Effetto:** _Glow_ bianco pulsante/lampeggiante che attira l'attenzione come un faro.
    
- **Azione:** Chiude il contratto e invia la richiesta al SOC.
    

### B. Il Pulsante "RIFIUTA" (La Trappola)

- **Stile:** Discreto all'inizio, diventa rosso vivido (`#FF0000`) al click.
    
- **Animazione 1° Rifiuto:** "Shake" violento (vibrazione orizzontale) e comparsa del messaggio:
    
    > _"Ultima possibilità, quale scegli?"_
    

---

## 4. Fase 4: Il Ban Definitivo (Seconda Scelta Negativa)

Se l'utente clicca nuovamente su "Rifiuta":

1. Tutto scompare.
    
2. Compare il testo: `"OKAY [NOME_UTENTE]. Vuol dire che le nostre strade non coincidono, ma non preoccuparti: ogni percorso è diverso."`
    
3. **Timer di 20 secondi:** La schermata resta fissa per "pesare" psicologicamente la scelta.
    
4. **Fine:** L'utente viene reindirizzato al loop infinito di loading (Blackhole).
    

In caso di secondo rifiuto, il sistema attiva il **Static Blackhole**. L'IP e l'Hardware Hash vengono inseriti in una lista di blocco semplice. Al prossimo tentativo di accesso, l'utente rimarrà fermo sulla schermata di caricamento iniziale. Nessun pacchetto dati, nemmeno finto, verrà inviato dal server per preservare le risorse di banda (Safe Rejection)

---

## 5. Diagramma di Flusso: Logica del Gatekeeper

Snippet di codice

```
sequenceDiagram
    participant U as Utente
    participant F as Frontend (Gatekeeper)
    participant EDR as Motore EDR (SOC)

    U->>F: Inserisce Nickname
    F->>F: Animazione Benvenuto [Nome]
    F->>F: Mostra Regole Inviolabili
    alt Clicca Accetta
        U->>F: Click Accetta (Glow White)
        F->>EDR: Invia Richiesta Approvazione
    else Clicca Rifiuta (1 volta)
        U->>F: Click Rifiuta
        F->>F: Animazione Rossa + Messaggio "Ultima Possibilità"
    else Clicca Rifiuta (2 volte)
        U->>F: Click Rifiuta Final
        F->>F: Messaggio "Okay [Nome], strade diverse..."
        F->>F: Attesa 20 secondi (Lockout)
        F->>EDR: POST /v1/soc/alert (POLICY_REJECTION)
        Note right of EDR: L'utente viene inserito in Blacklist
    end
```

---

## 6. Cosa devi aggiungere negli altri documenti (Promemoria)

Come hai giustamente ricordato, caro collega, queste logiche devono ora essere collegate tecnicamente:

1. **In `INTERFACCIA_EDR_SOC`:** Dovrai aggiungere la rotta API che riceve il segnale di "Policy Rifiutata" e la logica che invia la notifica al Sig. Giusti (il messaggio grigio che abbiamo definito prima).
    
2. **In `EDITOR_MASTER`:** Dovrai assicurarti che nel "User Status Monitor" compaia la riga dell'utente con lo stato "Policy Respinta", permettendo al Sig. Giusti di vedere chi ha deciso di non entrare.
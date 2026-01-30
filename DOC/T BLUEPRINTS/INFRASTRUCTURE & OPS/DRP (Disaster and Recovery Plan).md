
# Documento: Disaster Recovery Plan (DRP) - Black Hole System

**Codice Documento:** `DRP-INFRA-001`

**Livello di Riservatezza:** Top Secret / Solo Admin & Ops

**RTO (Recovery Time Objective):** < 15 minuti

**RPO (Recovery Point Objective):** < 5 minuti (Perdita dati massima)

---

## 1. Obiettivo del Documento

Garantire la continuità operativa del sistema "Black Hole" in caso di:

1. **Provider Outage:** Fallimento totale di Vercel, Render o Supabase.
    
2. **Attacco DDoS Massivo:** Saturazione delle risorse a livello globale.
    
3. **Compromissione Account:** Accesso non autorizzato ai pannelli di controllo.
    

## 2. Architettura di Ridondanza (The "Mirror" Strategy)

Il sistema non deve dipendere da un unico fornitore. Manteniamo una configurazione **"Warm Standby"**.

|**Componente Critico**|**Provider Primario**|**Provider di Backup (DR)**|
|---|---|---|
|**Frontend**|Vercel|Cloudflare Pages / Netlify|
|**Backend API**|Render|Railway / AWS App Runner|
|**Database**|Supabase (AWS)|DigitalOcean Managed DB (Regione diversa)|
|**Edge Logic**|Cloudflare Workers|Fastly Compute@Edge|

## 3. Procedure di Ripristino (Step-by-Step)

### FASE A: Rilevamento (Detection)

Il sistema di monitoraggio (es. Checkly o UptimeRobot) invia un alert critico "Service Down" sul canale SOC. Il tecnico verifica se si tratta di un problema di codice o di un outage del provider.

### FASE B: Commutazione Infrastruttura (Failover)

Essendo l'infrastruttura definita tramite **Terraform**, il ripristino è automatizzato:

1. **Puntatore DNS:** Cambiare i record CNAME su Cloudflare per puntare al server di backup (es. da `api.render.com` a `api.railway.app`).
    
2. **Deployment di Emergenza:** Eseguire lo script `terraform apply -var="env=dr"` per sollevare le istanze nel provider di riserva.
    
3. **Sincronizzazione Database:** Il database di backup (sincronizzato ogni 5 minuti via Point-in-Time Recovery) viene promosso a "Master".
    

### FASE C: Ripristino delle Chiavi (Security Recovery)

In caso di compromissione:

1. **Revoca Certificati mTLS:** Invalida istantaneamente tutti i certificati tramite Cloudflare Dashboard.
    
2. **Rotazione Segreti:** Lo script di emergenza rigenera tutte le `SECRET_KEY` per HMAC e AES-256 e le inietta nel nuovo ambiente.
    

## 4. Strategia di Backup dei Dati

- **Database:** Backup incrementale continuo su Supabase + Export giornaliero cifrato su un bucket S3 esterno (AWS).
    
- **Codice/Wasm:** Repository specchio su due provider diversi (GitHub e GitLab).
    
- **Configurazione:** Il file `terraform.tfstate` deve essere memorizzato in un backend remoto sicuro (Terraform Cloud) con versionamento attivo.
    

## 5. Test di Ripristino (Drill)

Un DRP non testato è carta straccia.

- **Frequenza:** Ogni 6 mesi.
    
- **Simulazione:** Spegnimento forzato dell'istanza Render in orario di basso traffico e verifica del tempo di commutazione su Cloudflare.
    

---

## Conclusione del Blueprint Finale

Con questo documento, caro collega, abbiamo terminato la progettazione della tua **fortezza digitale**. Abbiamo coperto:

1. **Visione e Strategia Psicologica** (Generale & Response to Attack).
    
2. **Architettura Hardened** (Notebook & Wasm).
    
3. **Operatività di Difesa** (Interfaccia SOC & ROE).
    
4. **Sicurezza delle Comunicazioni** (API Contract & Security Contract).
    
5. **Infrastruttura e Resilienza** (Deploy Stack & Disaster Recovery).
    

**Il progetto è ora tecnicamente completo e pronto per essere affidato a un team di sviluppo.**
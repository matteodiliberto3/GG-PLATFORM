# DRP Runbook – GG Platform

**Codice:** DRP-INFRA-001  
**RTO:** < 15 minuti | **RPO:** < 5 minuti  
**Livello:** Solo Admin & Ops

---

## 1. Rilevamento (Detection)

| Step | Azione | Responsabile |
|------|--------|--------------|
| 1.1 | Monitoraggio (Checkly, UptimeRobot, ecc.) invia alert "Service Down" al canale SOC. | Automatizzato |
| 1.2 | Tecnico verifica: problema di codice (deploy/rollback) vs **outage provider** (Vercel/Render/Supabase/Cloudflare). | Ops |
| 1.3 | Se outage provider o attacco massivo: dichiarare **incidente DR** e procedere con Fase B. | Ops / Admin |

**Criteri DR:** impossibilità a ripristinare il servizio sul provider primario entro RTO (15 min).

---

## 2. Cambio CNAME / Apply con `env=dr` (Failover)

| Step | Azione | Note |
|------|--------|------|
| 2.1 | In Cloudflare (o nel modulo Terraform `networking_security`): aggiornare i **CNAME** per app e API verso i target di **backup** (es. Netlify, Railway). | Riduce TTL DNS in anticipo se possibile. |
| 2.2 | Eseguire Terraform per sollevare/aggiornare le risorse DR:  
      `terraform apply -var="env=dr" -var-file=terraform.tfvars`  
      (con approvazione o `-auto-approve` in pipeline.) | State nel backend remoto (Terraform Cloud / S3). |
| 2.3 | Verificare che il traffico risolva verso il nuovo stack (dig/curl su `app.<domain>`, `api.<domain>`). | RTO target: < 15 min. |

---

## 3. Sync DB (se necessario)

| Step | Azione | Note |
|------|--------|------|
| 3.1 | Se il failover coinvolge il **database** (es. Supabase → backup): promuovere il DB di backup a "Master" secondo la procedura del provider (es. Point-in-Time Recovery, replica). | RPO target: < 5 min perdita dati. |
| 3.2 | Aggiornare le variabili Terraform / env (API URL, DB URL) per il frontend e l’API di backup, se non già gestite da `env=dr`. | Nessun segreto in chiaro nei file. |
| 3.3 | Eseguire controlli di base (login, lettura contenuti, SOC) sul nuovo stack. | Checklist funzionale breve. |

---

## 4. Rotazione segreti e revoca mTLS (in caso di compromissione)

Se l’incidente è **compromissione account** (accesso non autorizzato ai pannelli o ai segreti):

| Step | Azione | Note |
|------|--------|------|
| 4.1 | **Revoca certificati mTLS:** Cloudflare Dashboard → Zero Trust → Access → **mTLS** → revoca/invalida i certificati client compromessi. | [Cloudflare Zero Trust – mTLS](https://one.dash.cloudflare.com) |
| 4.2 | **Rotazione segreti:** rigenerare tutte le chiavi critiche (HMAC, API keys, DB, Redis, JWT, ecc.) e iniettarle nel **nuovo** ambiente (DR o nuovo account). Non riutilizzare segreti che potrebbero essere stati esposti. | Usare vault o pipeline; mai in chiaro in repo. |
| 4.3 | **Revoca token:** invalidare token API Cloudflare, Vercel, Supabase, ecc. e generarne di nuovi; aggiornare Terraform / CI e backend remoto. | |
| 4.4 | **Comunicazione:** notificare stakeholder e, se previsto, autorità (breach notification). | Secondo policy aziendale. |

---

## 5. Checklist test DR (ogni 6 mesi)

- [ ] **Drill DR:** in orario a basso traffico, simulare outage del provider primario (es. spegnere/sospendere istanza Render o disabilitare Vercel).
- [ ] Eseguire **Fase B** (CNAME + `terraform apply -var="env=dr"`) e verificare che il servizio sia erogato dal backup entro **15 minuti**.
- [ ] Verificare **Fase C** (sync DB) se applicabile; controllare RPO (< 5 min).
- [ ] Testare **login, Reader, Editor, SOC** sul stack DR.
- [ ] Documentare esito (ok / problemi) e aggiornare questo runbook se necessario.
- [ ] Ripristinare il primario e riportare i CNAME sul primario quando l’esercitazione è conclusa.

---

## 6. Riferimenti

- **Terraform:** `terraform/README_INFRA.md` (init, plan, apply, env=dr, mTLS link).
- **DRP:** `DOC/T BLUEPRINTS/INFRASTRUCTURE & OPS/DRP (Disaster and Recovery Plan).md`.
- **Blueprint Terraform:** `DOC/T BLUEPRINTS/TERRAFORM INFRASTRUCTURE BLUEPRINT (The Failover Manual).md`.

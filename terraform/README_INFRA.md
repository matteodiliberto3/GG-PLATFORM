# GG Platform – Infrastruttura (Terraform)

**Codice:** BLACK-VAULT-IaC-STRATEGY

IaC per resilienza multi-cloud: Cloudflare (DNS, WAF, Workers, KV) e Vercel (frontend). Nessun segreto in chiaro nei file; usare variabili TF o backend remoto.

---

## 1. Prerequisiti

- [Terraform](https://www.terraform.io/downloads) >= 1.0
- Account Cloudflare (zone + account ID)
- Account Vercel (API token, opzionale team ID)

---

## 2. Backend remoto (state)

Lo state **non** va committato. Usare backend remoto con **encryption** e **state locking**.

### Opzione A: Terraform Cloud

1. Crea un’organizzazione e un workspace su [app.terraform.io](https://app.terraform.io).
2. In `backend.tf` decommenta il blocco `backend "remote"` e imposta `organization` e `workspaces.name`.
3. Esegui `terraform login` e poi `terraform init`.

### Opzione B: S3 (AWS)

1. Crea un bucket S3 con encryption abilitata e una tabella DynamoDB per il lock.
2. In `backend.tf` decommenta il blocco `backend "s3"` e imposta `bucket`, `key`, `region`, `encrypt`, `dynamodb_table`.
3. Configura credenziali AWS e `terraform init`.

Per **test locale** puoi usare il backend di default (state in `terraform.tfstate`); **non** committare il file.

---

## 3. Variabili e segreti

**Nessun segreto in chiaro nei file.** Usare:

- Variabili d’ambiente: `export TF_VAR_cloudflare_api_token="..."` (e analoghi)
- File `.tfvars` **non** committato (aggiungi `*.tfvars` a `.gitignore`)

Variabili obbligatorie:

| Variabile | Descrizione | Esempio |
|-----------|-------------|---------|
| `cloudflare_api_token` | Token API Cloudflare | (da dashboard) |
| `cloudflare_zone_id` | Zone ID del dominio | (da dashboard) |
| `cloudflare_account_id` | Account ID (Workers/KV) | (da dashboard) |
| `vercel_api_token` | Token API Vercel | (da dashboard) |
| `domain_root` | Dominio root | `example.com` |
| `frontend_env` | Env vars per Vercel (opz.) | `{ "NEXT_PUBLIC_API_BASE_URL" = "..." }` |

Per **failover DR** usare `env=dr` (vedi sotto).

---

## 4. Comandi

```bash
cd terraform

# Inizializza provider e backend (solo la prima volta o dopo cambio backend)
terraform init

# Verifica piano (nessuna modifica applicata)
terraform plan -var-file=terraform.tfvars   # oppure -var="key=value" / TF_VAR_*

# Applica modifiche (dopo aver verificato il plan)
terraform apply -var-file=terraform.tfvars

# Con approvazione automatica (solo in pipeline/DR)
terraform apply -auto-approve -var="env=dr"
```

---

## 5. Failover (env=dr)

Per commutare sull’infrastruttura di backup (DR):

1. **CNAME / DNS:** Aggiorna i record nel modulo `networking_security` (o in Cloudflare) per puntare ai target di backup (es. Netlify, Railway).
2. **Apply con variabile DR:**
   ```bash
   terraform apply -var="env=dr" -var-file=terraform.tfvars
   ```
3. Verifica che il traffico vada al nuovo stack (RTO < 15 min per il DRP).

I moduli usano `var.env` per distinguere risorse primary vs DR (nomi, CNAME target placeholder).

---

## 6. mTLS (Cloudflare)

La configurazione dei **certificati client mTLS** (per area Professional / SOC) non è gestita in questo repo; si configura nel **Cloudflare Dashboard**. Guida operativa completa (creazione certificato, .p12, WAF rule per `editor.*` e `soc.*`): **[DOC/MTLS_SETUP.md](../DOC/MTLS_SETUP.md)**.

Riferimento rapido:
1. **Zero Trust** > **Access** > **mTLS** (o **SSL/TLS** → **Client Certificates**)
2. Crea un certificato client e associalo alle applicazioni protette.

Link: [Cloudflare Zero Trust – mTLS](https://one.dash.cloudflare.com).

---

## 7. Struttura moduli

| Modulo | Contenuto |
|--------|-----------|
| `networking_security` | DNS (CNAME app/api), WAF/mTLS documentati in dashboard |
| `edge_compute` | KV namespace (ban list), Worker placeholder, Cron opzionale |
| `application_frontend` | Progetto Vercel, env vars, binding dominio `app.<domain_root>` |

---

## 8. Test in ambiente di test

1. Crea un file `terraform.tfvars.example` con chiavi senza valori (o placeholder).
2. Copia in `terraform.tfvars` e compila (non committare).
3. `terraform init` e `terraform plan`; verificare che non ci siano errori di provider.
4. Per apply reale servono token e ID validi (Cloudflare, Vercel).

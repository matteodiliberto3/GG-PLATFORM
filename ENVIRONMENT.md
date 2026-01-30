# GG PLATFORM — Environment Variables

Questo repository usa template per-app in `apps/*/.env.example`.

## Convenzioni

- Le app Next.js leggono solo variabili `NEXT_PUBLIC_*` lato client.
- L'API legge variabili server-side senza prefisso.

## App

- `apps/editor`: Professional Suite (editor)
- `apps/access`: User Experience (access)
- `apps/soc`: SOC Dashboard (soc)
- `apps/api`: Backend API

## Supabase

- Le variabili Supabase lato frontend sono in `apps/*/env.example`.
- La definizione schema/RLS è in `supabase/migrations/`.

## Sicurezza (mTLS)

- **Editor** e **SOC** sono protetti da certificato client (mTLS) su Cloudflare. Setup operativo: [DOC/MTLS_SETUP.md](DOC/MTLS_SETUP.md) (creazione certificato, download .p12, installazione su dispositivo, regola WAF per `editor.*` e `soc.*`).

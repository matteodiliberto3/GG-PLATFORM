# Supabase

Questa cartella contiene le migrazioni SQL per lo schema database (Postgres) e le policy RLS.

## Struttura

- `supabase/migrations/*.sql`: migrazioni versionate (da applicare in ordine)

## Ruoli (JWT `app_metadata.role`)

Le policy RLS si basano su un claim JWT:

- `admin`: Professional Suite (Sig. Giusti)
- `soc`: operatore SOC
- `user`: utente finale

Se non presente, l'utente è trattato come `user`.


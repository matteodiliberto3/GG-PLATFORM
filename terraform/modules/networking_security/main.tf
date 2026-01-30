# DNS: CNAME for app and API (primary or DR target). Replace placeholder with real Vercel/Render CNAME.
resource "cloudflare_record" "app" {
  zone_id = var.zone_id
  name    = "app"
  type    = "CNAME"
  content = var.env == "dr" ? "backup-frontend.example.com" : "cname.vercel-dns.com" # Vercel custom domain CNAME
  proxied = true
  comment = "GG Platform frontend (env=${var.env})"
}

resource "cloudflare_record" "api" {
  zone_id = var.zone_id
  name    = "api"
  type    = "CNAME"
  content = var.env == "dr" ? "backup-api.example.com" : "your-app.onrender.com" # Render CNAME
  proxied = true
  comment = "GG Platform API (env=${var.env})"
}

# WAF: configure in Cloudflare Dashboard (Security > WAF) or add cloudflare_ruleset.
# mTLS: configure in Cloudflare Zero Trust > Access > mTLS (client certificates).
# See README_INFRA.md for dashboard links.

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

provider "vercel" {
  api_token = var.vercel_api_token
  team      = var.vercel_team_id != "" ? var.vercel_team_id : null
}

module "networking_security" {
  source = "./modules/networking_security"

  zone_id     = var.cloudflare_zone_id
  domain_root = var.domain_root
  env         = var.env
}

module "edge_compute" {
  source = "./modules/edge_compute"

  account_id = var.cloudflare_account_id
  env        = var.env
}

# Vercel frontend only when not in DR; during DR, DNS points to backup (Netlify/Railway etc.)
module "application_frontend" {
  source = "./modules/application_frontend"
  count  = var.env != "dr" ? 1 : 0

  domain_root     = var.domain_root
  env             = var.env
  env_vars        = var.frontend_env
  vercel_team_id  = var.vercel_team_id
}

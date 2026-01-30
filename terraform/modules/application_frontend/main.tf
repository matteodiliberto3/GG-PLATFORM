# Vercel project (frontend: access, editor, soc or single deployment)
resource "vercel_project" "app" {
  name      = "gg-platform-${var.env}"
  framework = "nextjs"
  team_id   = var.vercel_team_id != "" ? var.vercel_team_id : null
}

# Env vars from TF variables (no secrets in repo; use TF_VAR_ or .tfvars)
resource "vercel_project_environment_variable" "app" {
  for_each = var.env_vars

  project_id = vercel_project.app.id
  key        = each.key
  value      = each.value
  type       = "plain"
  target     = ["production", "preview"]
}

# Domain binding: app.<domain_root>
resource "vercel_project_domain" "app" {
  project_id = vercel_project.app.id
  domain     = "app.${var.domain_root}"
}

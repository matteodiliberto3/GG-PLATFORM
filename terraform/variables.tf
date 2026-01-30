variable "env" {
  description = "Environment: default (primary) or dr (failover/DR)."
  type        = string
  default     = "default"
}

variable "cloudflare_api_token" {
  description = "Cloudflare API token (use env TF_VAR_cloudflare_api_token or .tfvars, never commit)."
  type        = string
  sensitive   = true
}

variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID for the root domain (DNS, WAF)."
  type        = string
}

variable "cloudflare_account_id" {
  description = "Cloudflare account ID (Workers, KV)."
  type        = string
}

variable "vercel_api_token" {
  description = "Vercel API token (use env TF_VAR_vercel_api_token or .tfvars, never commit)."
  type        = string
  sensitive   = true
}

variable "vercel_team_id" {
  description = "Vercel team/org ID (optional)."
  type        = string
  default     = ""
}

variable "domain_root" {
  description = "Root domain (e.g. example.com)."
  type        = string
}

variable "frontend_env" {
  description = "Env vars for Vercel frontend (values from TF_VAR_ or .tfvars). No secrets in repo."
  type        = map(string)
  default     = {}
  sensitive   = true
}

variable "domain_root" {
  description = "Root domain (e.g. example.com)."
  type        = string
}

variable "env" {
  description = "Environment: default or dr."
  type        = string
}

variable "env_vars" {
  description = "Environment variables for Vercel project (from TF vars, no secrets in repo)."
  type        = map(string)
  default     = {}
  sensitive   = true
}

variable "vercel_team_id" {
  description = "Vercel team/org ID (optional)."
  type        = string
  default     = ""
}

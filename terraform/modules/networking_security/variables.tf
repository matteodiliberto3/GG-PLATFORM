variable "zone_id" {
  description = "Cloudflare zone ID."
  type        = string
}

variable "domain_root" {
  description = "Root domain (e.g. example.com)."
  type        = string
}

variable "env" {
  description = "Environment: default or dr."
  type        = string
}

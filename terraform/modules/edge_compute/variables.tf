variable "account_id" {
  description = "Cloudflare account ID (Workers, KV)."
  type        = string
}

variable "env" {
  description = "Environment: default or dr."
  type        = string
}

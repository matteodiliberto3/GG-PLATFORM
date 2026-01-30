output "zone_id" {
  value       = var.zone_id
  description = "Cloudflare zone ID."
}

output "app_fqdn" {
  value       = "app.${var.domain_root}"
  description = "Frontend FQDN."
}

output "api_fqdn" {
  value       = "api.${var.domain_root}"
  description = "API FQDN."
}

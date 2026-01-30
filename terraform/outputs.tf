output "cloudflare_zone_id" {
  value       = var.cloudflare_zone_id
  description = "Cloudflare zone ID."
}

output "kv_namespace_id" {
  value       = module.edge_compute.kv_namespace_id
  description = "Edge KV namespace ID (ban list / fast state)."
}

output "vercel_project_id" {
  value       = try(module.application_frontend[0].project_id, null)
  description = "Vercel project ID (null when env=dr)."
}

output "vercel_project_url" {
  value       = try(module.application_frontend[0].project_url, null)
  description = "Vercel project URL (null when env=dr)."
}

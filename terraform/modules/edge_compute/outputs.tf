output "kv_namespace_id" {
  value       = cloudflare_workers_kv_namespace.banlist.id
  description = "KV namespace ID for ban list."
}

output "worker_name" {
  value       = cloudflare_worker_script.gatekeeper.name
  description = "Worker script name."
}

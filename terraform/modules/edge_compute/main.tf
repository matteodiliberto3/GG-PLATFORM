# KV namespace for ban list / fast state (Edge)
resource "cloudflare_workers_kv_namespace" "banlist" {
  account_id = var.account_id
  title     = "gg-platform-banlist-${var.env}"
}

# Worker: placeholder script (deploy real Gatekeeper logic separately)
resource "cloudflare_worker_script" "gatekeeper" {
  account_id = var.account_id
  name      = "gg-gatekeeper-${var.env}"
  content   = <<-EOT
    addEventListener("fetch", (event) => {
      event.respondWith(handleRequest(event.request));
    });
    async function handleRequest(request) {
      return new Response("OK", { status: 200, headers: { "Content-Type": "text/plain" } });
    }
  EOT
}

# Optional: Cron trigger for periodic cleanup (uncomment and set schedule)
# resource "cloudflare_worker_cron_trigger" "cleanup" {
#   account_id  = var.account_id
#   script_name = cloudflare_worker_script.gatekeeper.name
#   schedules   = ["0 * * * *"]
# }

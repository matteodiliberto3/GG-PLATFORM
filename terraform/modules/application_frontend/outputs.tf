output "project_id" {
  value       = vercel_project.app.id
  description = "Vercel project ID."
}

output "project_url" {
  value       = "https://${vercel_project.app.name}.vercel.app"
  description = "Vercel project URL."
}

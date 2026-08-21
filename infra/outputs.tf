output "cloud_run_url" {
  value = google_cloud_run_v2_service.origin.uri
}

output "wif_provider" {
  description = "Full resource name for the GitHub Actions workload identity provider (GitHub secret GCP_WIF_PROVIDER)"
  value       = google_iam_workload_identity_pool_provider.github.name
}

output "infra_sa" {
  description = "Infra service account email (GitHub secret GCP_SA)"
  value       = google_service_account.infra.email
}

output "state_bucket" {
  value = google_storage_bucket.tfstate.name
}

output "dns_hostname" {
  value = var.hostname
}

output "google_maps_server_api_key" {
  description = "Google Maps Geocoding API server key"
  value       = google_apikeys_key.server.key_string
  sensitive   = true
}

output "google_maps_browser_api_key" {
  description = "Google Maps JavaScript API browser key"
  value       = google_apikeys_key.browser.key_string
  sensitive   = true
}
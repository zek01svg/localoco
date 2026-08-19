# The application origin. ADR-0006: one Cloud Run origin behind Cloudflare.
# Request-based billing (cpu_idle), zero minimum instances, max three.
# The placeholder image is swapped for the real ghcr image by CD (PRS-165);
# every release deploys an exact digest and stages it at 0% traffic until
# smoke checks pass, then promotes atomically.

resource "google_cloud_run_v2_service" "origin" {
  name     = "localoco"
  location = var.region
  project  = var.project_id

  depends_on = [google_project_service.run]

  template {
    scaling {
      # min_instance_count omitted: defaults to 0 (explicit 0 causes
      # perpetual provider drift in google v6)
      max_instance_count = 3
    }
    containers {
      image = var.origin_image
      resources {
        cpu_idle = true
      }
      # App secrets as env refs. Versions must exist before apply (operator
      # step, see docs/DEPLOYMENT.md); a missing version fails the release.
      dynamic "env" {
        for_each = toset(local.app_secrets)
        content {
          name = env.value
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.app[env.value].id
              version = "latest"
            }
          }
        }
      }
      # Geocoding key is provisioned by Terraform (maps.tf), so it is injected
      # directly instead of going through Secret Manager.
      env {
        name  = "GOOGLE_MAPS_API_KEY"
        value = google_apikeys_key.server.key_string
      }
      # Browser Maps JavaScript key is provisioned by Terraform (maps.tf)
      # and served to the client via /api/runtime.js.
      env {
        name  = "VITE_GOOGLE_MAPS_API_KEY"
        value = google_apikeys_key.browser.key_string
      }
    }
  }

  # Release traffic: a pinned hold revision keeps 100% while the newly
  # deployed latest revision stages at var.origin_traffic_latest (0%).
  # Promotion clears the hold and sets the latest target to 100%.
  dynamic "traffic" {
    for_each = var.origin_traffic_hold != "" ? [1] : []
    content {
      percent  = 100
      revision = var.origin_traffic_hold
      type     = "TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION"
    }
  }

  traffic {
    percent = var.origin_traffic_latest
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
  }
}

# Public invoker so the proxied Cloudflare edge can reach the origin.
resource "google_cloud_run_v2_service_iam_member" "public" {
  project  = google_cloud_run_v2_service.origin.project
  location = google_cloud_run_v2_service.origin.location
  name     = google_cloud_run_v2_service.origin.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Serves localoco.ciav.dev on the origin. Requires the zone to be verified in
# Webmaster Central for this project (manual bootstrap step, see README);
# gated off until then so apply stays green.
resource "google_cloud_run_domain_mapping" "localoco" {
  count    = var.enable_domain_mapping ? 1 : 0
  name     = "localoco.ciav.dev"
  location = google_cloud_run_v2_service.origin.location
  project  = google_cloud_run_v2_service.origin.project

  metadata {
    namespace = google_cloud_run_v2_service.origin.project
  }

  spec {
    route_name = google_cloud_run_v2_service.origin.name
  }
}
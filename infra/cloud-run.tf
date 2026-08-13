# The application origin. ADR-0006: one Cloud Run origin behind Cloudflare.
# Request-based billing (cpu_idle), zero minimum instances, max three.
# The placeholder image is swapped for the real ghcr image by deploy tickets.

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
    }
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
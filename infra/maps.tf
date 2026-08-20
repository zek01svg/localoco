# Google Maps Platform credentials. The Geocoding API resolves listing
# addresses to coordinates server-side at write time (ADR-0006). The browser
# key powers the client map UI (discovery map and listing detail map), which
# loads the Maps JavaScript API with VITE_GOOGLE_MAPS_API_KEY; its referrer
# restriction keeps the key useless off localoco.ciav.dev.

# Server key: restricted to the Geocoding API backend only, so it cannot be
# replayed against any other Google API even if it leaks.
resource "google_apikeys_key" "server" {
  name         = "localoco-geocoding-server"
  display_name = "LocaLoco server - Geocoding API"
  project      = var.project_id

  depends_on = [google_project_service.apikeys, google_project_service.geocoding]

  restrictions {
    api_targets {
      service = "geocoding-backend.googleapis.com"
    }
  }
}

# Browser key: Maps JavaScript API only, locked to the app origin. The client
# map UI (src/features/discovery/components/discovery-map.tsx and
# src/features/listings/components/listing-map-view.tsx) consumes it via
# VITE_GOOGLE_MAPS_API_KEY through @vis.gl/react-google-maps. The
# maps-backend.googleapis.com service is enabled in state-bucket.tf; the
# key's restriction is declarative and starts working the moment the service
# is turned on.
resource "google_apikeys_key" "browser" {
  name         = "localoco-maps-browser"
  display_name = "LocaLoco browser - Maps JavaScript API"
  project      = var.project_id

  depends_on = [google_project_service.apikeys, google_project_service.maps]

  restrictions {
    browser_key_restrictions {
      allowed_referrers = [
        "https://localoco.ciav.dev/*",
        "http://localhost:*/*",
        "http://localhost:*",
        "http://127.0.0.1:*/*",
        "http://127.0.0.1:*",
      ]
    }
    api_targets {
      service = "maps-backend.googleapis.com"
    }
  }
}

# Geocoding has no default daily cap (per-request billed) and is rate limited
# at 3000 queries/minute. 2000 requests per 5 minutes (400/min) is far below
# that limit but 10x above expected write traffic, so this fires if a
# misbehaving integration or attacker starts hammering the endpoint.
# An absolute daily budget cap is a Maps Platform console setting, not a
# Service Usage quota (QPD metrics were retired for Geocoding); see
# docs/DEPLOYMENT.md.
resource "google_monitoring_alert_policy" "geocoding_request_rate" {
  project      = var.project_id
  display_name = "LocaLoco - Geocoding request rate"
  combiner     = "OR"

  depends_on = [google_project_service.monitoring]

  conditions {
    display_name = "Geocoding API requests per 5 minutes above 2000"
    condition_threshold {
      filter          = "metric.type=\"serviceruntime.googleapis.com/api/request_count\" AND resource.type=\"consumed_api\" AND resource.labels.service=\"geocoding-backend.googleapis.com\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 2000
      aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_SUM"
        cross_series_reducer = "REDUCE_SUM"
      }
    }
  }
}

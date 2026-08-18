# Google Maps Platform credentials. The Geocoding API resolves listing
# addresses to coordinates server-side at write time (ADR-0006). The browser
# key stays dormant until a map UI ships; its referrer restriction keeps the
# key useless off localoco.ciav.dev.

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

# Browser key: Maps JavaScript API only, locked to the app origin. No client
# code consumes it yet; it exists so a future map feature has a bounded key
# ready instead of a new operator step. The maps-backend.googleapis.com
# service itself is NOT enabled until the map UI ships (only APIs actually
# used are enabled); the key's restriction is declarative and starts working
# the moment the service is turned on.
resource "google_apikeys_key" "browser" {
  name         = "localoco-maps-browser"
  display_name = "LocaLoco browser - Maps JavaScript API"
  project      = var.project_id

  depends_on = [google_project_service.apikeys]

  restrictions {
    browser_key_restrictions {
      allowed_referrers = ["https://localoco.ciav.dev/*"]
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
      filter          = "metric.type=\"serviceruntime.googleapis.com/api/request_count\" AND resource.label.service=\"geocoding-backend.googleapis.com\""
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

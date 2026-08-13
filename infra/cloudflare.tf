# The ciav.dev zone is shared; every resource here is scoped to
# var.hostname, never zone-wide.

# ghs.googlehosted.com is what Cloud Run requests for managed-cert issuance
# (see the mapping's resourceRecords); the edge still routes to the origin.
# proxied is false temporarily: Cloudflare's proxy intercepts Google's ACME
# validation and keeps the managed cert pending. Re-enable after issuance.
resource "cloudflare_record" "localoco" {
  zone_id = data.cloudflare_zone.ciav.id
  name    = var.hostname
  type    = "CNAME"
  content = "ghs.googlehosted.com"
  proxied = false
}

# Strict origin TLS: NOT managed here — the zone-settings API returns 9109
# for the current token (legacy zone_settings permission quirk), so the
# dashboard step is recorded in infra/README.md as a bootstrap step instead.
# Universal SSL is automatic on the Free plan; standard DDoS protection is
# always-on and not configurable.

# Free Managed WAF ruleset — the only WAF managed ruleset deployable on the
# Free plan (Cloudflare Managed Ruleset requires Pro+).
resource "cloudflare_ruleset" "managed_waf" {
  zone_id = data.cloudflare_zone.ciav.id
  name    = "Free Managed WAF"
  kind    = "zone"
  phase   = "http_request_firewall_managed"

  rules {
    action = "execute"
    action_parameters {
      id = "77454fe2d30c4220b5701f6fdfb893ba"
    }
    expression  = "true"
    description = "Cloudflare Free Managed Ruleset"
    enabled     = true
  }
}

# Narrow origin rate rule. Gated off: the current API token has no Zone Rate
# Limit permission. Re-scope the token and set enable_rate_rule = true.
resource "cloudflare_ruleset" "rate_limit" {
  count   = var.enable_rate_rule ? 1 : 0
  zone_id = data.cloudflare_zone.ciav.id
  name    = "Narrow origin rate limit"
  kind    = "zone"
  phase   = "http_ratelimit"

  rules {
    action = "block"
    ratelimit {
      requests_per_period = 100
      period              = 60
      mitigation_timeout  = 300
    }
    expression  = "(http.request.uri.path matches \"^/api\")"
    description = "Block /api bursts above 100 req/min/IP"
    enabled     = true
  }
}
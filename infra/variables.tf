variable "project_id" {
  type    = string
  default = "localoco-505304"
}

variable "region" {
  type    = string
  default = "asia-southeast1"
}

variable "zone_name" {
  type    = string
  default = "ciav.dev"
}

variable "hostname" {
  type    = string
  default = "localoco.ciav.dev"
}

variable "origin_image" {
  type    = string
  default = "us-docker.pkg.dev/cloudrun/container/hello"
}

# CD traffic controls (PRS-165). The stage apply pins the currently serving
# revision at 100% and stages the new latest revision at 0%; the promote
# apply clears the hold and sends 100% to latest.
variable "origin_traffic_hold" {
  type        = string
  default     = ""
  description = "Revision name that keeps 100% traffic while the latest revision stages at 0%. Empty = no pinned hold."
}

variable "origin_traffic_latest" {
  type        = number
  default     = 100
  description = "Percent of traffic sent to the latest ready revision (0 = stage, 100 = promote)."
}

# The current Cloudflare API token lacks Zone Rate Limit permission.
# Re-scope the token (Zone > Rate Limit > Edit) and set this to true to
# create the narrow origin rate rule.
variable "enable_rate_rule" {
  type    = bool
  default = false
}

# Requires ciav.dev verified in Webmaster Central for this project.
# Verify, then set to true to create the Cloud Run domain mapping.
variable "enable_domain_mapping" {
  type    = bool
  default = false
}
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
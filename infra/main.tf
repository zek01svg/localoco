provider "google" {
  project = var.project_id
  region  = var.region
}

# Credentials come from the CLOUDFLARE_API_TOKEN environment variable;
# the token is never stored in variables, tfvars, or state.
provider "cloudflare" {}

data "google_project" "current" {
  project_id = var.project_id
}

data "cloudflare_zone" "ciav" {
  name = var.zone_name
}
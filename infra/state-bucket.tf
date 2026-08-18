# The state bucket cannot be created by Terraform (backend must exist before
# init). bootstrap.ps1 creates it once with identical settings; this resource
# is then imported so the bucket stays in IaC from then on.

resource "google_storage_bucket" "tfstate" {
  name                        = "localoco-tfstate"
  location                    = var.region
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  versioning {
    enabled = true
  }
}

resource "google_project_service" "run" {
  service            = "run.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "secretmanager" {
  service            = "secretmanager.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "iamcredentials" {
  service            = "iamcredentials.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "iam" {
  service            = "iam.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "apikeys" {
  service            = "apikeys.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "geocoding" {
  service            = "geocoding-backend.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "monitoring" {
  service            = "monitoring.googleapis.com"
  disable_on_destroy = false
}

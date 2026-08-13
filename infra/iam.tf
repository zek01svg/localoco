# Workload Identity Federation: GitHub Actions authenticates as the infra
# service account with no long-lived key stored in GitHub.

resource "google_iam_workload_identity_pool" "github" {
  project                   = var.project_id
  workload_identity_pool_id = "github"
  display_name              = "GitHub Actions"
  description               = "OIDC federation for github.com/zek01svg/localoco"
}

resource "google_iam_workload_identity_pool_provider" "github" {
  project                            = var.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-actions"
  display_name                       = "GitHub Actions OIDC"
  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
  }
  attribute_condition = "assertion.repository == \"zek01svg/localoco\""
  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

resource "google_service_account" "infra" {
  project      = var.project_id
  account_id   = "terraform"
  display_name = "Terraform infra"
}

resource "google_service_account_iam_binding" "github" {
  service_account_id = google_service_account.infra.name
  role               = "roles/iam.workloadIdentityUser"
  members = [
    "principalSet://iam.googleapis.com/projects/${data.google_project.current.number}/locations/global/workloadIdentityPools/${google_iam_workload_identity_pool.github.workload_identity_pool_id}/attribute.repository/zek01svg/localoco",
  ]
}

locals {
  infra_roles = [
    "roles/run.admin",
    "roles/secretmanager.admin",
    "roles/iam.securityAdmin",
    "roles/iam.serviceAccountAdmin",
    "roles/iam.workloadIdentityPoolAdmin",
    "roles/storage.admin",
  ]
}

resource "google_project_iam_member" "infra" {
  for_each = toset(local.infra_roles)
  project  = var.project_id
  role     = each.key
  member   = "serviceAccount:${google_service_account.infra.email}"
}
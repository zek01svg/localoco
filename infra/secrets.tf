# Empty Secret Manager containers with IAM for the infra service account.
# Secret values are never in Terraform; operators populate versions via
# `gcloud secrets versions add` (see infra/README.md).

locals {
  app_secrets = [
    "DATABASE_URL",
    "BETTER_AUTH_SECRET",
    "SMOKE_TOKEN",
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_SECURE",
    "SMTP_USER",
    "SMTP_PASS",
    "SMTP_FROM",
  ]
}

resource "google_secret_manager_secret" "app" {
  for_each   = toset(local.app_secrets)
  project    = var.project_id
  secret_id  = each.key
  depends_on = [google_project_service.secretmanager]

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_iam_member" "app" {
  for_each  = toset(local.app_secrets)
  project   = var.project_id
  secret_id = each.key
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.infra.email}"
}

# Cloud Run revisions run as the default compute service account (no custom
# runtime service_account is set in cloud-run.tf) and read these secrets at
# deploy/boot time - it needs its own accessor grant, separate from the
# terraform SA's grant above which only covers Terraform-driven reads.
resource "google_secret_manager_secret_iam_member" "app_runtime" {
  for_each  = toset(local.app_secrets)
  project   = var.project_id
  secret_id = each.key
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${data.google_project.current.number}-compute@developer.gserviceaccount.com"
}
# One-time bootstrap: creates the GCS state bucket Terraform cannot create
# for itself. Run once before the first `terraform init`. Idempotent.
#
#   pwsh infra/bootstrap.ps1
#
# Then, from infra/:
#   terraform init
#   terraform import google_storage_bucket.tfstate localoco-tfstate
#   terraform plan
#   terraform apply
$ErrorActionPreference = "Stop"

function Invoke-Gcloud {
  & gcloud @args
  if ($LASTEXITCODE -ne 0) { throw "gcloud @args failed (exit $LASTEXITCODE)" }
}

$bucket  = "localoco-tfstate"
$project = "localoco-505304"
$region  = "asia-southeast1"

if (-not (gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>$null)) {
  throw "gcloud is not authenticated. Run: gcloud auth login"
}

$exists = gcloud storage buckets describe "gs://$bucket" --project $project 2>$null
if (-not $exists) {
  Invoke-Gcloud storage buckets create "gs://$bucket" `
    --project $project `
    --location $region `
    --uniform-bucket-level-access `
    --pap
}

$versioning = gcloud storage buckets describe "gs://$bucket" --project $project --format "value(versioning.enabled)" 2>$null
if ($versioning -ne "true") {
  Invoke-Gcloud storage buckets update "gs://$bucket" --project $project --versioning
}

Write-Host ""
Write-Host "State bucket ready: gs://$bucket"
Write-Host "Next steps (from infra/):"
Write-Host "  terraform init"
Write-Host "  terraform import google_storage_bucket.tfstate $bucket"
Write-Host "  terraform plan && terraform apply"
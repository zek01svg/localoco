# Private object storage for Listing photos (PRS-181). Objects are never
# publicly readable: every read and write goes through server-issued
# presigned URLs (see server/lib/media-storage.ts). Credentials are the
# R2 API token stored as Secret Manager secrets (secrets.tf) — values never
# live in Terraform.
#
# Bootstrap steps Terraform cannot express:
# - Create the R2 API token with Object Read & Write on this bucket and store
#   its Access Key ID / Secret as AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY.
# - Allow the client origin's PUT/GET/DELETE via the S3 CORS API (the
#   cloudflare provider has no R2 CORS resource):
#   aws s3api put-bucket-cors --endpoint-url <r2-endpoint> \
#     --cors-configuration '{"CORSRules":[{"AllowedOrigins":["https://localoco.ciav.dev"],"AllowedMethods":["PUT","GET","DELETE"],"AllowedHeaders":["content-type"],"ExposeHeaders":[],"MaxAgeSeconds":3600}]}'

data "cloudflare_accounts" "ciav" {}

resource "cloudflare_r2_bucket" "listing_photos" {
  account_id = data.cloudflare_accounts.ciav.accounts[0].id
  name       = "localoco-listing-photos"
  location   = "APAC"
}

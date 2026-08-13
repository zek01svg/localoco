# TODOs

Deferred work, tracked here rather than presented as implemented. See
`docs/DEPLOYMENT.md` for the release flow these prerequisites gate.

## Operator prerequisites (blocking the first live release)

- [ ] Set GitHub secrets: `GCP_WIF_PROVIDER`, `GCP_SA`, `CLOUDFLARE_API_TOKEN`.
- [ ] Create the GitHub `production` environment with required reviewers (the
      approval gate on the `terraform-apply` job in `cd.yml`).
- [ ] Populate GCP Secret Manager versions for every app secret, including
      `DATABASE_URL` and `SMOKE_TOKEN` — Cloud Run fails a revision when a
      referenced secret has no version, so the stage apply cannot converge
      until these exist.
- [ ] Run `cd.yml` (dispatch, default `main`) to exercise the release
      pipeline end to end and capture the first digest + revision as the
      rollback target.
- [ ] Apply the `google_service_account_iam_member.infra_actas_default_compute`
      binding in `infra/iam.tf` (`terraform apply`) — the first real `cd.yml`
      run failed with `PERMISSION_DENIED: iam.serviceaccounts.actAs` because
      the `terraform` service account could not act as the Cloud Run
      runtime's default compute service account.

## Pre-existing infra drift

- [ ] `google_cloud_run_domain_mapping` is in Terraform state (applied
      earlier with `enable_domain_mapping=true`), but the committed config
      defaults the variable to `false` — `terraform plan` shows 1 pending
      destroy. Decide intent before the first release apply so it doesn't
      silently remove the mapping.
- [ ] Cloudflare SSL/TLS mode: set to Full (strict) in the dashboard
      (not yet automated via Terraform).
- [ ] Re-scope the Cloudflare API token to enable the rate-limiting rule
      (`enable_rate_rule`), currently left off pending that scope.

# Adds/overwrites the 17 Stripe price/meter env vars on Vercel across all environments.
# Prereqs (already satisfied in this repo): `npx vercel login` + `npx vercel link` (project webdoc.ai).
# Run:  ./scripts/vercel-add-stripe-env.ps1
$ErrorActionPreference = 'Continue'  # native non-zero exits must not halt the loop

# This machine's Avast does TLS interception; Node/npm (and the Vercel CLI) won't trust
# its MITM cert by default. Relax validation for the local hop only (not persisted).
$env:NODE_TLS_REJECT_UNAUTHORIZED = '0'
$env:npm_config_strict_ssl = 'false'

$vars = [ordered]@{
  STRIPE_PRICE_STARTER_MONTHLY      = 'price_1TjAH8JhDGw6VImSlTEGycEP'
  STRIPE_PRICE_STARTER_ANNUAL       = 'price_1TjAH8JhDGw6VImSdW856mgO'
  STRIPE_PRICE_PRO_MONTHLY          = 'price_1TjAH9JhDGw6VImSpMTutS4b'
  STRIPE_PRICE_PRO_ANNUAL           = 'price_1TjAH9JhDGw6VImSaHoynyyo'
  STRIPE_PRICE_AGENCY_MONTHLY       = 'price_1TjAHAJhDGw6VImSgzTlOwxf'
  STRIPE_PRICE_AGENCY_ANNUAL        = 'price_1TjAHAJhDGw6VImSoX2Ra9R5'
  STRIPE_PRICE_PLAYGROUND_METERED   = 'price_1TjAHBJhDGw6VImSqCRG214v'
  STRIPE_PRICE_DEV_BASE_MONTHLY     = 'price_1TjAHBJhDGw6VImSdvetyCHK'
  STRIPE_PRICE_DEV_BASE_ANNUAL      = 'price_1TjAHCJhDGw6VImSnSUmLIbQ'
  STRIPE_PRICE_DEV_METERED          = 'price_1TjMoUJhDGw6VImSyTPDwMN1'
  STRIPE_PRICE_BUILDER_BASE_MONTHLY = 'price_1TjAHCJhDGw6VImSiNrdY87M'
  STRIPE_PRICE_BUILDER_BASE_ANNUAL  = 'price_1TjAHDJhDGw6VImSSssFwvwz'
  STRIPE_PRICE_BUILDER_METERED      = 'price_1TjMoVJhDGw6VImSdxZDFojG'
  STRIPE_PRICE_SCALE_BASE_MONTHLY   = 'price_1TjAHEJhDGw6VImSlNQMGAji'
  STRIPE_PRICE_SCALE_BASE_ANNUAL    = 'price_1TjAHEJhDGw6VImShaEUYW6L'
  STRIPE_PRICE_SCALE_METERED        = 'price_1TjMoXJhDGw6VImS8bCrGRDO'
  STRIPE_API_SCAN_METER_ID          = 'mtr_61UsYETI27EbqrpPE41JhDGw6VImSITQ'
}
$envs = @('production', 'preview', 'development')

$ok = 0; $fail = 0
foreach ($name in $vars.Keys) {
  $value = $vars[$name]
  foreach ($e in $envs) {
    # --force overwrites if present (idempotent); --value avoids interactive stdin;
    # --yes confirms "all Preview branches" (no-op for production/development).
    npx --yes vercel env add $name $e --force --value $value --yes 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) { Write-Host ("OK   {0,-34} [{1}]" -f $name, $e) -ForegroundColor Green; $ok++ }
    else { Write-Host ("FAIL {0,-34} [{1}] (exit {2})" -f $name, $e, $LASTEXITCODE) -ForegroundColor Red; $fail++ }
  }
}
Write-Host ("`nDone. {0} succeeded, {1} failed (of {2}). Verify with: npx vercel env ls" -f $ok, $fail, ($vars.Count * $envs.Count))

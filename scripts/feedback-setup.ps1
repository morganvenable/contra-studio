# One-time setup of the dancer feedback Worker on Cloudflare.
# Run from anywhere: powershell -File scripts/feedback-setup.ps1
# It signs in to Cloudflare (browser), creates the D1 database, applies the
# schema, deploys the Worker, stores the secrets and tells the Pages build
# where the Worker lives. Safe to run again: existing pieces are reused.
# Needs a real terminal for the sign-in; go-live.ps1 opens one if needed.
$ErrorActionPreference = 'Stop'
$worker = Join-Path $PSScriptRoot '..\worker\feedback'
$tokenFile = 'C:\Users\morga\Svalboard\private\contra-feedback-token.txt'
Set-Location $worker

# Native commands don't stop the script on failure; check each one.
function Check($what) {
  if ($LASTEXITCODE -ne 0) { throw "$what failed (exit $LASTEXITCODE)." }
}

if (-not (Test-Path node_modules)) { npm ci; Check 'npm ci' }

# whoami exits 0 even when signed out, so read what it says.
$ErrorActionPreference = 'Continue'
$who = npx wrangler whoami 2>&1 | Out-String
$ErrorActionPreference = 'Stop'
if ($who -match 'not authenticated') {
  Write-Host 'Signing in to Cloudflare (a browser window opens)...'
  npx wrangler login; Check 'Cloudflare sign-in'
}

$dbs = npx wrangler d1 list --json | ConvertFrom-Json; Check 'd1 list'
$db = $dbs | Where-Object { $_.name -eq 'contra-feedback' }
if (-not $db) {
  npx wrangler d1 create contra-feedback | Out-Host; Check 'd1 create'
  $db = (npx wrangler d1 list --json | ConvertFrom-Json) |
    Where-Object { $_.name -eq 'contra-feedback' }
}
if (-not $db.uuid) { throw 'Could not find the contra-feedback database id.' }
$config = Get-Content wrangler.jsonc -Raw
$config = $config -replace '"database_id": "[^"]*"', "`"database_id`": `"$($db.uuid)`""
[IO.File]::WriteAllText((Resolve-Path wrangler.jsonc), $config)

npx wrangler d1 migrations apply contra-feedback --remote; Check 'migrations'

$deploy = npx wrangler deploy | Out-String; Check 'deploy'
Write-Host $deploy
$url = [regex]::Match($deploy, 'https://contra-feedback[^\s]*workers\.dev').Value
if (-not $url) { throw 'Could not find the Worker URL in the deploy output.' }

if (-not (Test-Path $tokenFile)) {
  New-Item -ItemType Directory -Force (Split-Path $tokenFile) | Out-Null
  $owner = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
  $salt = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
  # Piping into "secret put" can hang on Windows; upload both from a file.
  $tmp = Join-Path (Split-Path $tokenFile) 'contra-secrets.tmp.json'
  $json = @{ OWNER_TOKEN = $owner; RATE_LIMIT_SALT = $salt } | ConvertTo-Json
  [IO.File]::WriteAllText($tmp, $json)
  try { npx wrangler secret bulk $tmp; Check 'secrets' }
  finally { Remove-Item $tmp -Force }
  Set-Content $tokenFile $owner -Encoding ascii -NoNewline
}

gh variable set VITE_FEEDBACK_URL -R morganvenable/contra-studio --body $url
Check 'gh variable set'
Write-Host "Feedback Worker live at $url"
Write-Host "Owner token saved in $tokenFile"

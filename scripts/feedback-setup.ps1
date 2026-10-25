# One-time setup of the dancer feedback Worker on Cloudflare.
# Run from anywhere: powershell -File scripts/feedback-setup.ps1
# It signs in to Cloudflare (browser), creates the D1 database, applies the
# schema, deploys the Worker, stores the secrets and tells the Pages build
# where the Worker lives. Safe to run again: existing pieces are reused.
$ErrorActionPreference = 'Stop'
$worker = Join-Path $PSScriptRoot '..\worker\feedback'
$tokenFile = 'C:\Users\morga\Svalboard\private\contra-feedback-token.txt'
Set-Location $worker

if (-not (Test-Path node_modules)) { npm ci }

Write-Host 'Signing in to Cloudflare (a browser window opens)...'
npx wrangler whoami *> $null
if ($LASTEXITCODE -ne 0) { npx wrangler login }

$dbs = npx wrangler d1 list --json | ConvertFrom-Json
$db = $dbs | Where-Object { $_.name -eq 'contra-feedback' }
if (-not $db) {
  npx wrangler d1 create contra-feedback | Out-Host
  $db = (npx wrangler d1 list --json | ConvertFrom-Json) |
    Where-Object { $_.name -eq 'contra-feedback' }
}
$config = Get-Content wrangler.jsonc -Raw
$config = $config -replace '"database_id": "[^"]*"', "`"database_id`": `"$($db.uuid)`""
[IO.File]::WriteAllText((Resolve-Path wrangler.jsonc), $config)

npx wrangler d1 migrations apply contra-feedback --remote

$deploy = npx wrangler deploy | Out-String
Write-Host $deploy
$url = [regex]::Match($deploy, 'https://contra-feedback[^\s]*workers\.dev').Value
if (-not $url) { throw 'Could not find the Worker URL in the deploy output.' }

if (-not (Test-Path $tokenFile)) {
  New-Item -ItemType Directory -Force (Split-Path $tokenFile) | Out-Null
  $owner = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
  Set-Content $tokenFile $owner -Encoding ascii -NoNewline
  $owner | npx wrangler secret put OWNER_TOKEN
  ([guid]::NewGuid().ToString('N')) | npx wrangler secret put RATE_LIMIT_SALT
}

gh variable set VITE_FEEDBACK_URL -R morganvenable/contra-studio --body $url
Write-Host "Feedback Worker live at $url"
Write-Host "Owner token saved in $tokenFile"

# Puts the current branch live on GitHub Pages, with the feedback box.
# Run: powershell -File C:/Users/morga/contra-rebuild/scripts/go-live.ps1
# Without a real terminal (Claude Code's ! prefix), it reopens itself in a
# new PowerShell window so the Cloudflare sign-in can run.
$ErrorActionPreference = 'Stop'
if ([Console]::IsInputRedirected) {
  Start-Process powershell -ArgumentList @(
    '-NoExit', '-ExecutionPolicy', 'Bypass', '-File', $PSCommandPath)
  Write-Host 'Opened a PowerShell window to finish there.'
  exit 0
}
$repo = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $repo

# 1. Feedback Worker on Cloudflare (browser sign-in the first time).
powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'feedback-setup.ps1')
if ($LASTEXITCODE -ne 0) { throw 'Feedback setup failed.' }
Set-Location $repo

# The setup writes the database id into wrangler.jsonc; keep it.
git diff --quiet -- worker/feedback/wrangler.jsonc
if ($LASTEXITCODE -ne 0) {
  git add worker/feedback/wrangler.jsonc
  git commit -m "Record the feedback database id" `
    -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
}

# 2. Push to main.
git push origin HEAD:main
if ($LASTEXITCODE -ne 0) { throw 'Push failed.' }

# 3. Deploy the site.
gh workflow run pages.yml -R morganvenable/contra-studio -f deploy=true
if ($LASTEXITCODE -ne 0) { throw 'Deploy dispatch failed.' }
Write-Host 'Done. Deploy started; Claude will check the live site.'

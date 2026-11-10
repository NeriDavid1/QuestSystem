# Sync the Voice Review page with the Unity project (see docs/voice-review.md).
# Takes the Supabase URL and key from editor/.env (the web editor's own values), then the sync asks for
# your QuestForge email and password. Usage (from the QuestSystem folder):
#   powershell -ExecutionPolicy Bypass -File scripts\voice_review_sync.ps1 -Project "C:/.../English-Kingdom/English Kingdom"
#   add -DryRun to only see what would change, -SkipAudio to sync decisions only.
param(
    [Parameter(Mandatory = $true)][string]$Project,
    [switch]$DryRun,
    [switch]$SkipAudio
)

$root = Split-Path $PSScriptRoot -Parent
$envFile = Join-Path $root 'editor/.env'
if (-not (Test-Path $envFile)) { Write-Error "$envFile was not found."; exit 1 }
foreach ($line in Get-Content $envFile -Encoding UTF8) {
    if ($line -match '^\s*VITE_SUPABASE_URL\s*=\s*(.+)$') { $env:QUEST_SUPABASE_URL = $Matches[1].Trim().Trim('"') }
    if ($line -match '^\s*VITE_SUPABASE_ANON_KEY\s*=\s*(.+)$') { $env:QUEST_SUPABASE_ANON_KEY = $Matches[1].Trim().Trim('"') }
}
$env:PYTHONIOENCODING = 'utf-8'

$pyArgs = @((Join-Path $root 'scripts/voice_review_sync.py'), '--project', $Project)
if ($DryRun) { $pyArgs += '--dry-run' }
if ($SkipAudio) { $pyArgs += '--skip-audio' }
python @pyArgs
exit $LASTEXITCODE

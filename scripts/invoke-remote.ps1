# Manually invoke the deployed Orbit Lambda and show the result + recent logs.
# Usage: .\scripts\invoke-remote.ps1
$ErrorActionPreference = "Stop"
$functionName = "orbit-briefing"
$outFile = Join-Path $PSScriptRoot "..\out.json"

aws lambda invoke `
    --function-name $functionName `
    --payload fileb://$(Join-Path $PSScriptRoot "..\events\test-event.json") `
    --cli-read-timeout 180 `
    $outFile | Out-Host

Write-Host "`n--- Lambda response ---"
Get-Content $outFile | Out-Host

Write-Host "`n--- Recent logs (last 5 minutes) ---"
aws logs tail "/aws/lambda/$functionName" --since 5m | Out-Host

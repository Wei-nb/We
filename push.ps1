# Push all commits to GitHub (including LFS videos ~520MB)
Set-Location "d:\Desktop\web"
Write-Host "=== Pushing to GitHub ===" -ForegroundColor Cyan
Write-Host "This will upload 3 LFS video files (total ~520MB) and may take 3-8 minutes." -ForegroundColor Yellow
Write-Host ""
git push origin main
Write-Host ""
if ($LASTEXITCODE -eq 0) {
    Write-Host "PUSH SUCCESS!" -ForegroundColor Green
    Write-Host "Visit: https://wei-nb.github.io/We/" -ForegroundColor Green
} else {
    Write-Host "Push failed with exit code: $LASTEXITCODE" -ForegroundColor Red
}
Write-Host ""
Read-Host "Press Enter to close"

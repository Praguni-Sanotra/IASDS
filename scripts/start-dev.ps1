# Start IASDS local stack (open each service in a new terminal)
$root = Split-Path -Parent $PSScriptRoot

Write-Host "IASDS Dev Launcher" -ForegroundColor Cyan
Write-Host "Root: $root"
Write-Host ""
Write-Host "Start these in separate terminals:" -ForegroundColor Yellow
Write-Host "  1. Backend:   cd $root\backend;   npm run dev"
Write-Host "  2. Scheduler: cd $root\scheduler; python main.py"
Write-Host "  3. Frontend:  cd $root\frontend;  npm run dev"
Write-Host ""
Write-Host "Login: admin@miet.ac.in / Admin@123 (after npm run seed in backend)" -ForegroundColor Green
Write-Host "App:   http://localhost:3000" -ForegroundColor Green

# Optional: launch backend in this window
$start = Read-Host "Start backend here now? (y/n)"
if ($start -eq 'y') {
  Set-Location "$root\backend"
  npm run dev
}

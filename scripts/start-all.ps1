param(
  [switch]$RebuildImages,
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

function Run-Step {
  param (
    [string]$Name,
    [string]$Command
  )

  Write-Host "==> $Name" -ForegroundColor Cyan
  $ps = Start-Process -FilePath "powershell" -ArgumentList "-NoProfile", "-Command", $Command -Wait -PassThru -WindowStyle Hidden
  if ($ps.ExitCode -ne 0) {
    throw "$Name failed with exit code $($ps.ExitCode)"
  }
}

Write-Host "Starting IndexFlow stack..." -ForegroundColor Green

if (-not $SkipBuild) {
  Run-Step -Name "Install root dependencies" -Command "npm install"
  Run-Step -Name "Build contracts" -Command "cd contracts; npm run build"
  Run-Step -Name "Build index-node" -Command "cd index-node; npm run build"
  Run-Step -Name "Build frontend" -Command "cd frontend; npm run build"
}

# Check Docker availability
Write-Host "==> Checking Docker daemon" -ForegroundColor Cyan
try {
  docker info | Out-Null
} catch {
  throw "Docker daemon is not running. Please start Docker Desktop and retry."
}

$composeArgs = "up -d"
if ($RebuildImages) {
  $composeArgs = "up -d --build"
}

Run-Step -Name "Start Docker stack (db, index-node, frontend, monitoring)" -Command "docker compose $composeArgs"

Write-Host "Stack started." -ForegroundColor Green
Write-Host "Services:"
Write-Host "  - GraphQL: http://localhost:14000/graphql"
Write-Host "  - Metrics: http://localhost:14000/metrics"
Write-Host "  - Frontend: http://localhost:3000"
Write-Host "  - Prometheus: http://localhost:9090"
Write-Host "  - Grafana: http://localhost:3001 (admin/admin)"
Write-Host ""
Write-Host "Flags:"
Write-Host "  -RebuildImages    rebuild Docker images before start"
Write-Host "  -SkipBuild        skip local npm builds (uses existing artifacts)"

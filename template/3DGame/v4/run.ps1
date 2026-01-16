param(
	[switch]$b,
	[switch]$d
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

if (-not (Test-Path "node_modules")) {
	Write-Host "Installing root dependencies..." -ForegroundColor Yellow
	pnpm install
}

$editorDir = "apps\editor"
if (-not (Test-Path "$editorDir\node_modules")) {
	Write-Host "Installing editor dependencies..." -ForegroundColor Yellow
	Push-Location $editorDir
	pnpm install
	Pop-Location
}

$editorDist = "apps\editor\dist"
$clientDist = "apps\client\dist"

if ($b) {
	$releaseDir = "build\release"
	if (Test-Path $releaseDir) {
		Remove-Item -Recurse -Force $releaseDir
	}
	New-Item -ItemType Directory -Force -Path "$releaseDir\editor" | Out-Null
	New-Item -ItemType Directory -Force -Path "$releaseDir\client" | Out-Null
	Write-Host "Building editor..." -ForegroundColor Cyan
	pnpm --filter @engine/editor build
	Copy-Item "$editorDist\index.html" "$releaseDir\editor\index.html"
	Write-Host "Building client..." -ForegroundColor Cyan
	pnpm --filter @engine/client build
	Copy-Item "$clientDist\index.html" "$releaseDir\client\index.html"
	Write-Host "Build completed: $releaseDir" -ForegroundColor Green
} elseif ($d) {
	$devDir = "build\dev"
	if (Test-Path $devDir) {
		Remove-Item -Recurse -Force $devDir
	}
	New-Item -ItemType Directory -Force -Path $devDir | Out-Null
	Write-Host "Building editor (dev)..." -ForegroundColor Cyan
	Push-Location $editorDir
	pnpm build
	Pop-Location
	Copy-Item "$editorDist\index.html" "$devDir\index.html"
	$htmlPath = Join-Path $scriptDir "build\dev\index.html"
	Write-Host "Opening in Chrome..." -ForegroundColor Cyan
	Start-Process "chrome" $htmlPath
} else {
    Write-Host "Starting editor dev server..." -ForegroundColor Cyan
	Push-Location $editorDir
	pnpm dev
	Pop-Location
}

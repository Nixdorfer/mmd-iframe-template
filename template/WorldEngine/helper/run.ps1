param(
    [switch]$b
)
$ErrorActionPreference = "Stop"
$HELPER_DIR = $PSScriptRoot
$SERVER_DIR = Join-Path $HELPER_DIR "server"
$WAILS_DIR = Join-Path $SERVER_DIR "src-wails"
$VUE_DIR = Join-Path $SERVER_DIR "src-vue"
$FRONTEND_DIR = Join-Path $WAILS_DIR "frontend"
$ICON_PATH = Join-Path $HELPER_DIR "..\..\..\.ref\icons\icon.ico"
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  3DGame AI Asset Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
if (-not (Get-Command "go" -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Go is not installed. Run deploy.ps1 first." -ForegroundColor Red
    exit 1
}
if (-not (Get-Command "node" -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js is not installed. Run deploy.ps1 first." -ForegroundColor Red
    exit 1
}
if (-not (Test-Path $WAILS_DIR)) {
    Write-Host "[ERROR] Wails source not found: $WAILS_DIR" -ForegroundColor Red
    exit 1
}
if (-not (Get-Command "wails" -ErrorAction SilentlyContinue)) {
    Write-Host "[*] Installing Wails CLI..." -ForegroundColor Yellow
    go install github.com/wailsapp/wails/v2/cmd/wails@latest
    $env:Path = $env:Path + ";" + (Join-Path $env:GOPATH "bin") + ";" + (Join-Path $env:USERPROFILE "go\bin")
}
Set-Location $VUE_DIR
if (-not (Test-Path "node_modules")) {
    Write-Host "[*] Installing frontend dependencies..." -ForegroundColor Yellow
    npm install
}
Write-Host "[*] Building frontend..." -ForegroundColor Yellow
npm run build
Write-Host "[*] Copying frontend to Wails..." -ForegroundColor Gray
if (Test-Path $FRONTEND_DIR) {
    Remove-Item $FRONTEND_DIR -Recurse -Force
}
Copy-Item (Join-Path $VUE_DIR "dist") $FRONTEND_DIR -Recurse
Set-Location $WAILS_DIR
if (-not (Test-Path "go.sum")) {
    Write-Host "[*] Downloading Go modules..." -ForegroundColor Yellow
    go mod tidy
}
$exePath = Join-Path $HELPER_DIR "server.exe"
if ($b) {
    Write-Host "[*] Building server.exe..." -ForegroundColor Green
    wails build -s -o "server.exe"
    $buildOutput = Join-Path $WAILS_DIR "build\bin\server.exe"
    if (Test-Path $buildOutput) {
        Copy-Item $buildOutput $exePath -Force
        Set-Location $HELPER_DIR
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "  Build Complete!" -ForegroundColor Cyan
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Output: $exePath" -ForegroundColor Green
    } else {
        Set-Location $HELPER_DIR
        Write-Host "[ERROR] Build failed, output not found" -ForegroundColor Red
        exit 1
    }
} else {
    if (Test-Path $exePath) {
        Write-Host "[*] Starting server.exe..." -ForegroundColor Green
        Set-Location $HELPER_DIR
        Start-Process $exePath
    } else {
        Write-Host "[*] Starting server in dev mode..." -ForegroundColor Green
        Write-Host "[*] Press Ctrl+C to stop" -ForegroundColor Gray
        Write-Host ""
        wails dev
    }
}
Set-Location $HELPER_DIR

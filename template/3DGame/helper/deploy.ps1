$ErrorActionPreference = "Stop"
$HELPER_DIR = $PSScriptRoot
Set-Location $HELPER_DIR
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  3DGame AI Asset Workflow Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
function Test-Command($cmd) {
    try { Get-Command $cmd -ErrorAction Stop | Out-Null; return $true }
    catch { return $false }
}
function Test-Admin {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}
function Remove-LockFile($path) {
    if (Test-Path $path) {
        try { Remove-Item $path -Force -ErrorAction Stop }
        catch { Write-Host "    [WARN] Could not remove lock file: $path" -ForegroundColor Yellow }
    }
}
function Install-Chocolatey {
    if (-not (Test-Command "choco")) {
        Write-Host "[*] Installing Chocolatey..." -ForegroundColor Yellow
        if (-not (Test-Admin)) {
            Write-Host "[ERROR] Administrator privileges required to install Chocolatey" -ForegroundColor Red
            Write-Host "    Please run PowerShell as Administrator" -ForegroundColor Yellow
            exit 1
        }
        Set-ExecutionPolicy Bypass -Scope Process -Force
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
        try {
            iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
        } catch {
            Write-Host "[ERROR] Failed to install Chocolatey: $_" -ForegroundColor Red
            exit 1
        }
    }
}
function Install-ChocoPkg($pkg) {
    Write-Host "[*] Installing $pkg..." -ForegroundColor Yellow
    $lockPattern = "C:\ProgramData\chocolatey\lib\*$pkg*"
    Get-ChildItem $lockPattern -ErrorAction SilentlyContinue | Where-Object { $_.Name -match "^[a-f0-9]{40}$" } | ForEach-Object {
        Remove-LockFile $_.FullName
    }
    $result = choco install $pkg -y 2>&1
    if ($LASTEXITCODE -ne 0) {
        if ($result -match "lock file") {
            Write-Host "    [WARN] Lock file detected, attempting cleanup..." -ForegroundColor Yellow
            Get-ChildItem "C:\ProgramData\chocolatey\lib\" -ErrorAction SilentlyContinue | Where-Object { $_.Name -match "^[a-f0-9]{40}$" } | ForEach-Object {
                Remove-LockFile $_.FullName
            }
            choco install $pkg -y --force
        } else {
            Write-Host "[ERROR] Failed to install $pkg" -ForegroundColor Red
            Write-Host $result -ForegroundColor Gray
        }
    }
}
function Find-Python311 {
    $paths = @(
        "C:\Python311\python.exe",
        "C:\Program Files\Python311\python.exe",
        "C:\Program Files (x86)\Python311\python.exe",
        "C:\tools\python311\python.exe",
        "$env:LOCALAPPDATA\Programs\Python\Python311\python.exe"
    )
    foreach ($p in $paths) {
        if (Test-Path $p) { return $p }
    }
    try {
        $pyCheck = py -3.11 --version 2>&1
        if ($pyCheck -match "Python 3\.11") { return "py -3.11" }
    } catch {}
    return $null
}
function Repair-Venv($venvPath, $py311) {
    $pipExe = Join-Path $venvPath "Scripts\python.exe"
    if (-not (Test-Path $pipExe)) { return $false }
    try {
        & $pipExe -m ensurepip --upgrade 2>&1 | Out-Null
        & $pipExe -m pip install --upgrade pip setuptools wheel -q 2>&1 | Out-Null
        return $true
    } catch {
        return $false
    }
}
function Setup-Venv($dir, $py311) {
    Set-Location $dir
    $venvPath = Join-Path $dir "venv"
    if (-not (Test-Path $venvPath)) {
        Write-Host "    Creating venv..." -ForegroundColor Gray
        & $py311 -m venv venv
    }
    $pipTest = & "venv\Scripts\python.exe" -c "import pip" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "    Repairing pip..." -ForegroundColor Yellow
        if (-not (Repair-Venv $venvPath $py311)) {
            Write-Host "    Recreating venv..." -ForegroundColor Yellow
            Remove-Item $venvPath -Recurse -Force
            & $py311 -m venv venv
        }
    }
    & "venv\Scripts\python.exe" -m pip install --upgrade pip setuptools wheel -q 2>&1 | Out-Null
}
function Install-PyTorch {
    Write-Host "    Installing PyTorch..." -ForegroundColor Gray
    $ErrorActionPreference = "Continue"
    pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124 2>&1 | Out-Null
    $ErrorActionPreference = "Stop"
}
Write-Host "[1/8] Checking dependencies..." -ForegroundColor Green
$missing = @()
if (-not (Test-Command "git")) { $missing += "git" }
if (-not (Test-Command "go")) { $missing += "golang" }
if (-not (Test-Command "node")) { $missing += "nodejs-lts" }
$py311 = Find-Python311
if (-not $py311) { $missing += "python311" }
if ($missing.Count -gt 0) {
    Install-Chocolatey
    foreach ($pkg in $missing) {
        Install-ChocoPkg $pkg
    }
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    if (-not $py311) {
        $py311 = Find-Python311
        if (-not $py311) {
            Write-Host "[ERROR] Python 3.11 not found after installation" -ForegroundColor Red
            Write-Host "    Please install Python 3.11 manually from https://www.python.org/downloads/release/python-3119/" -ForegroundColor Yellow
            exit 1
        }
    }
}
$pythonVersion = & $py311 --version 2>&1
Write-Host "[OK] Python 3.11: $pythonVersion" -ForegroundColor Gray
$gitVersion = git --version 2>&1
Write-Host "[OK] Git: $gitVersion" -ForegroundColor Gray
$goVersion = go version 2>&1
Write-Host "[OK] Go: $goVersion" -ForegroundColor Gray
$nodeVersion = node --version 2>&1
Write-Host "[OK] Node.js: $nodeVersion" -ForegroundColor Gray
if (-not (Test-Command "wails")) {
    Write-Host "[*] Installing Wails CLI..." -ForegroundColor Yellow
    go install github.com/wailsapp/wails/v2/cmd/wails@latest
    $env:Path = $env:Path + ";" + (Join-Path $env:GOPATH "bin") + ";" + (Join-Path $env:USERPROFILE "go\bin")
}
Write-Host ""
Write-Host "[2/8] Setting up ComfyUI + FLUX..." -ForegroundColor Green
$comfyDir = Join-Path $HELPER_DIR "comfyui"
if (-not (Test-Path $comfyDir)) {
    git clone https://github.com/comfyanonymous/ComfyUI.git $comfyDir
}
Setup-Venv $comfyDir $py311
& "venv\Scripts\activate.ps1"
Install-PyTorch
Write-Host "    Installing requirements..." -ForegroundColor Gray
pip install -r requirements.txt -q
if (-not (Test-Path "models\checkpoints")) { New-Item -ItemType Directory -Path "models\checkpoints" -Force | Out-Null }
$fluxModel = "models\checkpoints\flux1-dev-fp8.safetensors"
if (-not (Test-Path $fluxModel)) {
    Write-Host "    Installing huggingface-cli..." -ForegroundColor Gray
    pip install huggingface_hub -q
    Write-Host "    Downloading FLUX model (~17GB, please wait)..." -ForegroundColor Yellow
    $ErrorActionPreference = "Continue"
    hf download Comfy-Org/flux1-dev flux1-dev-fp8.safetensors --local-dir models\checkpoints --local-dir-use-symlinks False
    $ErrorActionPreference = "Stop"
} else {
    Write-Host "[OK] FLUX model already exists" -ForegroundColor Gray
}
deactivate
Write-Host ""
Write-Host "[3/8] Setting up Hunyuan3D-2.0..." -ForegroundColor Green
$hunyuan3dDir = Join-Path $HELPER_DIR "hunyuan3d"
if (-not (Test-Path $hunyuan3dDir)) {
    git clone https://github.com/Tencent/Hunyuan3D-2.git $hunyuan3dDir
}
Setup-Venv $hunyuan3dDir $py311
& "venv\Scripts\activate.ps1"
Install-PyTorch
Write-Host "    Installing requirements..." -ForegroundColor Gray
$ErrorActionPreference = "Continue"
pip install -r requirements.txt -q 2>&1 | Out-Null
$ErrorActionPreference = "Stop"
pip install gradio -q
deactivate
Write-Host ""
Write-Host "[4/8] Setting up UniRig..." -ForegroundColor Green
$unirigDir = Join-Path $HELPER_DIR "unirig"
if (-not (Test-Path $unirigDir)) {
    git clone https://github.com/VAST-AI-Research/UniRig.git $unirigDir
}
Setup-Venv $unirigDir $py311
& "venv\Scripts\activate.ps1"
Install-PyTorch
Write-Host "    Installing requirements..." -ForegroundColor Gray
if (Test-Path "requirements.txt") {
    $ErrorActionPreference = "Continue"
    pip install -r requirements.txt -q 2>&1 | Out-Null
    $ErrorActionPreference = "Stop"
}
pip install trimesh numpy scipy -q
deactivate
Write-Host ""
Write-Host "[5/8] Setting up HY-Motion-1.0..." -ForegroundColor Green
$motionDir = Join-Path $HELPER_DIR "hy-motion"
if (-not (Test-Path $motionDir)) {
    git clone https://github.com/Tencent-Hunyuan/HY-Motion-1.0.git $motionDir
}
Setup-Venv $motionDir $py311
& "venv\Scripts\activate.ps1"
Install-PyTorch
Write-Host "    Installing build dependencies..." -ForegroundColor Gray
pip install PyYAML Cython numpy -q
pip install "huggingface-hub>=0.30.0,<1.0" -q
Write-Host "    Installing requirements..." -ForegroundColor Gray
if (Test-Path "requirements.txt") {
    $ErrorActionPreference = "Continue"
    pip install -r requirements.txt -q 2>&1 | Out-Null
    $ErrorActionPreference = "Stop"
}
pip install gradio -q
deactivate
Write-Host ""
Write-Host "[6/8] Setting up Stable Audio Open..." -ForegroundColor Green
$audioDir = Join-Path $HELPER_DIR "stable-audio"
if (-not (Test-Path $audioDir)) {
    git clone https://github.com/Stability-AI/stable-audio-tools.git $audioDir
}
Setup-Venv $audioDir $py311
& "venv\Scripts\activate.ps1"
Install-PyTorch
Write-Host "    Installing package..." -ForegroundColor Gray
$ErrorActionPreference = "Continue"
pip install -e . -q 2>&1 | Out-Null
$ErrorActionPreference = "Stop"
pip install gradio -q
deactivate
Write-Host ""
Write-Host "[7/8] Setting up Chatterbox..." -ForegroundColor Green
$voiceDir = Join-Path $HELPER_DIR "chatterbox"
if (-not (Test-Path $voiceDir)) {
    git clone https://github.com/resemble-ai/chatterbox.git $voiceDir
}
Setup-Venv $voiceDir $py311
& "venv\Scripts\activate.ps1"
Install-PyTorch
Write-Host "    Installing chatterbox-tts..." -ForegroundColor Gray
$ErrorActionPreference = "Continue"
pip install chatterbox-tts -q 2>&1 | Out-Null
$ErrorActionPreference = "Stop"
pip install gradio -q
deactivate
Write-Host ""
Write-Host "[8/8] Setting up output directories..." -ForegroundColor Green
$outputDir = Join-Path $HELPER_DIR "output"
$dirs = @("images", "models", "audio", "voice")
foreach ($d in $dirs) {
    $p = Join-Path $outputDir $d
    if (-not (Test-Path $p)) {
        New-Item -ItemType Directory -Path $p -Force | Out-Null
    }
}
Set-Location $HELPER_DIR
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Deployment Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next step:" -ForegroundColor Yellow
Write-Host "Run: .\run.ps1" -ForegroundColor White
Write-Host "Build: .\run.ps1 -b" -ForegroundColor White
Write-Host ""

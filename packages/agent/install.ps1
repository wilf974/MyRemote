# MyRemote Agent Installation Script for Windows
# Run as Administrator: powershell -ExecutionPolicy Bypass -File install.ps1

param(
    [string]$ServerUrl = "http://localhost:3001",
    [string]$EnrollmentToken = ""
)

$ErrorActionPreference = "Stop"

# Check if running as administrator
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsRole]::Administrator)

if (-not $isAdmin) {
    Write-Error "This script must be run as Administrator!"
    exit 1
}

Write-Host "MyRemote Agent Installation" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$InstallDir = "C:\Program Files\MyRemote"
$ConfigDir = "C:\ProgramData\MyRemote"
$ConfigFile = "$ConfigDir\config.toml"
$ServiceName = "MyRemoteAgent"

# Check if service already exists
$existingService = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existingService) {
    Write-Host "MyRemote Agent service already exists. Uninstalling..." -ForegroundColor Yellow
    if ($existingService.Status -eq "Running") {
        Stop-Service -Name $ServiceName -Force
    }
    sc.exe delete $ServiceName
    Start-Sleep -Seconds 2
}

# Create directories
Write-Host "Creating directories..." -ForegroundColor Green
if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}
if (-not (Test-Path $ConfigDir)) {
    New-Item -ItemType Directory -Path $ConfigDir -Force | Out-Null
}

# Copy executable
Write-Host "Copying executable..." -ForegroundColor Green
$ExePath = Join-Path $PSScriptRoot "target\release\myremote-agent.exe"
if (-not (Test-Path $ExePath)) {
    Write-Error "Executable not found at: $ExePath"
    Write-Host "Please build the agent first: cargo build --release"
    exit 1
}

Copy-Item -Path $ExePath -Destination "$InstallDir\myremote-agent.exe" -Force

# Create configuration file
Write-Host "Creating configuration..." -ForegroundColor Green

$configContent = @"
server_url = "$ServerUrl"
enrollment_token = "$EnrollmentToken"
heartbeat_interval = 30
log_level = "info"
cert_path = "$ConfigDir\agent_cert.pem"
"@

Set-Content -Path $ConfigFile -Value $configContent -Force

# Install service
Write-Host "Installing Windows service..." -ForegroundColor Green
& "$InstallDir\myremote-agent.exe" install

if ($LASTEXITCODE -ne 0) {
    # If the install command doesn't work, use sc.exe directly
    sc.exe create $ServiceName binPath= "`"$InstallDir\myremote-agent.exe`"" start= auto DisplayName= "MyRemote Agent"
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to install service"
        exit 1
    }
}

# Set service description
sc.exe description $ServiceName "MyRemote secure remote support agent"

Write-Host ""
Write-Host "Installation completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Edit configuration if needed: $ConfigFile" -ForegroundColor White
Write-Host "2. Add enrollment token to config file" -ForegroundColor White
Write-Host "3. Start the service: sc.exe start $ServiceName" -ForegroundColor White
Write-Host ""
Write-Host "Service management commands:" -ForegroundColor Cyan
Write-Host "  Start:   sc.exe start $ServiceName" -ForegroundColor White
Write-Host "  Stop:    sc.exe stop $ServiceName" -ForegroundColor White
Write-Host "  Status:  sc.exe query $ServiceName" -ForegroundColor White
Write-Host "  Logs:    Get-EventLog -LogName Application -Source MyRemoteAgent -Newest 50" -ForegroundColor White
Write-Host ""

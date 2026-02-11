# Script to enable Windows features required for Docker Desktop
# Run this script as Administrator

Write-Host "Enabling Windows features for Docker Desktop..." -ForegroundColor Cyan

# Enable WSL (Windows Subsystem for Linux)
Write-Host "`n1. Enabling WSL..." -ForegroundColor Yellow
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart

# Enable Virtual Machine Platform
Write-Host "`n2. Enabling Virtual Machine Platform..." -ForegroundColor Yellow
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart

# Enable Hyper-V (if available - may require Windows Pro/Enterprise)
Write-Host "`n3. Checking Hyper-V..." -ForegroundColor Yellow
$hyperV = Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V-All
if ($hyperV.State -eq "Disabled") {
    Write-Host "   Hyper-V is disabled. Enabling..." -ForegroundColor Yellow
    Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V-All -All -NoRestart
} else {
    Write-Host "   Hyper-V is already enabled or not available." -ForegroundColor Green
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Features enabled! Please RESTART your computer." -ForegroundColor Green
Write-Host "After restart, Docker Desktop should work." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

# ============================================================================
# HSBC Bot Companion - Native Messaging Host Installer
# ============================================================================
#
# This script sets up the Native Messaging Host for the HSBC Bot Companion
# Chrome extension, enabling it to trigger bank reconciliation.
#
# Usage:
#   .\install.ps1 -ExtensionId "your-chrome-extension-id"
#   .\install.ps1 -Uninstall
#
# Find your extension ID at: chrome://extensions (enable Developer mode)
#
# ============================================================================

param(
    [string]$ExtensionId = "",
    [switch]$Uninstall,
    [switch]$Help
)

$ErrorActionPreference = "Stop"

# === CONFIGURATION ===
$HostName = "com.hsbc.bot.recon"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ManifestPath = Join-Path $ScriptDir "com.hsbc.bot.recon.json"
$HostScriptPath = Join-Path $ScriptDir "recon_host.py"
$BatchWrapperPath = Join-Path $ScriptDir "recon_host.bat"

# Registry path for Chrome native messaging hosts (current user - no admin needed)
$RegistryPath = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\$HostName"

# === HELPER FUNCTIONS ===

function Show-Help {
    Write-Host ""
    Write-Host "HSBC Bot Companion - Native Messaging Host Installer" -ForegroundColor Cyan
    Write-Host "====================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\install.ps1 -ExtensionId `"your-extension-id`"" -ForegroundColor White
    Write-Host "  .\install.ps1 -Uninstall" -ForegroundColor White
    Write-Host "  .\install.ps1 -Help" -ForegroundColor White
    Write-Host ""
    Write-Host "Parameters:" -ForegroundColor Yellow
    Write-Host "  -ExtensionId    Your Chrome extension ID (required for install)" -ForegroundColor Gray
    Write-Host "  -Uninstall      Remove the native messaging host registration" -ForegroundColor Gray
    Write-Host "  -Help           Show this help message" -ForegroundColor Gray
    Write-Host ""
    Write-Host "How to find your extension ID:" -ForegroundColor Yellow
    Write-Host "  1. Open Chrome and go to: chrome://extensions" -ForegroundColor Gray
    Write-Host "  2. Enable 'Developer mode' (toggle in top-right)" -ForegroundColor Gray
    Write-Host "  3. Find 'HSBC Bot Companion' and copy the ID" -ForegroundColor Gray
    Write-Host "     (looks like: abcdefghijklmnopqrstuvwxyz012345)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "After installation:" -ForegroundColor Yellow
    Write-Host "  1. Reload the extension in chrome://extensions" -ForegroundColor Gray
    Write-Host "  2. Refresh any open HSBCnet tabs" -ForegroundColor Gray
    Write-Host "  3. Run an export - the completion modal will show 'Run Reconciliation' button" -ForegroundColor Gray
    Write-Host ""
}

function Test-PythonInstalled {
    try {
        $pythonPath = (Get-Command python -ErrorAction Stop).Source
        return $pythonPath
    }
    catch {
        return $null
    }
}

function Install-NativeHost {
    Write-Host ""
    Write-Host "Installing HSBC Bot Native Messaging Host..." -ForegroundColor Cyan
    Write-Host "=============================================" -ForegroundColor Cyan
    Write-Host ""

    # Validate extension ID
    if ([string]::IsNullOrWhiteSpace($ExtensionId)) {
        Write-Host "ERROR: Extension ID is required for installation" -ForegroundColor Red
        Write-Host ""
        Write-Host "Usage: .\install.ps1 -ExtensionId `"your-extension-id`"" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Find your extension ID at chrome://extensions (enable Developer mode)" -ForegroundColor Gray
        exit 1
    }

    # Validate extension ID format (32 lowercase letters)
    if ($ExtensionId -notmatch "^[a-z]{32}$") {
        Write-Host "WARNING: Extension ID format looks unusual" -ForegroundColor Yellow
        Write-Host "  Expected: 32 lowercase letters (e.g., abcdefghijklmnopqrstuvwxyz012345)" -ForegroundColor Gray
        Write-Host "  Got: $ExtensionId" -ForegroundColor Gray
        Write-Host ""
        $confirm = Read-Host "Continue anyway? (y/N)"
        if ($confirm -ne "y" -and $confirm -ne "Y") {
            Write-Host "Installation cancelled." -ForegroundColor Yellow
            exit 0
        }
    }

    # Check Python
    $PythonPath = Test-PythonInstalled
    if (-not $PythonPath) {
        Write-Host "ERROR: Python not found in PATH" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please install Python and ensure it's in your PATH:" -ForegroundColor Yellow
        Write-Host "  https://www.python.org/downloads/" -ForegroundColor Gray
        exit 1
    }
    Write-Host "[OK] Python found: $PythonPath" -ForegroundColor Green

    # Check host script exists
    if (-not (Test-Path $HostScriptPath)) {
        Write-Host "ERROR: Host script not found: $HostScriptPath" -ForegroundColor Red
        exit 1
    }
    Write-Host "[OK] Host script: $HostScriptPath" -ForegroundColor Green

    # Create batch wrapper (Windows native messaging requires .bat or .exe, not .py)
    $BatchContent = "@echo off`r`n`"$PythonPath`" `"$HostScriptPath`" %*"
    Set-Content -Path $BatchWrapperPath -Value $BatchContent -Encoding ASCII
    Write-Host "[OK] Batch wrapper created: $BatchWrapperPath" -ForegroundColor Green

    # Create/update manifest with extension ID
    $Manifest = @{
        name = $HostName
        description = "HSBC Bot Companion - Bank Reconciliation Native Host"
        path = $BatchWrapperPath
        type = "stdio"
        allowed_origins = @("chrome-extension://$ExtensionId/")
    }
    $Manifest | ConvertTo-Json -Depth 10 | Set-Content -Path $ManifestPath -Encoding UTF8
    Write-Host "[OK] Manifest updated: $ManifestPath" -ForegroundColor Green

    # Create registry key
    $ParentPath = Split-Path $RegistryPath -Parent
    if (-not (Test-Path $ParentPath)) {
        New-Item -Path $ParentPath -Force | Out-Null
    }
    if (-not (Test-Path $RegistryPath)) {
        New-Item -Path $RegistryPath -Force | Out-Null
    }
    Set-ItemProperty -Path $RegistryPath -Name "(Default)" -Value $ManifestPath
    Write-Host "[OK] Registry key created: $RegistryPath" -ForegroundColor Green

    Write-Host ""
    Write-Host "=============================================" -ForegroundColor Cyan
    Write-Host "Installation complete!" -ForegroundColor Green
    Write-Host "=============================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Go to chrome://extensions" -ForegroundColor White
    Write-Host "  2. Click the reload button on HSBC Bot Companion" -ForegroundColor White
    Write-Host "  3. Refresh any open HSBCnet tabs" -ForegroundColor White
    Write-Host "  4. Run an export - completion modal will have 'Run Reconciliation' button" -ForegroundColor White
    Write-Host ""
}

function Uninstall-NativeHost {
    Write-Host ""
    Write-Host "Uninstalling HSBC Bot Native Messaging Host..." -ForegroundColor Cyan
    Write-Host "===============================================" -ForegroundColor Cyan
    Write-Host ""

    # Remove registry key
    if (Test-Path $RegistryPath) {
        Remove-Item -Path $RegistryPath -Force
        Write-Host "[OK] Registry key removed" -ForegroundColor Green
    }
    else {
        Write-Host "[--] Registry key not found (already removed)" -ForegroundColor Gray
    }

    # Remove batch wrapper
    if (Test-Path $BatchWrapperPath) {
        Remove-Item -Path $BatchWrapperPath -Force
        Write-Host "[OK] Batch wrapper removed" -ForegroundColor Green
    }
    else {
        Write-Host "[--] Batch wrapper not found" -ForegroundColor Gray
    }

    Write-Host ""
    Write-Host "Uninstallation complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Note: Reload the Chrome extension to apply changes." -ForegroundColor Yellow
    Write-Host ""
}

# === MAIN ===

if ($Help) {
    Show-Help
    exit 0
}

if ($Uninstall) {
    Uninstall-NativeHost
}
else {
    Install-NativeHost
}

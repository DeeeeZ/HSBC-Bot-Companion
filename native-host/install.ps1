# ============================================================================
# HSBC Bot Companion - Native Messaging Host Installer
# ============================================================================
#
# This script sets up the Native Messaging Host for the HSBC Bot Companion
# Chrome/Edge extension, enabling it to trigger bank reconciliation.
#
# Usage:
#   Double-click setup.bat for interactive menu
#   Or run from PowerShell:
#     .\install.ps1                    - Interactive menu
#     .\install.ps1 -Status            - Check installation status
#     .\install.ps1 -Uninstall         - Remove installation
#     .\install.ps1 -ExtensionId "id"  - Install with specific ID
#     .\install.ps1 -Help              - Show help
#
# ============================================================================

param(
    [string]$ExtensionId = "",
    [switch]$Uninstall,
    [switch]$Status,
    [switch]$Help
)

$ErrorActionPreference = "Stop"

# === CONFIGURATION ===
$HostName = "com.hsbc.bot.recon"
$ExtensionName = "HSBC Bot Companion"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ManifestPath = Join-Path $ScriptDir "com.hsbc.bot.recon.json"
$HostScriptPath = Join-Path $ScriptDir "recon_host.py"
$BatchWrapperPath = Join-Path $ScriptDir "recon_host.bat"
$ConfigPath = Join-Path $ScriptDir "config.json"

# Default BankRecon paths (used if config not found)
$DefaultBankReconDir = "C:\Users\ASUS\Desktop\Recon Project\Matching Files\BNP"
$DefaultRunAllScript = "BankRecon_Python_Engine\run_all.py"

# Registry paths for native messaging hosts (current user - no admin needed)
$ChromeRegistryPath = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\$HostName"
$EdgeRegistryPath = "HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\$HostName"

# Browser extension paths
$BrowserPaths = @(
    @{ Name = "Chrome"; Path = "$env:LOCALAPPDATA\Google\Chrome\User Data" },
    @{ Name = "Edge"; Path = "$env:LOCALAPPDATA\Microsoft\Edge\User Data" }
)

# === CONFIG FILE FUNCTIONS ===

function Get-Config {
    if (Test-Path $ConfigPath) {
        try {
            $content = Get-Content $ConfigPath -Raw | ConvertFrom-Json
            return @{
                BankReconDir = if ($content.bankrecon_dir) { $content.bankrecon_dir } else { $DefaultBankReconDir }
                RunAllScript = if ($content.run_all_script) { $content.run_all_script } else { $DefaultRunAllScript }
            }
        }
        catch {
            return @{
                BankReconDir = $DefaultBankReconDir
                RunAllScript = $DefaultRunAllScript
            }
        }
    }
    return @{
        BankReconDir = $DefaultBankReconDir
        RunAllScript = $DefaultRunAllScript
    }
}

function Save-Config {
    param(
        [string]$BankReconDir,
        [string]$RunAllScript = $DefaultRunAllScript
    )
    $config = @{
        bankrecon_dir = $BankReconDir
        run_all_script = $RunAllScript
    }
    $config | ConvertTo-Json -Depth 10 | Set-Content -Path $ConfigPath -Encoding UTF8
}

function Test-BankReconPath {
    param([string]$BankReconDir)
    $config = Get-Config
    $runAllScript = $config.RunAllScript
    $fullPath = Join-Path $BankReconDir $runAllScript
    return Test-Path $fullPath
}

# === HELPER FUNCTIONS ===

function Write-ColorLine {
    param(
        [string]$Text,
        [string]$Color = "White",
        [switch]$NoNewline
    )
    if ($NoNewline) {
        Write-Host $Text -ForegroundColor $Color -NoNewline
    } else {
        Write-Host $Text -ForegroundColor $Color
    }
}

function Show-Banner {
    Write-Host ""
    Write-ColorLine "=============================================" "Cyan"
    Write-ColorLine "   HSBC Bot Companion - Native Host Setup" "Cyan"
    Write-ColorLine "=============================================" "Cyan"
    Write-Host ""
}

function Show-Help {
    Show-Banner
    Write-ColorLine "Usage:" "Yellow"
    Write-Host "  .\install.ps1                    - Interactive menu"
    Write-Host "  .\install.ps1 -Status            - Check installation status"
    Write-Host "  .\install.ps1 -Uninstall         - Remove installation"
    Write-Host "  .\install.ps1 -ExtensionId `"id`" - Install with specific ID"
    Write-Host "  .\install.ps1 -Help              - Show this help"
    Write-Host ""
    Write-ColorLine "How to find your extension ID:" "Yellow"
    Write-Host "  1. Open Chrome/Edge and go to: chrome://extensions or edge://extensions"
    Write-Host "  2. Enable 'Developer mode' (toggle in top-right)"
    Write-Host "  3. Find 'HSBC Bot Companion' and copy the ID"
    Write-Host "     (looks like: abcdefghijklmnopqrstuvwxyz012345)"
    Write-Host ""
    Write-ColorLine "After installation:" "Yellow"
    Write-Host "  1. Reload the extension in chrome://extensions or edge://extensions"
    Write-Host "  2. Refresh any open HSBCnet tabs"
    Write-Host "  3. Run an export - the completion modal will show 'Run Reconciliation' button"
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

function Get-CurrentExtensionId {
    # Try to read from existing manifest
    if (Test-Path $ManifestPath) {
        try {
            $content = Get-Content $ManifestPath -Raw | ConvertFrom-Json
            if ($content.allowed_origins -and $content.allowed_origins.Count -gt 0) {
                $origin = $content.allowed_origins[0]
                if ($origin -match "chrome-extension://([a-z]{32})/") {
                    return $matches[1]
                }
            }
        }
        catch {
            # Ignore parse errors
        }
    }
    return $null
}

function Find-ExtensionInBrowser {
    param([string]$BrowserName, [string]$BrowserPath)

    $results = @()

    if (-not (Test-Path $BrowserPath)) {
        return $results
    }

    # Find all profile directories
    $profiles = @("Default") + (Get-ChildItem -Path $BrowserPath -Directory -Filter "Profile *" -ErrorAction SilentlyContinue | ForEach-Object { $_.Name })

    foreach ($profile in $profiles) {
        $extensionsPath = Join-Path $BrowserPath "$profile\Extensions"
        if (-not (Test-Path $extensionsPath)) {
            continue
        }

        # Scan each extension folder
        $extensionFolders = Get-ChildItem -Path $extensionsPath -Directory -ErrorAction SilentlyContinue
        foreach ($extFolder in $extensionFolders) {
            # Get the latest version folder
            $versionFolders = Get-ChildItem -Path $extFolder.FullName -Directory -ErrorAction SilentlyContinue | Sort-Object Name -Descending
            foreach ($versionFolder in $versionFolders) {
                $manifestFile = Join-Path $versionFolder.FullName "manifest.json"
                if (Test-Path $manifestFile) {
                    try {
                        $manifest = Get-Content $manifestFile -Raw | ConvertFrom-Json
                        if ($manifest.name -eq $ExtensionName) {
                            $results += @{
                                Browser = $BrowserName
                                Profile = $profile
                                ExtensionId = $extFolder.Name
                                Version = $manifest.version
                                Path = $versionFolder.FullName
                            }
                            break  # Found in this extension folder, move to next
                        }
                    }
                    catch {
                        # Ignore parse errors
                    }
                }
            }
        }
    }

    return $results
}

function Get-AutoDetectedExtensionId {
    Write-Host ""
    Write-ColorLine "Auto-detecting extension ID..." "Cyan"
    Write-Host ""

    # First check existing manifest
    $existingId = Get-CurrentExtensionId
    if ($existingId) {
        Write-Host "  Found in existing manifest: " -NoNewline
        Write-ColorLine $existingId "Green"
        return $existingId
    }

    # Scan browsers
    $allResults = @()
    foreach ($browser in $BrowserPaths) {
        Write-Host "  Scanning $($browser.Name)... " -NoNewline
        $results = Find-ExtensionInBrowser -BrowserName $browser.Name -BrowserPath $browser.Path
        if ($results.Count -gt 0) {
            Write-ColorLine "Found $($results.Count)" "Green"
            $allResults += $results
        } else {
            Write-ColorLine "Not found" "Gray"
        }
    }

    if ($allResults.Count -eq 0) {
        Write-Host ""
        Write-ColorLine "  Extension not found in any browser." "Yellow"
        Write-Host "  Make sure HSBC Bot Companion is installed in Chrome or Edge."
        Write-Host ""
        return $null
    }

    if ($allResults.Count -eq 1) {
        $result = $allResults[0]
        Write-Host ""
        Write-Host "  Found: $($result.Browser) / $($result.Profile)"
        Write-Host "  Extension ID: " -NoNewline
        Write-ColorLine $result.ExtensionId "Green"
        return $result.ExtensionId
    }

    # Multiple results - ask user to choose
    Write-Host ""
    Write-ColorLine "  Multiple installations found:" "Yellow"
    Write-Host ""
    for ($i = 0; $i -lt $allResults.Count; $i++) {
        $r = $allResults[$i]
        Write-Host "    [$($i + 1)] $($r.Browser) / $($r.Profile) - v$($r.Version)"
        Write-Host "        ID: $($r.ExtensionId)"
    }
    Write-Host ""

    do {
        $choice = Read-Host "  Select installation [1-$($allResults.Count)]"
        $index = [int]$choice - 1
    } while ($index -lt 0 -or $index -ge $allResults.Count)

    return $allResults[$index].ExtensionId
}

function Show-Status {
    Show-Banner
    Write-ColorLine "Installation Status" "Yellow"
    Write-Host ""

    # Python
    $pythonPath = Test-PythonInstalled
    if ($pythonPath) {
        Write-Host "  [" -NoNewline
        Write-ColorLine "OK" "Green" -NoNewline
        Write-Host "] Python: $pythonPath"
    } else {
        Write-Host "  [" -NoNewline
        Write-ColorLine "!!" "Red" -NoNewline
        Write-Host "] Python: NOT FOUND"
    }

    # Host script
    if (Test-Path $HostScriptPath) {
        Write-Host "  [" -NoNewline
        Write-ColorLine "OK" "Green" -NoNewline
        Write-Host "] Host script: $HostScriptPath"
    } else {
        Write-Host "  [" -NoNewline
        Write-ColorLine "!!" "Red" -NoNewline
        Write-Host "] Host script: NOT FOUND"
    }

    # Batch wrapper
    if (Test-Path $BatchWrapperPath) {
        Write-Host "  [" -NoNewline
        Write-ColorLine "OK" "Green" -NoNewline
        Write-Host "] Batch wrapper: $BatchWrapperPath"
    } else {
        Write-Host "  [" -NoNewline
        Write-ColorLine "--" "Gray" -NoNewline
        Write-Host "] Batch wrapper: Not created"
    }

    # Chrome registry
    if (Test-Path $ChromeRegistryPath) {
        Write-Host "  [" -NoNewline
        Write-ColorLine "OK" "Green" -NoNewline
        Write-Host "] Chrome registry: Registered"
    } else {
        Write-Host "  [" -NoNewline
        Write-ColorLine "--" "Gray" -NoNewline
        Write-Host "] Chrome registry: Not registered"
    }

    # Edge registry
    if (Test-Path $EdgeRegistryPath) {
        Write-Host "  [" -NoNewline
        Write-ColorLine "OK" "Green" -NoNewline
        Write-Host "] Edge registry: Registered"
    } else {
        Write-Host "  [" -NoNewline
        Write-ColorLine "--" "Gray" -NoNewline
        Write-Host "] Edge registry: Not registered"
    }

    # Extension ID
    $extId = Get-CurrentExtensionId
    if ($extId) {
        Write-Host "  [" -NoNewline
        Write-ColorLine "OK" "Green" -NoNewline
        Write-Host "] Extension ID: $extId"
    } else {
        Write-Host "  [" -NoNewline
        Write-ColorLine "--" "Gray" -NoNewline
        Write-Host "] Extension ID: Not configured"
    }

    Write-Host ""
    Write-ColorLine "BankRecon Configuration" "Yellow"
    Write-Host ""

    # Config file
    if (Test-Path $ConfigPath) {
        Write-Host "  [" -NoNewline
        Write-ColorLine "OK" "Green" -NoNewline
        Write-Host "] Config file: $ConfigPath"
    } else {
        Write-Host "  [" -NoNewline
        Write-ColorLine "--" "Gray" -NoNewline
        Write-Host "] Config file: Not found (using defaults)"
    }

    # BankRecon path
    $config = Get-Config
    $bankReconOk = Test-Path $config.BankReconDir
    if ($bankReconOk) {
        Write-Host "  [" -NoNewline
        Write-ColorLine "OK" "Green" -NoNewline
        Write-Host "] BankRecon dir: $($config.BankReconDir)"
    } else {
        Write-Host "  [" -NoNewline
        Write-ColorLine "!!" "Red" -NoNewline
        Write-Host "] BankRecon dir: NOT FOUND - $($config.BankReconDir)"
    }

    # run_all.py
    $runAllPath = Join-Path $config.BankReconDir $config.RunAllScript
    $runAllOk = Test-Path $runAllPath
    if ($runAllOk) {
        Write-Host "  [" -NoNewline
        Write-ColorLine "OK" "Green" -NoNewline
        Write-Host "] run_all.py: Found"
    } else {
        Write-Host "  [" -NoNewline
        Write-ColorLine "!!" "Red" -NoNewline
        Write-Host "] run_all.py: NOT FOUND at $runAllPath"
    }

    Write-Host ""

    # Overall status
    $chromeOk = Test-Path $ChromeRegistryPath
    $edgeOk = Test-Path $EdgeRegistryPath
    if ($chromeOk -or $edgeOk) {
        Write-ColorLine "Status: INSTALLED" "Green"
        if ($chromeOk -and $edgeOk) {
            Write-Host "  Native host is registered for both Chrome and Edge."
        } elseif ($chromeOk) {
            Write-Host "  Native host is registered for Chrome only."
        } else {
            Write-Host "  Native host is registered for Edge only."
        }
    } else {
        Write-ColorLine "Status: NOT INSTALLED" "Yellow"
        Write-Host "  Run the installer to set up the native messaging host."
    }
    Write-Host ""
}

function Configure-BankReconPath {
    param([switch]$Silent)

    if (-not $Silent) {
        Write-Host ""
        Write-ColorLine "Configure BankRecon Path" "Cyan"
        Write-Host ""
    }

    $config = Get-Config
    $currentPath = $config.BankReconDir

    Write-Host "  Current path: " -NoNewline
    if (Test-Path $currentPath) {
        Write-ColorLine $currentPath "Green"
    } else {
        Write-ColorLine "$currentPath (NOT FOUND)" "Yellow"
    }
    Write-Host ""

    $newPath = Read-Host "  Enter BankRecon directory (or press Enter to keep current)"

    if ([string]::IsNullOrWhiteSpace($newPath)) {
        $newPath = $currentPath
    }

    # Validate the path
    if (-not (Test-Path $newPath)) {
        Write-Host ""
        Write-ColorLine "  WARNING: Directory does not exist: $newPath" "Yellow"
        $create = Read-Host "  Use this path anyway? (y/N)"
        if ($create -ne "y" -and $create -ne "Y") {
            Write-ColorLine "  Path not changed." "Gray"
            return $currentPath
        }
    }

    # Check for run_all.py
    $runAllPath = Join-Path $newPath $config.RunAllScript
    if (Test-Path $runAllPath) {
        Write-Host "  [" -NoNewline
        Write-ColorLine "OK" "Green" -NoNewline
        Write-Host "] Found run_all.py"
    } else {
        Write-Host ""
        Write-ColorLine "  WARNING: run_all.py not found at expected location:" "Yellow"
        Write-Host "           $runAllPath"
        $proceed = Read-Host "  Continue anyway? (y/N)"
        if ($proceed -ne "y" -and $proceed -ne "Y") {
            Write-ColorLine "  Path not changed." "Gray"
            return $currentPath
        }
    }

    # Save the config
    Save-Config -BankReconDir $newPath -RunAllScript $config.RunAllScript
    Write-Host ""
    Write-Host "  [" -NoNewline
    Write-ColorLine "OK" "Green" -NoNewline
    Write-Host "] Config saved: $ConfigPath"

    return $newPath
}

function Install-NativeHost {
    param(
        [string]$Id,
        [switch]$SkipPathPrompt
    )

    Show-Banner
    Write-ColorLine "Installing Native Messaging Host..." "Cyan"
    Write-Host ""

    # Validate extension ID
    if ([string]::IsNullOrWhiteSpace($Id)) {
        Write-ColorLine "ERROR: Extension ID is required" "Red"
        Write-Host ""
        Write-Host "Use -ExtensionId parameter or run without arguments for auto-detection."
        return $false
    }

    # Validate extension ID format (32 lowercase letters)
    if ($Id -notmatch "^[a-z]{32}$") {
        Write-ColorLine "WARNING: Extension ID format looks unusual" "Yellow"
        Write-Host "  Expected: 32 lowercase letters"
        Write-Host "  Got: $Id"
        Write-Host ""
        $confirm = Read-Host "Continue anyway? (y/N)"
        if ($confirm -ne "y" -and $confirm -ne "Y") {
            Write-ColorLine "Installation cancelled." "Yellow"
            return $false
        }
    }

    # Check Python
    $PythonPath = Test-PythonInstalled
    if (-not $PythonPath) {
        Write-ColorLine "ERROR: Python not found in PATH" "Red"
        Write-Host ""
        Write-Host "Please install Python and ensure it's in your PATH:"
        Write-Host "  https://www.python.org/downloads/"
        return $false
    }
    Write-Host "  [" -NoNewline
    Write-ColorLine "OK" "Green" -NoNewline
    Write-Host "] Python: $PythonPath"

    # Check host script exists
    if (-not (Test-Path $HostScriptPath)) {
        Write-ColorLine "ERROR: Host script not found: $HostScriptPath" "Red"
        return $false
    }
    Write-Host "  [" -NoNewline
    Write-ColorLine "OK" "Green" -NoNewline
    Write-Host "] Host script found"

    # Configure BankRecon path (unless skipped)
    if (-not $SkipPathPrompt) {
        Write-Host ""
        Write-ColorLine "BankRecon Configuration" "Cyan"

        $config = Get-Config
        $runAllPath = Join-Path $config.BankReconDir $config.RunAllScript

        if (Test-Path $runAllPath) {
            Write-Host "  Current BankRecon path: " -NoNewline
            Write-ColorLine $config.BankReconDir "Green"
            Write-Host "  run_all.py: " -NoNewline
            Write-ColorLine "Found" "Green"
            Write-Host ""
            $change = Read-Host "  Change BankRecon path? (y/N)"
            if ($change -eq "y" -or $change -eq "Y") {
                Configure-BankReconPath -Silent | Out-Null
            }
        } else {
            Write-Host "  BankRecon path needs configuration."
            Configure-BankReconPath -Silent | Out-Null
        }
        Write-Host ""
    }

    # Create batch wrapper (Windows native messaging requires .bat or .exe, not .py)
    $BatchContent = "@echo off`r`n`"$PythonPath`" `"$HostScriptPath`" %*"
    Set-Content -Path $BatchWrapperPath -Value $BatchContent -Encoding ASCII
    Write-Host "  [" -NoNewline
    Write-ColorLine "OK" "Green" -NoNewline
    Write-Host "] Batch wrapper created"

    # Create/update manifest with extension ID
    $Manifest = @{
        name = $HostName
        description = "HSBC Bot Companion - Bank Reconciliation Native Host"
        path = $BatchWrapperPath
        type = "stdio"
        allowed_origins = @("chrome-extension://$Id/")
    }
    $Manifest | ConvertTo-Json -Depth 10 | Set-Content -Path $ManifestPath -Encoding UTF8
    Write-Host "  [" -NoNewline
    Write-ColorLine "OK" "Green" -NoNewline
    Write-Host "] Manifest updated"

    # Register for Chrome
    $ChromeParentPath = Split-Path $ChromeRegistryPath -Parent
    if (-not (Test-Path $ChromeParentPath)) {
        New-Item -Path $ChromeParentPath -Force | Out-Null
    }
    if (-not (Test-Path $ChromeRegistryPath)) {
        New-Item -Path $ChromeRegistryPath -Force | Out-Null
    }
    Set-ItemProperty -Path $ChromeRegistryPath -Name "(Default)" -Value $ManifestPath
    Write-Host "  [" -NoNewline
    Write-ColorLine "OK" "Green" -NoNewline
    Write-Host "] Chrome registry created"

    # Register for Edge
    $EdgeParentPath = Split-Path $EdgeRegistryPath -Parent
    if (-not (Test-Path $EdgeParentPath)) {
        New-Item -Path $EdgeParentPath -Force | Out-Null
    }
    if (-not (Test-Path $EdgeRegistryPath)) {
        New-Item -Path $EdgeRegistryPath -Force | Out-Null
    }
    Set-ItemProperty -Path $EdgeRegistryPath -Name "(Default)" -Value $ManifestPath
    Write-Host "  [" -NoNewline
    Write-ColorLine "OK" "Green" -NoNewline
    Write-Host "] Edge registry created"

    Write-Host ""
    Write-ColorLine "=============================================" "Cyan"
    Write-ColorLine "Installation complete!" "Green"
    Write-ColorLine "=============================================" "Cyan"
    Write-Host ""
    Write-ColorLine "Next steps:" "Yellow"
    Write-Host "  1. Reload the extension in chrome://extensions or edge://extensions"
    Write-Host "  2. Refresh any open HSBCnet tabs"
    Write-Host "  3. Run an export - completion modal will have 'Run Reconciliation' button"
    Write-Host ""

    return $true
}

function Uninstall-NativeHost {
    Show-Banner
    Write-ColorLine "Uninstalling Native Messaging Host..." "Cyan"
    Write-Host ""

    # Remove Chrome registry key
    if (Test-Path $ChromeRegistryPath) {
        Remove-Item -Path $ChromeRegistryPath -Force
        Write-Host "  [" -NoNewline
        Write-ColorLine "OK" "Green" -NoNewline
        Write-Host "] Chrome registry removed"
    } else {
        Write-Host "  [" -NoNewline
        Write-ColorLine "--" "Gray" -NoNewline
        Write-Host "] Chrome registry not found (already removed)"
    }

    # Remove Edge registry key
    if (Test-Path $EdgeRegistryPath) {
        Remove-Item -Path $EdgeRegistryPath -Force
        Write-Host "  [" -NoNewline
        Write-ColorLine "OK" "Green" -NoNewline
        Write-Host "] Edge registry removed"
    } else {
        Write-Host "  [" -NoNewline
        Write-ColorLine "--" "Gray" -NoNewline
        Write-Host "] Edge registry not found (already removed)"
    }

    # Remove batch wrapper
    if (Test-Path $BatchWrapperPath) {
        Remove-Item -Path $BatchWrapperPath -Force
        Write-Host "  [" -NoNewline
        Write-ColorLine "OK" "Green" -NoNewline
        Write-Host "] Batch wrapper removed"
    } else {
        Write-Host "  [" -NoNewline
        Write-ColorLine "--" "Gray" -NoNewline
        Write-Host "] Batch wrapper not found"
    }

    Write-Host ""
    Write-ColorLine "Uninstallation complete!" "Green"
    Write-Host ""
    Write-Host "Note: Reload the Chrome/Edge extension to apply changes."
    Write-Host ""
}

function Show-Menu {
    while ($true) {
        Clear-Host
        Show-Banner

        # Quick status indicators
        $chromeOk = Test-Path $ChromeRegistryPath
        $edgeOk = Test-Path $EdgeRegistryPath
        $installed = $chromeOk -or $edgeOk

        if ($installed) {
            Write-Host "  Status: " -NoNewline
            Write-ColorLine "INSTALLED" "Green"
        } else {
            Write-Host "  Status: " -NoNewline
            Write-ColorLine "NOT INSTALLED" "Yellow"
        }

        # Show BankRecon path status
        $config = Get-Config
        $runAllPath = Join-Path $config.BankReconDir $config.RunAllScript
        if (Test-Path $runAllPath) {
            Write-Host "  BankRecon: " -NoNewline
            Write-ColorLine "Configured" "Green"
        } else {
            Write-Host "  BankRecon: " -NoNewline
            Write-ColorLine "Not configured" "Yellow"
        }
        Write-Host ""

        Write-ColorLine "  [1] Install (auto-detect extension ID)" "White"
        Write-ColorLine "  [2] Uninstall" "White"
        Write-ColorLine "  [3] Check Status" "White"
        Write-ColorLine "  [4] Configure Paths" "White"
        Write-ColorLine "  [5] Help" "White"
        Write-ColorLine "  [0] Exit" "Gray"
        Write-Host ""

        $choice = Read-Host "  Select option"

        switch ($choice) {
            "1" {
                $detectedId = Get-AutoDetectedExtensionId
                if ($detectedId) {
                    Write-Host ""
                    $confirm = Read-Host "  Proceed with installation? (Y/n)"
                    if ($confirm -eq "" -or $confirm -eq "y" -or $confirm -eq "Y") {
                        Install-NativeHost -Id $detectedId
                    }
                } else {
                    Write-Host ""
                    $manualId = Read-Host "  Enter extension ID manually (or press Enter to cancel)"
                    if ($manualId) {
                        Install-NativeHost -Id $manualId
                    }
                }
                Write-Host ""
                Read-Host "  Press Enter to continue"
            }
            "2" {
                Uninstall-NativeHost
                Write-Host ""
                Read-Host "  Press Enter to continue"
            }
            "3" {
                Show-Status
                Write-Host ""
                Read-Host "  Press Enter to continue"
            }
            "4" {
                Configure-BankReconPath
                Write-Host ""
                Read-Host "  Press Enter to continue"
            }
            "5" {
                Show-Help
                Write-Host ""
                Read-Host "  Press Enter to continue"
            }
            "0" {
                Write-Host ""
                return
            }
            default {
                # Invalid input, just loop
            }
        }
    }
}

# === MAIN ===

# Handle command-line arguments
if ($Help) {
    Show-Help
    exit 0
}

if ($Status) {
    Show-Status
    exit 0
}

if ($Uninstall) {
    Uninstall-NativeHost
    exit 0
}

# If extension ID provided, install directly
if (-not [string]::IsNullOrWhiteSpace($ExtensionId)) {
    $result = Install-NativeHost -Id $ExtensionId
    if ($result) { exit 0 } else { exit 1 }
}

# No arguments - show interactive menu
Show-Menu

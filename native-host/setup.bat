@echo off
:: ============================================================================
:: HSBC Bot Companion - Native Host Setup
:: ============================================================================
:: Double-click this file to run the installer with an interactive menu.
:: Or run from command line with arguments:
::   setup.bat              - Interactive menu
::   setup.bat -Status      - Check installation status
::   setup.bat -Uninstall   - Remove installation
::   setup.bat -Help        - Show help
:: ============================================================================

:: Change to script directory
cd /d "%~dp0"

:: Run PowerShell with execution policy bypass
powershell -ExecutionPolicy Bypass -NoProfile -File "install.ps1" %*

:: Pause to show results (only if double-clicked, not if run from cmd)
echo.
echo Press any key to close...
pause >nul

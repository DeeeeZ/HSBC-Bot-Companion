# HSBC Bot Companion

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-green)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![RPA Ready](https://img.shields.io/badge/RPA-Ready-orange)](https://github.com)

A powerful Chrome extension to automate workflows on the HSBCnet banking portal. Designed for both human users and RPA bot integration with intelligent features for batch processing, smart date handling, and export tracking.

---

## Features

### 1. Export All Accounts with Smart Controls
**Batch export all accounts with unprecedented control and visibility**

- **Selective Export**: Checkbox on each account row - export only what you need
  - Select All / Deselect All toggle in the header
  - Dynamic button label shows "Export Selected (X)" count
  - Smart filtering to process only checked accounts

- **Date Presets Modal**: One-click date range selection
  - Yesterday
  - Last 7 Days
  - Last Month
  - Month to Date
  - Custom date range picker

- **Live Progress Bar**: Real-time visual feedback at top of screen
  - Shows "Exporting... 34/106" with progress percentage
  - Animated progress bar
  - Cancel button to stop batch processing mid-operation

- **Automatic Loop**: Clicks through ALL accounts (100+), exports each one, returns to list
- **Pagination Support**: Handles multiple pages automatically
- **Smart File Naming**: Files renamed to `{AccountTitle}_{AccountNumber}_{Currency}_{DateFrom}_TO_{DateTo}.xlsx`
- **Error Recovery**: Failed accounts are logged and skipped, loop continues

### 2. Export History Tracking
**Never lose track of your exports**

- **Persistent History**: Click the extension icon to view popup with complete export log
- **Detailed Records**: Each export session shows:
  - Date and time of export
  - Date range that was exported
  - Success/fail counts
  - Total duration
- **Local Storage**: History saved using Chrome Storage API
- **Quick Access**: Always available via toolbar icon

### 3. Auto Export Excel (Single Account)
**One-click intelligent export for individual accounts**

- **One-Click Automation**: Clean "Auto Export" button on Account Details page
- **Smart Date Filling**: Prompts for Start/End dates (defaulting to current month) and auto-fills them
- **Smart Wait**: Intelligently monitors the transaction table and clicks export as soon as data finishes loading (no fixed delays)
- **Auto-Download**: Automatically selects the Excel option to start the download

### 4. Zero-Latency Auto-Close
**Instant cleanup for seamless workflow**

- **Instant Cleanup**: Monitors the "Redirecting" popup window
- **Event-Driven**: Closes the popup the exact millisecond the Excel file starts downloading
- **Status Indicator**: Displays "Waiting for Download..." while active

### 5. Visual Debugger
**Know exactly what's happening in real-time**

- **Non-Intrusive Logger**: Green text on black background at bottom-left corner
- **Color-Coded Messages**:
  - Orange for Export All progress
  - Green for success states
  - Red for errors
- **Real-time Updates**: Shows exactly what the bot is doing at each step

---

## Screenshots

_Coming soon: Screenshots of the extension in action_

---

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the directory containing this extension: `.../HSBC_Bot_Companion`
5. **Important**: After updates, always click the **Reload** icon on the extension card and refresh your HSBCnet tabs

---

## Usage

### Export All (Batch Processing)

1. Navigate to HSBCnet Accounts List page
2. **(Optional)** Use checkboxes to select specific accounts:
   - Check/uncheck individual accounts
   - Use "Select All" / "Deselect All" in the header
3. Click the **"Export All"** or **"Export Selected (X)"** button in the toolbar
4. Choose a date preset from the modal:
   - Quick options: Yesterday, Last 7 Days, Last Month, Month to Date
   - Or select a custom date range
5. Watch the progress bar at the top of the screen
6. Click **Cancel** anytime to stop the batch process
7. The extension will:
   - Loop through selected accounts
   - Export each one with your chosen date range
   - Rename files automatically
   - Handle pagination if there are multiple pages
8. View export summary in the extension popup (click toolbar icon)

### Single Account Export

1. Navigate to any Account Details page
2. Click **"Auto Export"** button
3. Enter date range when prompted (or use defaults)
4. File downloads and renames automatically

### View Export History

1. Click the HSBC Bot Companion icon in Chrome toolbar
2. See complete history of all export operations:
   - When each export happened
   - What date range was used
   - How many succeeded/failed
   - How long it took

---

## File Naming Format

Downloads are automatically renamed to:
```
{AccountTitle}_{AccountNumber}_{Currency}_{DateFrom}_TO_{DateTo}.xlsx
```

**Example:**
```
C G R FZE_021-894472-001_AED_06-12-2025_TO_06-12-2025.xlsx
```

---

## RPA Integration Guide

Perfect for automation workflows with Power Automate Desktop, UiPath, Selenium, and more.

### Button Selector
```
#hsbc-bot-export-btn
```

### Power Automate Desktop
Use `PAD_Script.js` with **Execute JavaScript** action:

```javascript
function ExecuteScript() {
    var btn = document.getElementById('hsbc-bot-export-btn');
    if (!btn) return 'ERROR: Button not found';
    btn.setAttribute('data-start', '%YourStartDateVar%');
    btn.setAttribute('data-end', '%YourEndDateVar%');
    btn.click();
    return 'OK';
}
```

### Other RPA Tools (UiPath, Selenium)

```javascript
const btn = document.getElementById('hsbc-bot-export-btn');
btn.setAttribute('data-start', '01/11/2025');
btn.setAttribute('data-end', '30/11/2025');
btn.click();
```

**Date Format**: `dd/mm/yyyy`

---

## Privacy & Permissions

- **activeTab**: To interact with the HSBCnet page content
- **downloads**: To detect downloads and rename files automatically
- **storage**: To save export history locally on your device
- **Host Permissions**: Restricted to `*://*.hsbcnet.com/*` only

**Your data never leaves your browser. All processing happens locally.**

---

## Technical Details

- **Manifest Version**: V3 (latest Chrome extension standard)
- **Content Script**: DOM injection, UI automation, batch processing logic
- **Service Worker**: Download events, file renaming, tab management
- **Storage**: Chrome Storage API for export history persistence
- **Smart Wait**: MutationObserver-based detection (no arbitrary delays)

---

## Support & Contributing

Found a bug or have a feature request? Open an issue or submit a pull request.

**Note**: This extension is designed specifically for HSBCnet portal automation. Selectors may need updates if the portal structure changes.

---

## License

MIT License - Feel free to use and modify for your automation needs.

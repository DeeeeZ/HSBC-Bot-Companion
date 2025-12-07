# HSBC Bot Companion

A powerful Chrome extension to automate workflows on the HSBCnet portal.

## Features

### 1. Export All Accounts (NEW)
*   **Batch Export**: Adds "Export All" button to the Accounts List page
*   **Automatic Loop**: Clicks through ALL accounts (100+), exports each one, returns to list
*   **Pagination Support**: Handles multiple pages automatically
*   **Smart File Naming**: Files renamed to `{AccountTitle}_{AccountNumber}_{Currency}_{DateFrom}_TO_{DateTo}.xlsx`
*   **Progress Tracking**: Visual logger shows `[1/106] ACCOUNT NAME` as it processes
*   **Error Recovery**: Failed accounts are logged and skipped, loop continues

### 2. Auto Export Excel (Single Account)
*   **One-Click Automation**: Adds a clean "Auto Export" button to the Account Details page.
*   **Smart Date Filling**: Prompts for Start/End dates (defaulting to current month) and auto-fills them, respecting the bank's date formatting.
*   **Smart Wait**: Intelligently monitors the transaction table and clicks export as soon as the data finishes loading (no fixed delays).
*   **Auto-Download**: Automatically selects the Excel option to start the download.

### 3. Zero-Latency Auto-Close
*   **Instant Cleanup**: Monitors the "Redirecting" popup window.
*   **Event-Driven**: Closes the popup the *exact millisecond* the Excel file starts downloading to your computer.
*   **Status Indicator**: Displays "Waiting for Download..." while active.

### 4. Visual Debugger
*   Includes a non-intrusive **Visual Logger** (Green text on Black) at the bottom-left of the screen to show exactly what the bot is doing in real-time.
*   Orange-colored logs for Export All progress

## Installation

1.  Open Chrome and navigate to `chrome://extensions/`.
2.  Enable **Developer mode** (toggle in the top-right corner).
3.  Click **Load unpacked**.
4.  Select the directory containing this extension:
    *   `.../HSBC_Bot_Companion`
5.  **Important**: If you update the extension, always click the **Reload** (circular arrow) icon on the extension card and refresh your HSBCnet tabs.

## RPA Integration Guide

### Button Selector
`#hsbc-bot-export-btn`

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

## Usage

### Export All (Batch)
1. Navigate to HSBCnet Accounts List page
2. Click the red **"Export All"** button in the toolbar
3. The extension will:
   - Loop through all accounts on the page
   - Export each one with yesterday's date
   - Rename files automatically
   - Handle pagination if there are multiple pages
4. Watch progress in the visual logger

### Single Account Export
1. Navigate to any Account Details page
2. Click **"Auto Export"** button
3. Enter date range when prompted
4. File downloads automatically

## File Naming Format

Downloads are automatically renamed to:
```
{AccountTitle}_{AccountNumber}_{Currency}_{DateFrom}_TO_{DateTo}.xlsx
```

**Example:**
```
C G R FZE_021-894472-001_AED_06-12-2025_TO_06-12-2025.xlsx
```

## Privacy & Permissions
*   **ActiveTab**: To interact with the HSBCnet page content.
*   **Downloads**: To detect downloads and rename files automatically.
*   **Host Permissions**: Restricted to `*://*.hsbcnet.com/*`.

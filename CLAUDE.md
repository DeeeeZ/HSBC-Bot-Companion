# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Chrome extension (Manifest V3) automating HSBCnet banking portal workflows. Designed for both human and RPA bot usage.

**Features:**
- **Export All** - Batch export all accounts from list page (loops through 100+ accounts automatically)
- **Selective Export** - Checkbox per account row, Select All/Deselect All, dynamic "Export Selected (X)" count
- **Auto Export** - Single account export with Smart Wait (MutationObserver-based)
- **Smart File Naming** - Downloads organized into `HSBC_Exports/YYYY-MM-DD/` subfolder, renamed to `{Title}_{AccountNumber}_{Currency}_{DateFrom}_TO_{DateTo}.xlsx`
- **RPA Status Polling** - `data-status` attribute (`idle`/`exporting`/`done`/`error`) for PAD integration
- **Keep Alive** - Prevents 5-min session timeout with activity simulation every 1 min (ON by default)
- Download-triggered auto-close of redirect windows

## Architecture

```
content.js      → DOM injection, UI automation, Export All loop, Smart Wait (~1950 lines)
background.js   → Service worker: download events, file renaming, tab management (~180 lines)
popup.js        → Export history display from Chrome storage
manifest.json   → Extension config, permissions
```

**Page Detection (content.js):**
- Accounts List: `isAccountsListPage()` - hash contains `/accounts` or `/landing` (NOT `/accounts/details/`)
- Account Details: hash contains `/accounts/details/`
- Redirect Page: URL contains `GIBRfdRedirect`

## Message Protocol (content.js ↔ background.js)

| Message | Direction | Purpose |
|---------|-----------|---------|
| `set_download_context` | content → bg | Sets filename metadata before export |
| `download_json_log` | content → bg | Sends JSON log content for subfolder download |
| `download_started` | bg → content | Confirms download, triggers button state change |
| `close_tab` | content → bg | Manual tab close request |

## Export All State Machine

```
exportAllState = {
  isRunning, cancelled, isSelectiveExport,
  accounts[], currentIndex, completed[], failed[],
  startDate, endDate, startTime
}
```

**Flow:** `handleExportAll()` → `processNextAccount()` → (loop) → `handlePageComplete()` → `finishExportAll()`

**Selective Export Flow:**
1. `injectCheckboxes()` adds checkbox to each account row
2. User checks/unchecks accounts (or uses Select All)
3. `getSelectedAccounts()` filters `exportAllState.accounts` to checked only
4. `handleExportAll()` sets `isSelectiveExport: true` and processes filtered list

## Download Rename Flow

```
content.js                          background.js
    │                                    │
    ├─ set_download_context ────────────►│ (stores title, number, currency, dates)
    │                                    │
    ├─ clicks Excel export               │
    │                                    │
    │                     onDeterminingFilename ◄─── Chrome
    │                                    │
    │                     builds filename from context
    │                                    │
    │                     onCreated ◄─── Chrome
    │                                    │
    │◄──────── download_started ─────────┤ (notifies content.js)
    │                                    │
    └─ updates button state (done)       └─ closes redirect tabs
```

## Required Extension Files

| File | Purpose |
|------|---------|
| `manifest.json` | Extension configuration (required) |
| `background.js` | Service worker for downloads & tab management |
| `content.js` | DOM injection & page automation |
| `popup.html` | Extension popup UI |
| `popup.js` | Popup functionality |
| `ICON.png` | Extension icon |

## Development

```bash
# Load extension
chrome://extensions/ → Enable Developer mode → Load unpacked → select this directory

# After changes
Click Reload on extension card + refresh HSBCnet tabs

# Debug background.js
chrome://extensions/ → Click "service worker" link on extension card

# Debug content.js
F12 DevTools on HSBCnet page → Console (filter by "[HSBC Bot]")
```

## Key Selectors

### Accounts List Page
| Element | Selector |
|---------|----------|
| Export All Button | `#hsbc-bot-export-all-btn` |
| Keep Alive Checkbox | `#hsbc-bot-keep-alive-btn` |
| Select All Checkbox | `#hsbc-bot-select-all` |
| Row Checkbox | `.hsbc-bot-row-checkbox` |
| Toolbar (left) | `section.table-header-ai ul` |
| Toolbar (right) | `ul.table-actions__group--right-ai` |
| Account Rows | `tr.table__row--clickable` |
| Currency Headers | `tr.table__row--title td.presentation-unit__name` |
| Account Number | `td.table__cell--sorted span` |
| Account Title | `td.table__cell__at span` |
| Next Page | `a.pagination__link--arrow[aria-label="Go to next page"]` |

### Account Details Page
| Element | Selector |
|---------|----------|
| Auto Export Button | `#hsbc-bot-export-btn` |
| Account Number | `div.detail-header__number` (first token) |
| Account Title | `h1.detail-header__favorite-title > span:first-child` |
| Currency | `span.detail-header__name--currency` |
| Edit Date Button | `#edit_date` (must click to reveal date fields) |
| Start Date | `#dateFieldFrom-field` (hidden until edit clicked) |
| End Date | `#dateFieldTo-field` (hidden until edit clicked) |
| Export Trigger | `#export-dropdown-trigger` |
| Excel Option | `#export-dropdown > li:nth-child(3) > span` |
| Back Button | `a.detail-header__info-back` |

## Key Functions (content.js)

| Function | Purpose |
|----------|---------|
| `handleExportAll()` | Entry point for batch export |
| `processNextAccount()` | Processes single account in loop |
| `handlePageComplete()` | Handles completion of single account export in loop |
| `finishExportAll()` | Cleanup and summary after batch export |
| `handleExportFlow(e)` | Single account Auto Export flow |
| `waitForElement(selector, timeout)` | MutationObserver-based element wait |
| `waitForButtonText(selector, text, timeout)` | Waits for button text change |
| `safeSetValue(element, value)` | Robust date input setter with event dispatch |
| `extractAccountsFromTable()` | Parses account list with currency grouping |
| `findRowByAccountNumber(num)` | Re-finds row after DOM refresh |
| `extractAccountInfoFromDetailsPage()` | Extracts title/number/currency from details page header |
| `injectCheckboxes()` | Adds selection checkboxes to account rows |
| `getSelectedAccounts()` | Returns array of checked accounts for selective export |
| `showDateModal()` | Displays date preset picker modal |
| `toggleKeepAlive()` | Toggles session keep-alive interval (1 min activity simulation) |
| `saveExportHistory(record)` | Persists export session to Chrome storage |
| `downloadExportLog(exportData)` | Auto-downloads JSON log with completed/failed accounts |

## RPA Integration

**Power Automate Desktop - Trigger Export:**
```javascript
function ExecuteScript() {
    var btn = document.getElementById('hsbc-bot-export-btn');
    if (!btn) return 'ERROR: Button not found';
    btn.setAttribute('data-start', '%StartDate%');
    btn.setAttribute('data-end', '%EndDate%');
    btn.click();
    return 'OK';
}
```

**Power Automate Desktop - Poll Status (loop until done/error):**
```javascript
function ExecuteScript() {
    var btn = document.getElementById('hsbc-bot-export-btn');
    return btn ? btn.getAttribute('data-status') : 'ERROR';
}
// Returns: idle, exporting, done, error
```

**PAD Flow:** Trigger → Loop (wait 1-2s → poll → exit if `done`/`error`)

## Export All Outputs

| Output | Description |
|--------|-------------|
| `HSBC_Export_Log.json` | Auto-downloaded JSON with full account details for completed/failed |
| Completion Modal | Popup showing summary stats, failed accounts list, duration |
| Chrome Storage | History accessible via extension popup (max 50 records) |

## Download Folder Structure

Exports are organized into subfolders by export run date:

```
Downloads/
└── HSBC_Exports/
    └── 2026-01-12/          (date when Export All was run)
        ├── HSBC_Export_Log.json
        ├── STYLE_AVENUE_020-133989-001_AED_01-01-2026_TO_11-01-2026.xlsx
        ├── ALLIED_ENTERPRISES_020-238382-001_AED_01-01-2026_TO_11-01-2026.xlsx
        └── ... (all exports from that session)
```

Chrome automatically creates the folders if they don't exist. The date uses ISO format (`YYYY-MM-DD`) for proper sorting.

## Constraints & Limits

- Date format: `dd/mm/yyyy`
- Smart Wait: 1s settle threshold, 10s max timeout
- Auto-close: <500ms after download starts
- Download context expires after 60s
- Export history: max 50 records (FIFO)
- HSBCnet DOM changes may break selectors

## Injected UI Components

| Component | Location | Created By |
|-----------|----------|------------|
| Visual Logger | Bottom-left overlay | `initLogger()` |
| Progress Bar | Top of page (during Export All) | `createProgressBar()` |
| Date Modal | Center overlay | `showDateModal()` |
| Completion Modal | Center overlay | `showCompletionModal()` |
| Row Checkboxes | Each account row | `injectCheckboxes()` |

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Button not injected | `setInterval` (2s) hasn't run yet | Wait or force `injectButton()` |
| Download not renamed | Context expired or cleared | Check `pendingDownloadContext` in bg console |
| "No tab with id" error | Tab closed before message sent | Wrap `chrome.tabs.*` calls in `.catch()` |
| Export All stuck | Navigation failed to return to list | Check `isAccountsListPage()` detection |
| Checkboxes not appearing | `checkboxesInjected` flag true from prior run | Refresh page or reset flag |
| Date modal not showing | `showDateModal()` not called | Check `handleExportAll()` entry point |
| Keep Alive not working | Event targets not found | Verify `document.body` exists before dispatch |

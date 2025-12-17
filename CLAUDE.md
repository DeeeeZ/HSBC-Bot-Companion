# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Chrome extension (Manifest V3) automating HSBCnet banking portal workflows. Designed for both human and RPA bot usage.

**Features:**
- **Export All** - Batch export all accounts from list page (loops through 100+ accounts automatically)
- **Smart File Naming** - Downloads renamed to `{Title}_{AccountNumber}_{Currency}_{DateFrom}_TO_{DateTo}.xlsx`
- Auto Excel Export with Smart Wait (MutationObserver-based)
- Download-triggered auto-close of redirect windows

## Architecture

```
content.js      → DOM injection, UI automation, Export All loop, Smart Wait (~1600 lines)
background.js   → Service worker: download events, file renaming, tab management (~125 lines)
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
| Toolbar | `section.table-header-ai ul` |
| Account Rows | `tr.table__row--clickable` |
| Currency Headers | `tr.table__row--title td.presentation-unit__name` |
| Account Number | `td.table__cell--sorted span` |
| Account Title | `td.table__cell__at span` |
| Next Page | `a.pagination__link--arrow[aria-label="Go to next page"]` |

### Account Details Page
| Element | Selector |
|---------|----------|
| Auto Export Button | `#hsbc-bot-export-btn` |
| Start Date | `#filter__startDate` |
| End Date | `#filter__endDate` |
| Export Trigger | `#export-dropdown-trigger` |
| Excel Option | `#export-dropdown > li:nth-child(3) > span` |
| Back Button | `a.detail-header__info-back` |

## Key Functions (content.js)

| Function | Purpose |
|----------|---------|
| `handleExportAll()` | Entry point for batch export |
| `processNextAccount()` | Processes single account in loop |
| `waitForElement(selector, timeout)` | MutationObserver-based element wait |
| `waitForButtonText(selector, text, timeout)` | Waits for button text change |
| `safeSetValue(element, value)` | Robust date input setter with event dispatch |
| `extractAccountsFromTable()` | Parses account list with currency grouping |
| `findRowByAccountNumber(num)` | Re-finds row after DOM refresh |

## RPA Integration

**Power Automate Desktop** - use `Docs/PAD_Script.js` with Execute JavaScript action:
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

**Other RPA tools** - set attributes before click:
```javascript
const btn = document.getElementById('hsbc-bot-export-btn');
btn.setAttribute('data-start', '01/11/2025');
btn.setAttribute('data-end', '30/11/2025');
btn.click();
```

## Export All Outputs

| Output | Description |
|--------|-------------|
| `HSBC_Export_Log.json` | Auto-downloaded JSON with full account details for completed/failed |
| Completion Modal | Popup showing summary stats, failed accounts list, duration |
| Chrome Storage | History accessible via extension popup (max 50 records) |

## Constraints & Limits

- Date format: `dd/mm/yyyy`
- Smart Wait: 1s settle threshold, 10s max timeout
- Auto-close: <500ms after download starts
- Download context expires after 60s
- Export history: max 50 records (FIFO)
- HSBCnet DOM changes may break selectors

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Button not injected | `setInterval` (2s) hasn't run yet | Wait or force `injectButton()` |
| Download not renamed | Context expired or cleared | Check `pendingDownloadContext` in bg console |
| "No tab with id" error | Tab closed before message sent | Wrap `chrome.tabs.*` calls in `.catch()` |
| Export All stuck | Navigation failed to return to list | Check `isAccountsListPage()` detection |

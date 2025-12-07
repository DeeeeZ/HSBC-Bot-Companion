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
content.js      → DOM injection, UI automation, Export All loop, Smart Wait
background.js   → Service worker: download events, file renaming, tab management
manifest.json   → Extension config, permissions
```

**Page Detection:**
- Accounts List: hash contains `/accounts` or `/landing` (NOT `/accounts/details/`)
- Account Details: hash contains `/accounts/details/`
- Redirect Page: URL contains `GIBRfdRedirect`

## Development

```bash
# Load extension
1. chrome://extensions/ → Enable Developer mode
2. Load unpacked → select this directory

# After changes
Click Reload on extension card + refresh HSBCnet tabs
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

## RPA Integration

**Power Automate Desktop** - use `PAD_Script.js` with Execute JavaScript action:
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

## Constraints

- Date format: `dd/mm/yyyy`
- Smart Wait: 1s settle threshold, 10s max timeout
- Auto-close: <500ms after download starts
- HSBCnet DOM changes may break selectors

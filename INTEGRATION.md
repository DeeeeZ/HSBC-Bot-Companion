# Integration Guide: HSBC Bot Companion → BankRecon

This document explains how the HSBC Bot Companion Chrome extension saves export files and how the BankRecon reconciliation engine should locate and process them.

## File Organization

### Folder Structure

```
C:\Users\<Username>\Downloads\HSBC_Exports\
├── 2026-01-12\
│   ├── HSBC_Export_Log.json
│   ├── STYLE_AVENUE_020-133989-001_AED_01-01-2026_TO_11-01-2026.xlsx
│   ├── ALLIED_ENTERPRISES_020-238382-001_AED_01-01-2026_TO_11-01-2026.xlsx
│   └── ... (more account exports)
├── 2026-01-13\
│   ├── HSBC_Export_Log.json
│   └── ... (exports for this date)
└── 2026-01-15\
    ├── HSBC_Export_Log.json
    └── ... (latest exports)
```

**Key Points:**
- Root folder: `%USERPROFILE%\Downloads\HSBC_Exports\`
- Subfolders: One per export session, named `YYYY-MM-DD` (ISO format)
- Date represents when Export All was **executed**, not the statement period
- Folders sorted chronologically (ISO format ensures proper sorting)

### File Naming Convention

**Excel Files:**
```
{AccountTitle}_{AccountNumber}_{Currency}_{DateFrom}_TO_{DateTo}.xlsx
```

**Examples:**
- `STYLE_AVENUE_020-133989-001_AED_01-01-2026_TO_11-01-2026.xlsx`
- `CHALHOUB_GROUP_LIMITED_035-609478-100_EUR_01-01-2026_TO_14-01-2026.xlsx`
- `MAC_FOR_PROMOTING_COMMERCIAL_BUSINE_001-525500-110_USD_01-01-2026_TO_14-01-2026.xlsx`

**Filename Components:**
| Component | Description | Example |
|-----------|-------------|---------|
| AccountTitle | Sanitized company name (spaces → underscores) | `STYLE_AVENUE` |
| AccountNumber | Full account number with dashes | `020-133989-001` |
| Currency | 3-letter currency code | `AED`, `EUR`, `USD` |
| DateFrom | Start date (DD-MM-YYYY) | `01-01-2026` |
| DateTo | End date (DD-MM-YYYY) | `14-01-2026` |

**Note:** Account titles may be truncated to 50 characters if too long.

### Export Log (JSON)

Each export session includes `HSBC_Export_Log.json` with metadata:

```json
{
  "exportId": "export_1768495900083",
  "timestamp": "2026-01-15T16:51:40.083Z",
  "dateRange": {
    "from": "01/01/2026",
    "to": "14/01/2026"
  },
  "summary": {
    "total": 100,
    "completed": 98,
    "failed": 2,
    "cancelled": false,
    "durationSeconds": 1335
  },
  "completed": [
    {
      "accountNumber": "020-133989-001",
      "accountTitle": "STYLE AVENUE M.E FZCO",
      "currency": "AED"
    }
  ],
  "failed": [
    {
      "accountNumber": "023-255706-001",
      "accountTitle": "CGT LIMITED",
      "currency": "AED",
      "error": "Timeout waiting for ul.header-actions"
    }
  ]
}
```

**Log Structure:**
- `exportId`: Unique identifier (`export_<timestamp>`)
- `timestamp`: ISO 8601 format
- `dateRange`: Statement period (DD/MM/YYYY format)
- `summary`: Statistics (total, completed, failed, duration)
- `completed[]`: Successfully exported accounts
- `failed[]`: Accounts that timed out or errored

## Integration Patterns

### Pattern 1: Find Latest Export

```python
import os
from pathlib import Path
from datetime import datetime

def get_latest_export_folder():
    """Returns the most recent HSBC export folder."""
    base_path = Path.home() / "Downloads" / "HSBC_Exports"

    if not base_path.exists():
        return None

    # Get all date folders, sort descending
    folders = sorted(
        [f for f in base_path.iterdir() if f.is_dir()],
        reverse=True
    )

    return folders[0] if folders else None

# Usage
latest = get_latest_export_folder()
print(f"Latest export: {latest}")
# Output: C:\Users\ASUS\Downloads\HSBC_Exports\2026-01-15
```

### Pattern 2: Read Export Log

```python
import json

def load_export_log(export_folder):
    """Load and parse the export log JSON."""
    log_path = export_folder / "HSBC_Export_Log.json"

    if not log_path.exists():
        raise FileNotFoundError(f"No export log in {export_folder}")

    with open(log_path, 'r', encoding='utf-8') as f:
        return json.load(f)

# Usage
log = load_export_log(latest)
print(f"Completed: {log['summary']['completed']}")
print(f"Failed: {log['summary']['failed']}")
print(f"Date range: {log['dateRange']['from']} to {log['dateRange']['to']}")
```

### Pattern 3: Find Files by Account Number

```python
def find_account_file(export_folder, account_number):
    """Find Excel file for specific account number."""
    pattern = f"*_{account_number}_*.xlsx"
    files = list(export_folder.glob(pattern))
    return files[0] if files else None

# Usage
account_file = find_account_file(latest, "020-133989-001")
print(f"Found: {account_file.name}")
# Output: STYLE_AVENUE_020-133989-001_AED_01-01-2026_TO_11-01-2026.xlsx
```

### Pattern 4: Get All Files by Currency

```python
def get_files_by_currency(export_folder, currency):
    """Get all Excel files for a specific currency."""
    pattern = f"*_{currency}_*.xlsx"
    return list(export_folder.glob(pattern))

# Usage
aed_files = get_files_by_currency(latest, "AED")
print(f"Found {len(aed_files)} AED accounts")

eur_files = get_files_by_currency(latest, "EUR")
usd_files = get_files_by_currency(latest, "USD")
```

### Pattern 5: Validate Export Completeness

```python
def validate_export(export_folder):
    """Check if export is complete and valid."""
    log = load_export_log(export_folder)

    # Check for cancellation
    if log['summary']['cancelled']:
        return False, "Export was cancelled"

    # Count actual files
    xlsx_files = list(export_folder.glob("*.xlsx"))
    expected = log['summary']['completed']

    if len(xlsx_files) != expected:
        return False, f"File count mismatch: {len(xlsx_files)} files, {expected} expected"

    # Check for failures
    failed_count = log['summary']['failed']
    if failed_count > 0:
        failed_accounts = [f['accountNumber'] for f in log['failed']]
        return True, f"Completed with {failed_count} failures: {failed_accounts}"

    return True, "Export complete and valid"

# Usage
valid, message = validate_export(latest)
print(f"Valid: {valid}, Message: {message}")
```

### Pattern 6: Parse Filename Components

```python
import re

def parse_hsbc_filename(filename):
    """Extract components from HSBC export filename."""
    # Pattern: {Title}_{AccountNumber}_{Currency}_{DateFrom}_TO_{DateTo}.xlsx
    pattern = r"^(.+?)_(\d{3}-\d{6}-\d{3})_([A-Z]{3})_(\d{2}-\d{2}-\d{4})_TO_(\d{2}-\d{2}-\d{4})\.xlsx$"

    match = re.match(pattern, filename)
    if not match:
        return None

    return {
        'title': match.group(1).replace('_', ' '),
        'account_number': match.group(2),
        'currency': match.group(3),
        'date_from': match.group(4),  # DD-MM-YYYY
        'date_to': match.group(5)      # DD-MM-YYYY
    }

# Usage
info = parse_hsbc_filename("STYLE_AVENUE_020-133989-001_AED_01-01-2026_TO_11-01-2026.xlsx")
print(info)
# Output: {
#   'title': 'STYLE AVENUE',
#   'account_number': '020-133989-001',
#   'currency': 'AED',
#   'date_from': '01-01-2026',
#   'date_to': '11-01-2026'
# }
```

## BankRecon Integration

### Recommended Workflow

```python
from pathlib import Path
import pandas as pd

def process_latest_hsbc_export():
    """Main function for BankRecon to process HSBC exports."""

    # 1. Locate latest export
    export_folder = get_latest_export_folder()
    if not export_folder:
        raise Exception("No HSBC exports found")

    print(f"Processing export from: {export_folder.name}")

    # 2. Load export log
    log = load_export_log(export_folder)
    date_range = log['dateRange']
    print(f"Statement period: {date_range['from']} to {date_range['to']}")

    # 3. Validate export
    valid, message = validate_export(export_folder)
    if not valid:
        raise Exception(f"Invalid export: {message}")

    print(f"Validation: {message}")

    # 4. Process each completed account
    for account in log['completed']:
        account_number = account['accountNumber']
        currency = account['currency']

        # Find the Excel file
        file_path = find_account_file(export_folder, account_number)
        if not file_path:
            print(f"WARNING: File not found for {account_number}")
            continue

        # Read Excel (HSBC format)
        df = pd.read_excel(file_path)

        # >>> INSERT YOUR RECONCILIATION LOGIC HERE <<<
        # Example:
        # - Match transactions against ERP data
        # - Identify unmatched items
        # - Generate reconciliation report

        print(f"✓ Processed {account_number} ({currency}): {len(df)} transactions")

    # 5. Report failures
    if log['failed']:
        print("\nFailed accounts (manual retry needed):")
        for failed in log['failed']:
            print(f"  ✗ {failed['accountNumber']}: {failed['error']}")

    print(f"\nRecon complete: {log['summary']['completed']} accounts processed")

# Run
process_latest_hsbc_export()
```

### Expected Excel Format

HSBC exports contain the following columns (standard format):

| Column | Description |
|--------|-------------|
| Date | Transaction date (DD/MM/YYYY) |
| Description | Transaction description |
| Debit | Debit amount (negative transactions) |
| Credit | Credit amount (positive transactions) |
| Balance | Running balance |
| Value Date | Value date (DD/MM/YYYY) |

**Note:** Column names may vary slightly. Check first row of Excel file.

## Native Messaging Integration (Optional)

The extension can trigger reconciliation automatically via Native Messaging after export completes.

### Setup

1. Install native messaging host:
   ```powershell
   cd native-host
   .\install.ps1
   ```

2. Configure BankRecon path in `native-host/config.json`:
   ```json
   {
     "bankrecon_dir": "C:\\Path\\To\\BankRecon",
     "run_all_script": "BankRecon_Python_Engine\\run_all.py"
   }
   ```

### How It Works

1. User completes HSBC Export All
2. Extension shows "Run Reconciliation" button in completion modal
3. User clicks → Extension sends message to native host
4. Native host runs: `python BankRecon_Python_Engine/run_all.py --bank HSBC`
5. BankRecon processes the latest export from `HSBC_Exports/<latest-date>/`

### Message Protocol

**Extension → Native Host:**
```json
{
  "command": "run_reconciliation",
  "bank": "HSBC",
  "options": {}
}
```

**Native Host → Extension:**
```json
{
  "success": true,
  "total_time_seconds": 45.2,
  "steps": {
    "hsbc_distribution": { "copied": 98, "failed": 0 },
    "reconciliation": { "matched": 1543, "unmatched": 12 }
  }
}
```

## Date Format Cheat Sheet

| Context | Format | Example |
|---------|--------|---------|
| Folder name | `YYYY-MM-DD` | `2026-01-15` |
| Filename dates | `DD-MM-YYYY` | `01-01-2026` |
| Export log dateRange | `DD/MM/YYYY` | `01/01/2026` |
| Export log timestamp | ISO 8601 | `2026-01-15T16:51:40.083Z` |
| Excel transaction dates | `DD/MM/YYYY` | `01/01/2026` |

## Error Handling

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Folder not found | No exports yet | Check if user ran Export All |
| Missing log JSON | Export interrupted | Delete incomplete folder |
| File count mismatch | Partial export | Check log.summary.cancelled |
| Failed accounts in log | HSBCnet timeout | Manual retry needed |
| Duplicate files | Old bug (pre-v2.4) | Use latest extension version |

### Retry Failed Accounts

```python
def retry_failed_accounts(log):
    """Returns list of accounts that need manual retry."""
    return [
        {
            'number': f['accountNumber'],
            'title': f['accountTitle'],
            'currency': f['currency'],
            'error': f['error']
        }
        for f in log['failed']
    ]

# Usage
failed = retry_failed_accounts(log)
if failed:
    print("Manual retry needed for:")
    for acc in failed:
        print(f"  - {acc['number']} ({acc['currency']}): {acc['error']}")
```

## Performance Expectations

| Metric | Value |
|--------|-------|
| Accounts per minute | ~4-5 (depends on HSBCnet response time) |
| 100 accounts | ~20-25 minutes |
| Memory usage | ~200-300 MB (with auto-refresh) |
| Max accounts per session | Unlimited (pagination + refresh) |
| Failed rate | ~1-3% (HSBCnet timeouts) |

## Support

For issues or questions:
- **Extension bugs**: https://github.com/DeeeeZ/HSBC-Bot-Companion/issues
- **BankRecon integration**: Contact project team

---

**Last Updated**: 2026-01-15
**Extension Version**: v2.4+
**Tested With**: BankRecon Python Engine v3.x

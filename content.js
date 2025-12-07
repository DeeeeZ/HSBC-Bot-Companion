// HSBC Bot Companion - Content Script (Title Lock & Verify Version)

const CURRENT_URL = window.location.href;
console.log(`HSBC Bot Companion: Loaded on ${CURRENT_URL}`);

// --- Visual Logger ---
let logOverlay;
let logContent;
let loggerTimeout = null;
const LOGGER_COLLAPSE_MS = 5000; // Collapse to compact mode after 5 seconds

function initLogger() {
    if (logOverlay) return;
    if (!document.body) return;

    // Add animation keyframes
    if (!document.getElementById('hsbc-bot-animations')) {
        const style = document.createElement('style');
        style.id = 'hsbc-bot-animations';
        style.textContent = `
            @keyframes slideInDown {
                from { opacity: 0; transform: translateY(-100%); }
                to { opacity: 1; transform: translateY(0); }
            }
            @keyframes shimmer {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
            }
        `;
        document.head.appendChild(style);
    }

    // Detect page type
    let pageType = "Ready";
    let statusColor = "#10b981"; // green
    if (CURRENT_URL.includes("GIBRfdRedirect")) {
        pageType = "Redirect";
        statusColor = "#f59e0b"; // amber
    } else if (CURRENT_URL.includes("/accounts/details/")) {
        pageType = "Account Details";
        statusColor = "#3b82f6"; // blue
    } else if (CURRENT_URL.includes("/accounts") || CURRENT_URL.includes("/landing")) {
        pageType = "Accounts List";
        statusColor = "#10b981"; // green
    }

    logOverlay = document.createElement('div');
    logOverlay.id = 'hsbc-bot-logger';
    logOverlay.style.cssText = `
        position: fixed;
        bottom: 12px;
        left: 12px;
        z-index: 2147483647;
        pointer-events: none;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 11px;
    `;

    logOverlay.innerHTML = `
        <div style="
            background: rgba(30, 30, 30, 0.85);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            border-radius: 8px;
            padding: 10px 14px;
            min-width: 180px;
            max-width: 340px;
            color: rgba(255,255,255,0.9);
            box-shadow: 0 2px 12px rgba(0,0,0,0.2);
        ">
            <div id="hsbc-logger-header" style="
                display: flex;
                align-items: center;
                gap: 8px;
                padding-bottom: 8px;
                margin-bottom: 8px;
                border-bottom: 1px solid rgba(255,255,255,0.1);
                font-weight: 600;
                font-size: 10px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: rgba(255,255,255,0.6);
            ">
                <span style="
                    width: 8px;
                    height: 8px;
                    background: ${statusColor};
                    border-radius: 50%;
                    box-shadow: 0 0 6px ${statusColor};
                "></span>
                HSBC Bot · ${pageType}
            </div>
            <div id="hsbc-logger-content" style="font-size: 11px; line-height: 1.5;">
                <div style="color: rgba(255,255,255,0.5);">Watching for actions...</div>
            </div>
        </div>
    `;

    document.body.appendChild(logOverlay);
    logContent = document.getElementById('hsbc-logger-content');
}

function log(msg) {
    console.log("[HSBC Bot] " + msg);
    if (!logOverlay && document.body) initLogger();
    if (!logContent) return;

    // Clear "Watching" placeholder on first real log
    if (logContent.innerHTML.includes('Watching for actions')) {
        logContent.innerHTML = '';
    }

    logContent.innerHTML += `<div style="padding:2px 0; color:rgba(255,255,255,0.85);">› ${msg}</div>`;

    // Keep last 6 lines
    const entries = logContent.querySelectorAll('div');
    if (entries.length > 6) entries[0].remove();
}

// Init when safe
if (document.body) {
    initLogger();
} else {
    document.addEventListener('DOMContentLoaded', initLogger);
}


function logError(msg, err) {
    console.error("[HSBC Bot Error] " + msg, err);
    if (!logOverlay && document.body) initLogger();
    if (!logContent) return;

    if (logContent.innerHTML.includes('Watching for actions')) {
        logContent.innerHTML = '';
    }

    logContent.innerHTML += `<div style="padding:2px 0; color:#ff6b6b;">✕ ${msg}</div>`;
}

function logRPA(msg) {
    console.log("[HSBC Bot RPA] " + msg);
    if (!logOverlay && document.body) initLogger();
    if (!logContent) return;

    if (logContent.innerHTML.includes('Watching for actions')) {
        logContent.innerHTML = '';
    }

    logContent.innerHTML += `<div style="padding:2px 0; color:#a78bfa;">⚡ ${msg}</div>`;
}

// --- Configuration ---
const REDIRECT_URL_KEYWORD = "GIBRfdRedirect";
const ACCOUNTS_PAGE_HASH_KEYWORD = "/accounts/details/";

// --- Progress Bar ---
let progressBar = null;

function createProgressBar() {
    if (progressBar) return;

    progressBar = document.createElement('div');
    progressBar.id = 'hsbc-export-progress';
    progressBar.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 2147483647;
        background: linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(250,250,250,0.98) 100%);
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        border-bottom: 1px solid rgba(0,0,0,0.08);
        box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 4px 20px rgba(0,0,0,0.08);
        padding: 18px 28px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        display: none;
        animation: slideInDown 0.4s ease-out;
    `;
    progressBar.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; gap:24px; max-width:1200px; margin:0 auto;">
            <div style="min-width:200px;">
                <div id="progress-text" style="font-size:15px; font-weight:700; color:#111827; display:flex; align-items:center; gap:8px;">
                    <span style="width:3px; height:16px; background:linear-gradient(180deg, #db0011 0%, #ff4444 100%); border-radius:2px;"></span>
                    Exporting... 0/0
                </div>
                <div id="progress-current" style="color:#6b7280; font-size:13px; margin-top:4px; font-weight:500;">Starting...</div>
            </div>
            <div style="flex:1; max-width:500px; position:relative;">
                <div style="background:rgba(0,0,0,0.06); height:8px; border-radius:8px; overflow:hidden;">
                    <div id="progress-fill" style="background:linear-gradient(90deg, #db0011 0%, #ff4444 100%); height:100%; width:0%; transition:width 0.5s cubic-bezier(0.16,1,0.3,1); border-radius:8px; box-shadow:0 0 8px rgba(219,0,17,0.3); position:relative; overflow:hidden;">
                        <div style="position:absolute; top:0; left:0; right:0; bottom:0; background:linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%); animation:shimmer 2s infinite;"></div>
                    </div>
                </div>
            </div>
            <button id="progress-cancel" style="
                background: white;
                color: #ef4444;
                border: 2px solid #fecaca;
                padding: 10px 20px;
                cursor: pointer;
                border-radius: 8px;
                font-weight: 600;
                font-size: 14px;
                font-family: inherit;
                transition: all 0.2s ease;
                box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            ">Cancel</button>
        </div>
    `;
    document.body.appendChild(progressBar);

    // Cancel button handler with hover effects
    const cancelBtn = document.getElementById('progress-cancel');
    cancelBtn.onmouseover = () => {
        cancelBtn.style.background = '#fee2e2';
        cancelBtn.style.borderColor = '#ef4444';
        cancelBtn.style.transform = 'translateY(-1px)';
        cancelBtn.style.boxShadow = '0 4px 8px rgba(239,68,68,0.15)';
    };
    cancelBtn.onmouseout = () => {
        cancelBtn.style.background = 'white';
        cancelBtn.style.borderColor = '#fecaca';
        cancelBtn.style.transform = 'translateY(0)';
        cancelBtn.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
    };
    cancelBtn.onclick = () => {
        exportAllState.cancelled = true;
        logExportAll('Cancelling...');
    };
}

function showProgress() {
    if (!progressBar) createProgressBar();
    progressBar.style.display = 'block';
}

function hideProgress() {
    if (progressBar) progressBar.style.display = 'none';
}

function updateProgress(current, total, accountName) {
    if (!progressBar) createProgressBar();
    showProgress();

    const fill = document.getElementById('progress-fill');
    const text = document.getElementById('progress-text');
    const currentEl = document.getElementById('progress-current');

    const percent = total > 0 ? (current / total) * 100 : 0;

    if (fill) fill.style.width = `${percent}%`;
    if (text) text.textContent = `Exporting... ${current}/${total}`;
    if (currentEl) currentEl.textContent = accountName || 'Processing...';
}

// --- Selective Export (Checkboxes) ---
let checkboxesInjected = false;

function injectCheckboxes() {
    if (!isAccountsListPage()) return;

    const rows = document.querySelectorAll('tbody.table__body tr.table__row--clickable');
    if (rows.length === 0) return;

    // Check if already injected
    if (document.querySelector('.hsbc-select-checkbox')) {
        checkboxesInjected = true;
        return;
    }

    // Inject checkbox styles if not already present
    if (!document.getElementById('hsbc-checkbox-styles')) {
        const style = document.createElement('style');
        style.id = 'hsbc-checkbox-styles';
        style.textContent = `
            .hsbc-select-checkbox, .hsbc-select-all {
                appearance: none;
                -webkit-appearance: none;
                width: 18px;
                height: 18px;
                border: 2px solid #d1d5db;
                border-radius: 5px;
                background: white;
                cursor: pointer;
                position: relative;
                transition: all 0.15s ease;
                box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            }
            .hsbc-select-checkbox:hover, .hsbc-select-all:hover {
                border-color: #db0011;
                background: #fef2f2;
                transform: scale(1.05);
            }
            .hsbc-select-checkbox:checked, .hsbc-select-all:checked {
                background: linear-gradient(135deg, #db0011 0%, #ff4444 100%);
                border-color: #db0011;
                box-shadow: 0 2px 6px rgba(219,0,17,0.3);
            }
            .hsbc-select-checkbox:checked::after, .hsbc-select-all:checked::after {
                content: '';
                position: absolute;
                left: 5px;
                top: 1px;
                width: 4px;
                height: 9px;
                border: solid white;
                border-width: 0 2px 2px 0;
                transform: rotate(45deg);
            }
        `;
        document.head.appendChild(style);
    }

    // Add header checkbox
    const headerRow = document.querySelector('thead tr');
    if (headerRow && !headerRow.querySelector('.hsbc-select-all-th')) {
        const th = document.createElement('th');
        th.className = 'hsbc-select-all-th';
        th.style.cssText = 'width:40px; text-align:center; padding:8px;';
        th.innerHTML = `<input type="checkbox" class="hsbc-select-all" checked>`;
        headerRow.insertBefore(th, headerRow.firstChild);

        // Select All handler
        th.querySelector('.hsbc-select-all').addEventListener('change', (e) => {
            const checked = e.target.checked;
            document.querySelectorAll('.hsbc-select-checkbox').forEach(cb => {
                cb.checked = checked;
            });
            updateSelectionCount();
        });
    }

    // Add checkboxes to each row
    rows.forEach((row, i) => {
        if (row.querySelector('.hsbc-select-checkbox')) return;

        const td = document.createElement('td');
        td.style.cssText = 'width:40px; text-align:center; padding:8px;';
        td.innerHTML = `<input type="checkbox" class="hsbc-select-checkbox" data-index="${i}" checked>`;

        // Prevent row click when clicking checkbox
        td.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        td.querySelector('.hsbc-select-checkbox').addEventListener('change', () => {
            updateSelectionCount();
            // Update "Select All" state
            const allChecked = document.querySelectorAll('.hsbc-select-checkbox:checked').length ===
                              document.querySelectorAll('.hsbc-select-checkbox').length;
            const selectAll = document.querySelector('.hsbc-select-all');
            if (selectAll) selectAll.checked = allChecked;
        });

        row.insertBefore(td, row.firstChild);
    });

    checkboxesInjected = true;
    updateSelectionCount();
}

function updateSelectionCount() {
    const checked = document.querySelectorAll('.hsbc-select-checkbox:checked').length;
    const total = document.querySelectorAll('.hsbc-select-checkbox').length;
    const btn = document.getElementById('hsbc-bot-export-all-btn');

    if (btn && !exportAllState.isRunning) {
        if (checked === total) {
            btn.textContent = `Export All (${total})`;
        } else {
            btn.textContent = `Export Selected (${checked})`;
        }
    }
}

function getSelectedAccounts() {
    const accounts = extractAccountsFromTable();
    const checkboxes = document.querySelectorAll('.hsbc-select-checkbox');

    if (checkboxes.length === 0) {
        return accounts; // No checkboxes, return all
    }

    const selectedIndices = [];
    checkboxes.forEach((cb, i) => {
        if (cb.checked) selectedIndices.push(i);
    });

    return accounts.filter((_, i) => selectedIndices.includes(i));
}

// Find row element by account number (for refreshing stale DOM references)
function findRowByAccountNumber(accountNumber) {
    const rows = document.querySelectorAll('tbody.table__body tr.table__row--clickable');
    for (const row of rows) {
        const numberEl = row.querySelector('td.table__cell--sorted span');
        if (numberEl && numberEl.textContent.trim() === accountNumber) {
            return row;
        }
    }
    return null;
}

// --- Export History ---
const HISTORY_KEY = 'hsbc_export_history';

function saveExportHistory(record) {
    chrome.storage.local.get([HISTORY_KEY], (result) => {
        const history = result[HISTORY_KEY] || [];
        history.unshift(record); // Add to front

        // Keep last 50 records
        if (history.length > 50) {
            history.splice(50);
        }

        chrome.storage.local.set({ [HISTORY_KEY]: history }, () => {
            console.log('[HSBC Bot] Export history saved');
        });
    });
}

// --- Date Presets Modal ---

function getDatePreset(preset) {
    const today = new Date();
    let start, end;

    switch(preset) {
        case 'yesterday':
            const y = new Date(today);
            y.setDate(y.getDate() - 1);
            start = end = y;
            break;
        case 'last7':
            end = new Date(today);
            end.setDate(end.getDate() - 1);
            start = new Date(end);
            start.setDate(start.getDate() - 6);
            break;
        case 'lastMonth':
            // Last day of previous month
            end = new Date(today.getFullYear(), today.getMonth(), 0);
            // First day of previous month
            start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            break;
        case 'mtd':
            // First day of current month
            start = new Date(today.getFullYear(), today.getMonth(), 1);
            // Yesterday
            end = new Date(today);
            end.setDate(end.getDate() - 1);
            break;
        default:
            // Default to yesterday
            const def = new Date(today);
            def.setDate(def.getDate() - 1);
            start = end = def;
    }

    return {
        start: start.toLocaleDateString('en-GB'),
        end: end.toLocaleDateString('en-GB')
    };
}

function showDateModal() {
    return new Promise((resolve) => {
        // Remove existing modal if any
        const existing = document.getElementById('hsbc-date-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'hsbc-date-modal';
        modal.innerHTML = `
            <div style="position:fixed; inset:0; background:rgba(0,0,0,0.4); backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px); z-index:2147483647; display:flex; align-items:center; justify-content:center; animation:fadeIn 0.2s ease-out;">
                <div style="background:white; padding:32px; border-radius:16px; min-width:480px; box-shadow:0 0 0 1px rgba(0,0,0,0.05), 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; animation:modalSlideIn 0.3s ease-out;">
                    <h3 style="margin:0 0 24px; color:#111827; font-size:20px; font-weight:700; display:flex; align-items:center; gap:10px;">
                        <span style="width:4px; height:24px; background:linear-gradient(180deg, #db0011 0%, #ff4444 100%); border-radius:2px;"></span>
                        Select Date Range
                    </h3>

                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:24px;">
                        <button class="date-preset-btn" data-preset="yesterday" style="
                            padding:14px 18px;
                            border:2px solid #e5e7eb;
                            background:white;
                            color:#374151;
                            border-radius:10px;
                            cursor:pointer;
                            font-size:14px;
                            font-weight:600;
                            font-family:inherit;
                            transition:all 0.2s ease;
                            text-align:left;
                            box-shadow:0 1px 2px rgba(0,0,0,0.05);
                        ">Yesterday</button>
                        <button class="date-preset-btn" data-preset="last7" style="
                            padding:14px 18px;
                            border:2px solid #e5e7eb;
                            background:white;
                            color:#374151;
                            border-radius:10px;
                            cursor:pointer;
                            font-size:14px;
                            font-weight:600;
                            font-family:inherit;
                            transition:all 0.2s ease;
                            text-align:left;
                            box-shadow:0 1px 2px rgba(0,0,0,0.05);
                        ">Last 7 Days</button>
                        <button class="date-preset-btn" data-preset="lastMonth" style="
                            padding:14px 18px;
                            border:2px solid #e5e7eb;
                            background:white;
                            color:#374151;
                            border-radius:10px;
                            cursor:pointer;
                            font-size:14px;
                            font-weight:600;
                            font-family:inherit;
                            transition:all 0.2s ease;
                            text-align:left;
                            box-shadow:0 1px 2px rgba(0,0,0,0.05);
                        ">Last Month</button>
                        <button class="date-preset-btn" data-preset="mtd" style="
                            padding:14px 18px;
                            border:2px solid #e5e7eb;
                            background:white;
                            color:#374151;
                            border-radius:10px;
                            cursor:pointer;
                            font-size:14px;
                            font-weight:600;
                            font-family:inherit;
                            transition:all 0.2s ease;
                            text-align:left;
                            box-shadow:0 1px 2px rgba(0,0,0,0.05);
                        ">Month to Date</button>
                    </div>

                    <div style="border-top:2px solid #f3f4f6; padding-top:20px; margin-bottom:24px;">
                        <label style="display:block; color:#6b7280; font-size:13px; margin-bottom:12px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Custom Range</label>
                        <div style="display:flex; gap:16px; align-items:center;">
                            <div style="flex:1;">
                                <label style="font-size:12px; color:#9ca3af; display:block; margin-bottom:6px; font-weight:500;">From</label>
                                <input type="text" id="modal-start" placeholder="dd/mm/yyyy" style="
                                    width:100%;
                                    padding:12px 14px;
                                    border:2px solid #e5e7eb;
                                    border-radius:8px;
                                    font-size:14px;
                                    font-family:inherit;
                                    color:#111827;
                                    box-sizing:border-box;
                                    transition:all 0.2s ease;
                                ">
                            </div>
                            <span style="color:#d1d5db; font-size:18px; margin-top:20px;">→</span>
                            <div style="flex:1;">
                                <label style="font-size:12px; color:#9ca3af; display:block; margin-bottom:6px; font-weight:500;">To</label>
                                <input type="text" id="modal-end" placeholder="dd/mm/yyyy" style="
                                    width:100%;
                                    padding:12px 14px;
                                    border:2px solid #e5e7eb;
                                    border-radius:8px;
                                    font-size:14px;
                                    font-family:inherit;
                                    color:#111827;
                                    box-sizing:border-box;
                                    transition:all 0.2s ease;
                                ">
                            </div>
                        </div>
                    </div>

                    <div style="display:flex; justify-content:flex-end; gap:12px;">
                        <button id="modal-cancel" style="
                            padding:12px 28px;
                            border:2px solid #e5e7eb;
                            background:white;
                            color:#6b7280;
                            border-radius:8px;
                            cursor:pointer;
                            font-size:14px;
                            font-weight:600;
                            font-family:inherit;
                            transition:all 0.2s ease;
                        ">Cancel</button>
                        <button id="modal-start-export" style="
                            padding:12px 28px;
                            border:none;
                            background:linear-gradient(135deg, #db0011 0%, #a50000 100%);
                            color:white;
                            border-radius:8px;
                            cursor:pointer;
                            font-size:14px;
                            font-weight:600;
                            font-family:inherit;
                            box-shadow:0 2px 8px rgba(219,0,17,0.25);
                            transition:all 0.2s ease;
                        ">Start Export</button>
                    </div>
                </div>
            </div>
        `;

        // Inject modal animation styles
        if (!document.getElementById('hsbc-modal-styles')) {
            const style = document.createElement('style');
            style.id = 'hsbc-modal-styles';
            style.textContent = `
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes modalSlideIn {
                    from { opacity: 0; transform: scale(0.95) translateY(-20px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                #modal-start:focus, #modal-end:focus {
                    outline: none;
                    border-color: #db0011;
                    box-shadow: 0 0 0 3px rgba(219, 0, 17, 0.1);
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(modal);

        let selectedDates = null;

        // Preset button handlers
        modal.querySelectorAll('.date-preset-btn').forEach(btn => {
            btn.onmouseover = () => {
                if (!btn.classList.contains('selected')) {
                    btn.style.borderColor = '#fecaca';
                    btn.style.background = '#fef2f2';
                    btn.style.color = '#db0011';
                    btn.style.transform = 'translateY(-2px)';
                    btn.style.boxShadow = '0 4px 8px rgba(0,0,0,0.08)';
                }
            };
            btn.onmouseout = () => {
                if (!btn.classList.contains('selected')) {
                    btn.style.borderColor = '#e5e7eb';
                    btn.style.background = 'white';
                    btn.style.color = '#374151';
                    btn.style.transform = 'translateY(0)';
                    btn.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                }
            };
            btn.onclick = () => {
                // Deselect all
                modal.querySelectorAll('.date-preset-btn').forEach(b => {
                    b.classList.remove('selected');
                    b.style.borderColor = '#e5e7eb';
                    b.style.background = 'white';
                    b.style.color = '#374151';
                    b.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                });
                // Select this one
                btn.classList.add('selected');
                btn.style.borderColor = '#db0011';
                btn.style.background = '#db0011';
                btn.style.color = '#fff';

                const dates = getDatePreset(btn.dataset.preset);
                document.getElementById('modal-start').value = dates.start;
                document.getElementById('modal-end').value = dates.end;
                selectedDates = dates;
            };
        });

        // Cancel button with hover effects
        const cancelBtn = document.getElementById('modal-cancel');
        cancelBtn.onmouseover = () => {
            cancelBtn.style.borderColor = '#d1d5db';
            cancelBtn.style.background = '#f9fafb';
            cancelBtn.style.color = '#374151';
            cancelBtn.style.transform = 'translateY(-1px)';
        };
        cancelBtn.onmouseout = () => {
            cancelBtn.style.borderColor = '#e5e7eb';
            cancelBtn.style.background = 'white';
            cancelBtn.style.color = '#6b7280';
            cancelBtn.style.transform = 'translateY(0)';
        };
        cancelBtn.onclick = () => {
            modal.remove();
            resolve(null);
        };

        // Start Export button with hover effects
        const startExportBtn = document.getElementById('modal-start-export');
        startExportBtn.onmouseover = () => {
            startExportBtn.style.background = 'linear-gradient(135deg, #ff1a2f 0%, #db0011 100%)';
            startExportBtn.style.transform = 'translateY(-1px)';
            startExportBtn.style.boxShadow = '0 4px 12px rgba(219,0,17,0.35)';
        };
        startExportBtn.onmouseout = () => {
            startExportBtn.style.background = 'linear-gradient(135deg, #db0011 0%, #a50000 100%)';
            startExportBtn.style.transform = 'translateY(0)';
            startExportBtn.style.boxShadow = '0 2px 8px rgba(219,0,17,0.25)';
        };
        startExportBtn.onclick = () => {
            const startVal = document.getElementById('modal-start').value.trim();
            const endVal = document.getElementById('modal-end').value.trim();

            if (!startVal || !endVal) {
                alert('Please select a date range or enter custom dates');
                return;
            }

            modal.remove();
            resolve({ start: startVal, end: endVal });
        };

        // Close on overlay click
        modal.firstElementChild.onclick = (e) => {
            if (e.target === modal.firstElementChild) {
                modal.remove();
                resolve(null);
            }
        };

        // Default to yesterday
        const yesterday = getDatePreset('yesterday');
        document.getElementById('modal-start').value = yesterday.start;
        document.getElementById('modal-end').value = yesterday.end;
    });
}

// --- Helper Functions ---

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


function safeSetValue(element, value) {
    try {
        log(`Setting ${element.id} = ${value}`);
        
        // 1. Prototype Setter
        const proto = Object.getPrototypeOf(element);
        const setVal = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (setVal) {
            setVal.call(element, value);
        } else {
            element.value = value;
        }

        // 2. Dispatch Events
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.dispatchEvent(new Event('blur', { bubbles: true }));
        element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
        
        // 3. Verify (Relaxed)
        // The site often formats '01/12/2025' -> '01 Dec 2025'. 
        // We should only error if the value is empty or completely different (and not just formatted).
        if (element.value !== value) {
            log(`Site formatted value to: ${element.value}`);
            // Do NOT force it back. Trust the site's formatter.
        } else {
            log("Value set exact.");
        }
    } catch (e) {
        logError(`Failed to set value on ${element.id}`, e);
    }
}

// --- Feature 1: Title Changer & Auto Close ---

// --- Feature 1: Title Changer & Status Monitor ---

if (CURRENT_URL.includes(REDIRECT_URL_KEYWORD)) {
    log("Redirect Page Detected. Monitor Active.");
    
    // We just set the status. The Background Script will close the window 
    // immediately when the download starts (chrome.downloads.onCreated).
    
    const targetTitle = "Waiting for Download...";
    const successTitle = "Download Started...";
    
    document.title = targetTitle;

    setInterval(() => {
        // Keep it set unless we are done
        if (!document.title.includes("Download")) {
            document.title = targetTitle;
        }
    }, 500);

    // Optional: Visual Feedback (wait for body)
    function setRedirectBody() {
        if (document.body) {
            document.body.innerHTML = "<h1 style='color:green; text-align:center; margin-top:50px;'>Waiting for Download...</h1><p style='text-align:center'>Window will close automatically.</p>";
        }
    }
    if (document.body) {
        setRedirectBody();
    } else {
        document.addEventListener('DOMContentLoaded', setRedirectBody);
    }
}

// --- Feature 2: Automation Button (Details Page) ---

let isInjecting = false;

// --- Feature 3: Export All Button (List Page) ---

let isInjectingExportAll = false;

// Export All State
let exportAllState = {
    isRunning: false,
    cancelled: false,    // Cancel flag for progress bar
    isSelectiveExport: false, // True if user selected specific accounts (don't paginate)
    accounts: [],        // [{number, title, currency, rowElement}]
    currentIndex: 0,
    completed: [],
    failed: [],
    startDate: '',       // dd/mm/yyyy
    endDate: '',         // dd/mm/yyyy
    startTime: null      // For duration tracking
};

// Check if on accounts list page (NOT details page)
function isAccountsListPage() {
    const hash = window.location.hash;
    return (hash.includes('/accounts') || hash.includes('/landing')) && !hash.includes('/accounts/details/');
}

async function injectExportAllButton() {
    if (isInjectingExportAll) return;
    if (!isAccountsListPage()) return;
    if (document.getElementById('hsbc-bot-export-all-btn')) return;

    isInjectingExportAll = true;

    // On list page, inject into the table header toolbar (next to Export button)
    const toolbar = document.querySelector('section.table-header-ai ul');

    if (toolbar) {
        const li = document.createElement('li');
        li.className = 'table-actions__group-item';

        const button = document.createElement('button');
        button.id = 'hsbc-bot-export-all-btn';
        button.textContent = 'Export All';
        button.style.cssText = `
            background: transparent;
            color: #333;
            border: 1px solid #ccc;
            padding: 8px 16px;
            cursor: pointer;
            font-weight: 500;
            border-radius: 4px;
            font-size: 13px;
            font-family: inherit;
            transition: all 0.15s ease;
        `;

        button.onmouseover = () => {
            button.style.background = '#f5f5f5';
            button.style.borderColor = '#999';
        };
        button.onmouseout = () => {
            button.style.background = 'transparent';
            button.style.borderColor = '#ccc';
        };
        button.onclick = handleExportAll;

        li.appendChild(button);
        toolbar.appendChild(li);
        log("Export All button injected.");
    }

    isInjectingExportAll = false;
}

async function injectButton() {
    if (isInjecting) return;
    if (!window.location.hash.includes(ACCOUNTS_PAGE_HASH_KEYWORD)) return;
    if (document.getElementById('hsbc-bot-export-btn')) return;

    isInjecting = true;
    
    const headerActions = document.querySelector('ul.header-actions');
    
    if (headerActions) {
        const li = document.createElement('li');
        li.className = 'header-actions__item';

        const button = document.createElement('button');
        button.id = 'hsbc-bot-export-btn';
        button.className = 'user-action__button';
        button.textContent = 'Auto Export';
        button.style.cssText = `
            background: transparent;
            color: #333;
            border: 1px solid #ccc;
            cursor: pointer;
            margin-left: 12px;
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 13px;
            font-weight: 500;
            font-family: inherit;
            transition: all 0.15s ease;
        `;

        button.onmouseover = () => {
            button.style.background = '#f5f5f5';
            button.style.borderColor = '#999';
        };
        button.onmouseout = () => {
            button.style.background = 'transparent';
            button.style.borderColor = '#ccc';
        };
        button.onclick = handleExportFlow;

        li.appendChild(button);
        headerActions.prepend(li);
        log("Button injected.");
    }

    isInjecting = false;
}

async function handleExportFlow(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // Reset Log
    if (logContent) logContent.innerHTML = '';
    log("=== AUTO EXPORT STARTING ===");

    try {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const defaultStart = firstDay.toLocaleDateString('en-GB'); 
        const defaultEnd = today.toLocaleDateString('en-GB');

        let startDateInput, endDateInput;

        // RPA Integration: Check for data attributes
        const btn = e.target; // or document.getElementById('hsbc-bot-export-btn') if event target is inner
        const rpaStart = btn.getAttribute('data-start');
        const rpaEnd = btn.getAttribute('data-end');

        if (rpaStart && rpaEnd) {
            logRPA("Mode Activated");
            logRPA(`From: ${rpaStart}`);
            logRPA(`To: ${rpaEnd}`);
            startDateInput = rpaStart;
            endDateInput = rpaEnd;
        } else {
            // Manual Mode: Prompt User
            startDateInput = prompt("Start Date (dd/mm/yyyy):", defaultStart);
            if (!startDateInput) return;
            endDateInput = prompt("End Date (dd/mm/yyyy):", defaultEnd);
            if (!endDateInput) return;
        }

        // 1. SET DATES
        const startEl = document.getElementById('filter__startDate');
        const endEl = document.getElementById('filter__endDate');

        if (!startEl || !endEl) {
            logError("Date inputs NOT found.");
            return;
        }

        safeSetValue(startEl, startDateInput);
        safeSetValue(endEl, endDateInput);

        // 2. WAIT FOR TABLE RELOAD (Smart Wait)
        // Replaces fixed 5s sleep with mutation observer
        const tableContainer = document.querySelector('.account-transactions-table') || document.body;
        
        log("Waiting for table update...");
        
        // Helper: Wait for mutations to settle (no changes for 1s, max 10s)
        await new Promise((resolve) => {
            let lastMutation = Date.now();
            let hasMutated = false;
            let checkInterval;
            let safetyTimeout;

            const observer = new MutationObserver(() => {
                lastMutation = Date.now();
                hasMutated = true;
                // log("Table updating..."); // Too spammy
            });

            observer.observe(tableContainer, { childList: true, subtree: true });

            // Check every 200ms
            checkInterval = setInterval(() => {
                const now = Date.now();
                // If we have seen mutations and it's been > 1000ms since last one -> Settled
                if (hasMutated && now - lastMutation > 1000) {
                    cleanup("Table settled.");
                } 
                // If we haven't seen mutations yet but it's been > 2000ms, maybe no data changed?
                else if (!hasMutated && now - lastMutation > 2000) {
                     cleanup("No changes detected (Fast/Same data).");
                }
            }, 200);

            // Safety Cutoff (e.g. 10s if real slow)
            safetyTimeout = setTimeout(() => {
                cleanup("Timeout (Max wait reached).");
            }, 10000); 

            function cleanup(reason) {
                clearInterval(checkInterval);
                clearTimeout(safetyTimeout);
                observer.disconnect();
                log(reason);
                resolve();
            }
        });

        // 3. CLICK EXPORT
        const trigger = document.getElementById('export-dropdown-trigger');
        if (!trigger) {
            logError("Export button NOT found.");
            return;
        }

        log("Clicking Export...");
        trigger.click();
        
        // 4. FIND & CLICK EXCEL
        await sleep(1000); 
        log("Looking for Excel...");
        
        // Use user selector primarily
        let excelOption = document.querySelector('#export-dropdown > li:nth-child(3) > span');
        if (!excelOption) {
            log("Selector failed. Searching text 'Excel'...");
            const spans = document.querySelectorAll('span');
            for (let s of spans) {
                if (s.textContent.trim() === 'Excel' && s.offsetParent !== null) {
                    excelOption = s;
                    break;
                }
            }
        }

        if (excelOption) {
            log("Clicking Excel option...");
            excelOption.click();
            log("Waiting for download...");
        } else {
            logError("Excel option NOT found.");
        }

    } catch (err) {
        logError("CRITICAL", err);
    }
}

// --- Main Loop ---
setInterval(() => {
    injectButton();          // Details page button
    injectExportAllButton(); // List page button
    injectCheckboxes();      // List page checkboxes
}, 2000);

// ==============================================
// --- Feature 3: Export All Functions ---
// ==============================================

// Task 5: Helper - Wait for element to appear
function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
        const el = document.querySelector(selector);
        if (el) return resolve(el);

        const observer = new MutationObserver(() => {
            const el = document.querySelector(selector);
            if (el) {
                observer.disconnect();
                resolve(el);
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        setTimeout(() => {
            observer.disconnect();
            reject(new Error(`Timeout waiting for ${selector}`));
        }, timeout);
    });
}

// Task 5: Helper - Wait for button text to change
function waitForButtonText(selector, text, timeout = 60000) {
    return new Promise((resolve, reject) => {
        const check = () => {
            const btn = document.querySelector(selector);
            if (btn && btn.textContent.includes(text)) {
                clearInterval(interval);
                return resolve();
            }
        };

        check();
        const interval = setInterval(check, 500);

        setTimeout(() => {
            clearInterval(interval);
            reject(new Error(`Timeout waiting for "${text}"`));
        }, timeout);
    });
}

// Task 2: Extract accounts from table (with currency)
function extractAccountsFromTable() {
    const accounts = [];
    let currentCurrency = 'UNKNOWN';

    // Get all rows in tbody (both currency headers and account rows)
    const allRows = document.querySelectorAll('tbody.table__body tr');

    allRows.forEach(row => {
        // Currency header row - e.g., "AED (UAE Dirham)"
        if (row.classList.contains('table__row--title')) {
            const currencyCell = row.querySelector('td.presentation-unit__name');
            if (currencyCell) {
                // Extract just the currency code: "AED (UAE Dirham)" → "AED"
                currentCurrency = currencyCell.textContent.trim().split(' ')[0];
            }
            return; // Skip to next row
        }

        // Account row
        if (row.classList.contains('table__row--clickable')) {
            const numberEl = row.querySelector('td.table__cell--sorted span');
            const titleEl = row.querySelector('td.table__cell__at span');

            const number = numberEl?.textContent?.trim();
            const title = titleEl?.textContent?.trim();

            if (number && title) {
                accounts.push({ number, title, currency: currentCurrency, rowElement: row });
            }
        }
    });

    return accounts;
}

// Task 8: Button state updates
function updateExportAllButton(state) {
    const btn = document.getElementById('hsbc-bot-export-all-btn');
    if (!btn) return;

    switch(state) {
        case 'working':
            btn.textContent = 'Exporting...';
            btn.style.backgroundColor = '#ffc107';
            btn.style.color = '#000';
            btn.style.borderColor = '#ffc107';
            btn.disabled = true;
            break;
        case 'done':
            btn.textContent = 'ALL DONE';
            btn.style.backgroundColor = '#28a745';
            btn.style.color = '#fff';
            btn.style.borderColor = '#28a745';
            btn.disabled = false;
            break;
        default: // idle
            btn.textContent = 'Export All';
            btn.style.backgroundColor = '#fff';
            btn.style.color = '#db0011';
            btn.style.borderColor = '#db0011';
            btn.disabled = false;
    }
}

// Task 9: Progress logging
function logExportAll(msg) {
    console.log("[HSBC Bot Export All] " + msg);
    if (!logOverlay && document.body) initLogger();
    if (!logContent) return;

    if (logContent.innerHTML.includes('Watching for actions')) {
        logContent.innerHTML = '';
    }

    logContent.innerHTML += `<div style="padding:2px 0; color:#fbbf24;">› ${msg}</div>`;

    // Keep last 6 lines
    const entries = logContent.querySelectorAll('div');
    if (entries.length > 6) entries[0].remove();
}

// Task 3: Main Export All Handler
async function handleExportAll(e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }

    if (exportAllState.isRunning) {
        log("Export All already running!");
        return;
    }

    // Show date selection modal
    const dateRange = await showDateModal();
    if (!dateRange) {
        log("Export cancelled - no dates selected");
        return;
    }

    const startDate = dateRange.start;
    const endDate = dateRange.end;

    // Get selected accounts (or all if no checkboxes)
    const accounts = getSelectedAccounts();
    const totalAccountsOnPage = document.querySelectorAll('.hsbc-select-checkbox').length;

    if (accounts.length === 0) {
        logExportAll("No accounts selected!");
        return;
    }

    // Check if this is a selective export (user unchecked some accounts)
    const isSelectiveExport = totalAccountsOnPage > 0 && accounts.length < totalAccountsOnPage;

    // Initialize state
    exportAllState = {
        isRunning: true,
        cancelled: false,
        isSelectiveExport: isSelectiveExport,
        accounts: accounts,
        currentIndex: 0,
        completed: [],
        failed: [],
        startDate: startDate,
        endDate: endDate,
        startTime: Date.now()
    };

    logExportAll(`Starting: ${accounts.length} accounts`);
    logExportAll(`Date: ${startDate} to ${endDate}`);
    updateExportAllButton('working');

    // Show progress bar
    updateProgress(0, accounts.length, 'Starting...');

    // Start processing
    processNextAccount();
}

// Task 4: Process Single Account
async function processNextAccount() {
    const { accounts, currentIndex, startDate, endDate, cancelled } = exportAllState;

    // Check if cancelled
    if (cancelled) {
        logExportAll('Export cancelled by user');
        finishExportAll();
        return;
    }

    // Check if done with current page
    if (currentIndex >= accounts.length) {
        handlePageComplete();
        return;
    }

    const account = accounts[currentIndex];
    const total = accounts.length;

    // Update progress bar
    updateProgress(currentIndex + 1, total, account.title);

    logExportAll(`[${currentIndex + 1}/${total}] ${account.title}`);

    try {
        // 1. Find fresh row element (DOM may have been refreshed)
        const rowElement = findRowByAccountNumber(account.number);
        if (!rowElement) {
            throw new Error('Row not found in table');
        }

        // 2. Click account row to go to details
        rowElement.click();

        // 2. Wait for export button to appear (details page loaded)
        await waitForElement('#hsbc-bot-export-btn', 15000);
        await sleep(500); // Brief settle time

        // 3. Send metadata to background for filename
        chrome.runtime.sendMessage({
            action: "set_download_context",
            accountTitle: account.title,
            accountNumber: account.number,
            currency: account.currency,
            dateFrom: startDate.replace(/\//g, '-'),
            dateTo: endDate.replace(/\//g, '-')
        });

        // 4. Set dates and trigger export
        const btn = document.getElementById('hsbc-bot-export-btn');
        btn.setAttribute('data-start', startDate);
        btn.setAttribute('data-end', endDate);
        btn.click();

        // 5. Wait for download to complete
        await waitForButtonText('#hsbc-bot-export-btn', 'DOWNLOAD DONE', 60000);

        // 6. Mark success
        exportAllState.completed.push(account.number);
        logExportAll(`✓ ${account.number}`);

    } catch (err) {
        logExportAll(`✗ FAILED: ${account.number} - ${err.message}`);
        exportAllState.failed.push(account.number);
    }

    // 6. Go back to list
    try {
        const backBtn = document.querySelector('a.detail-header__info-back');
        if (backBtn) {
            backBtn.click();
        }

        // 7. Wait for accounts table to appear
        await waitForElement('table.accounts-table', 10000);
        await sleep(1000); // Let table populate

        // Note: We do NOT re-extract accounts here to preserve the selected list
        // Fresh DOM references are obtained via findRowByAccountNumber()

    } catch (err) {
        logExportAll(`Error returning to list: ${err.message}`);
    }

    // 8. Move to next account
    exportAllState.currentIndex++;
    processNextAccount();
}

// Task 6: Pagination Handler
async function handlePageComplete() {
    // Skip pagination for selective exports - only process what user selected
    if (exportAllState.isSelectiveExport) {
        logExportAll('Selective export complete');
        finishExportAll();
        return;
    }

    // Next page button is an <a> tag when enabled, <span> when disabled
    const nextBtn = document.querySelector('a.pagination__link--arrow[aria-label="Go to next page"]');

    if (nextBtn) {
        logExportAll('Moving to next page...');
        nextBtn.click();

        try {
            await waitForElement('table.accounts-table', 10000);
            await sleep(1500); // Let table populate fully

            // Reset for new page
            exportAllState.accounts = extractAccountsFromTable();
            exportAllState.currentIndex = 0;

            if (exportAllState.accounts.length > 0) {
                logExportAll(`Next page: ${exportAllState.accounts.length} accounts`);
                processNextAccount();
                return;
            }
        } catch (err) {
            logExportAll(`Pagination error: ${err.message}`);
        }
    }

    // No more pages - finish
    finishExportAll();
}

// Task 7: Completion Summary
function finishExportAll() {
    const { completed, failed, cancelled, startDate, endDate, startTime, accounts, currentIndex } = exportAllState;

    // Hide progress bar
    hideProgress();

    if (cancelled) {
        logExportAll('========== CANCELLED ==========');
        logExportAll(`✓ Completed: ${completed.length}`);
        logExportAll(`⊘ Remaining: ${accounts.length - currentIndex}`);
    } else {
        logExportAll('========== COMPLETE ==========');
        logExportAll(`✓ Completed: ${completed.length}`);
        logExportAll(`✗ Failed: ${failed.length}`);
    }

    if (failed.length > 0) {
        console.log("[HSBC Bot] Failed accounts:", failed);
        logExportAll(`Failed: ${failed.join(', ')}`);
    }

    // Save to history
    saveExportHistory({
        id: `export_${Date.now()}`,
        timestamp: new Date().toISOString(),
        dateRange: { from: startDate, to: endDate },
        totalAccounts: accounts.length,
        completed: completed.length,
        failed: failed,
        cancelled: cancelled,
        durationMs: Date.now() - startTime
    });

    exportAllState.isRunning = false;
    updateExportAllButton(cancelled ? 'idle' : 'done');
}

// --- Listen for download confirmation from background ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Skip on redirect page
    if (CURRENT_URL.includes(REDIRECT_URL_KEYWORD)) return;

    console.log("[HSBC Bot] Message received:", message);
    if (message.action === "download_started") {
        log("=== DOWNLOAD STARTED ===");
        const btn = document.getElementById('hsbc-bot-export-btn');
        if (btn) {
            btn.textContent = 'DOWNLOAD DONE';
            btn.style.backgroundColor = '#28a745';
            btn.style.color = '#fff';
            btn.style.borderColor = '#28a745';
            log("Button updated!");
        }
    }
}); 

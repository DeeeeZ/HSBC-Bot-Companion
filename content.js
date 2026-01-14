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
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
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
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 11px;
    `;

    logOverlay.innerHTML = `
        <div id="hsbc-logger-panel" style="
            background: rgba(17, 24, 39, 0.96);
            border: 1px solid rgba(75, 85, 99, 0.3);
            border-radius: 8px;
            padding: 10px 12px;
            min-width: 260px;
            max-width: 360px;
            max-height: 300px;
            overflow-y: auto;
            color: rgba(255,255,255,0.92);
            box-shadow: 0 4px 16px rgba(0,0,0,0.3);
        ">
            <div id="hsbc-logger-header" style="
                display: flex;
                align-items: center;
                gap: 8px;
                padding-bottom: 8px;
                margin-bottom: 8px;
                border-bottom: 1px solid rgba(75, 85, 99, 0.4);
                font-weight: 600;
                font-size: 10px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: rgba(156, 163, 175, 0.9);
            ">
                <span id="hsbc-status-dot" style="
                    width: 8px;
                    height: 8px;
                    background: ${statusColor};
                    border-radius: 50%;
                    box-shadow: 0 0 6px ${statusColor};
                "></span>
                <span style="flex:1;">HSBC Bot · ${pageType}</span>
                <button id="hsbc-logger-minimize" style="
                    background: none;
                    border: none;
                    color: rgba(156, 163, 175, 0.7);
                    cursor: pointer;
                    padding: 2px 6px;
                    font-size: 14px;
                    line-height: 1;
                    border-radius: 4px;
                    transition: all 0.15s;
                " title="Minimize">−</button>
            </div>
            <div id="hsbc-logger-content" style="font-size: 11px; line-height: 1.4;">
                <div style="color: rgba(156, 163, 175, 0.7);">Watching for actions...</div>
            </div>
        </div>
        <div id="hsbc-logger-minimized" style="
            display: none;
            background: rgba(17, 24, 39, 0.96);
            border: 1px solid rgba(75, 85, 99, 0.3);
            border-radius: 8px;
            padding: 8px 12px;
            color: rgba(255,255,255,0.92);
            box-shadow: 0 4px 16px rgba(0,0,0,0.3);
            cursor: pointer;
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            transition: all 0.15s ease;
        ">
            <span style="
                display: inline-block;
                width: 8px;
                height: 8px;
                background: ${statusColor};
                border-radius: 50%;
                box-shadow: 0 0 6px ${statusColor};
                margin-right: 8px;
            "></span>
            HSBC Bot
        </div>
    `;

    document.body.appendChild(logOverlay);
    logContent = document.getElementById('hsbc-logger-content');

    // Minimize button handler
    const minimizeBtn = document.getElementById('hsbc-logger-minimize');
    const panel = document.getElementById('hsbc-logger-panel');
    const minimizedBar = document.getElementById('hsbc-logger-minimized');

    minimizeBtn.onmouseover = () => {
        minimizeBtn.style.background = 'rgba(255,255,255,0.1)';
        minimizeBtn.style.color = 'rgba(255,255,255,0.9)';
    };
    minimizeBtn.onmouseout = () => {
        minimizeBtn.style.background = 'none';
        minimizeBtn.style.color = 'rgba(255,255,255,0.5)';
    };
    minimizeBtn.onclick = () => {
        panel.style.display = 'none';
        minimizedBar.style.display = 'block';
    };

    // Click minimized bar to expand
    minimizedBar.onclick = () => {
        minimizedBar.style.display = 'none';
        panel.style.display = 'block';
    };
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
    if (entries.length > 20) entries[0].remove();
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

    logContent.innerHTML += `<div style="padding:2px 0; color:#ef4444;">✕ ${msg}</div>`;
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

// Extract account info from details page header (for Auto Export file naming)
function extractAccountInfoFromDetailsPage() {
    try {
        const numberEl = document.querySelector('div.detail-header__number');
        const titleEl = document.querySelector('h1.detail-header__favorite-title > span:first-child');
        const currencyEl = document.querySelector('span.detail-header__name--currency');

        if (!numberEl || !titleEl || !currencyEl) return null;

        // Extract account number (first token: "035-315001-001 AE Current account" → "035-315001-001")
        const number = numberEl.textContent.trim().split(/\s+/)[0];
        const title = titleEl.textContent.trim();
        const currency = currencyEl.textContent.trim();

        return { number, title, currency };
    } catch (e) {
        console.log('[HSBC Bot] Failed to extract account info:', e);
        return null;
    }
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
                            padding:10px 24px;
                            border:1px solid #d1d5db;
                            background:#ffffff;
                            color:#6b7280;
                            border-radius:6px;
                            cursor:pointer;
                            font-size:13px;
                            font-weight:600;
                            font-family:inherit;
                            transition:all 0.15s ease;
                        ">Cancel</button>
                        <button id="modal-start-export" style="
                            padding:10px 24px;
                            border:none;
                            background:#db0011;
                            color:white;
                            border-radius:6px;
                            cursor:pointer;
                            font-size:13px;
                            font-weight:600;
                            font-family:inherit;
                            box-shadow:0 1px 3px rgba(0,0,0,0.1);
                            transition:all 0.15s ease;
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
            startExportBtn.style.background = '#c50010';
            startExportBtn.style.transform = 'translateY(-1px)';
            startExportBtn.style.boxShadow = '0 4px 8px rgba(219,0,17,0.2)';
        };
        startExportBtn.onmouseout = () => {
            startExportBtn.style.background = '#db0011';
            startExportBtn.style.transform = 'translateY(0)';
            startExportBtn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
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

// Keep Alive State
let keepAliveInterval = null;
let keepAliveActive = true; // ON by default

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

    // Add keyboard shortcut hint next to page title
    const pageTitle = document.querySelector('#innerPage > div > div > div > div.account-information > section.page-main__panel > div.page-main__panel-title-wrap > h1');
    if (pageTitle && !document.getElementById('hsbc-bot-shortcut-hint')) {
        const hint = document.createElement('span');
        hint.id = 'hsbc-bot-shortcut-hint';
        hint.innerHTML = '<kbd>Alt</kbd> <kbd>Shift</kbd> <kbd>E</kbd> to start Export';
        hint.title = 'Press Alt+Shift+E to trigger Export All';
        hint.style.cssText = `
            display: inline-flex;
            align-items: center;
            gap: 6px;
            margin-left: 20px;
            padding: 10px 18px;
            background: linear-gradient(135deg, #db0011 0%, #a8000d 100%);
            border: 2px solid #db0011;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 700;
            font-family: inherit;
            color: #fff;
            letter-spacing: 0.3px;
            box-shadow: 0 4px 12px rgba(219, 0, 17, 0.3);
            cursor: pointer;
            vertical-align: middle;
            transition: all 0.2s ease;
        `;

        // Style the kbd elements
        const kbdStyle = `
            display: inline-block;
            padding: 4px 8px;
            background: rgba(255,255,255,0.2);
            border: 1px solid rgba(255,255,255,0.3);
            border-radius: 4px;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 14px;
            font-weight: 600;
            box-shadow: 0 2px 0 rgba(0,0,0,0.2);
        `;
        hint.querySelectorAll('kbd').forEach(kbd => kbd.style.cssText = kbdStyle);

        hint.onmouseover = () => {
            hint.style.transform = 'scale(1.05)';
            hint.style.boxShadow = '0 6px 16px rgba(219, 0, 17, 0.4)';
        };
        hint.onmouseout = () => {
            hint.style.transform = 'scale(1)';
            hint.style.boxShadow = '0 4px 12px rgba(219, 0, 17, 0.3)';
        };
        hint.onclick = () => {
            const exportAllBtn = document.getElementById('hsbc-bot-export-all-btn');
            if (exportAllBtn) exportAllBtn.click();
        };
        pageTitle.appendChild(hint);
    }

    // Keep Alive checkbox - inject into right toolbar next to Subtotal row
    const rightToolbar = document.querySelector('ul.table-actions__group--right-ai');
    if (rightToolbar && !document.getElementById('hsbc-bot-keep-alive-btn')) {
        const li = document.createElement('li');
        li.className = 'table-actions__group-item';

        const fieldset = document.createElement('fieldset');
        fieldset.className = 'table-actions__checkboxes';

        const checkbox = document.createElement('input');
        checkbox.className = 'table-actions__check';
        checkbox.type = 'checkbox';
        checkbox.id = 'hsbc-bot-keep-alive-btn';
        checkbox.checked = true;
        checkbox.onchange = toggleKeepAlive;

        // Start keep alive interval on injection
        if (!keepAliveInterval) {
            keepAliveInterval = setInterval(() => {
                // Simulate comprehensive user activity
                const targets = [document, window, document.body];
                targets.forEach(target => {
                    if (target) {
                        target.dispatchEvent(new MouseEvent('mousemove', {
                            bubbles: true,
                            clientX: Math.random() * window.innerWidth,
                            clientY: Math.random() * window.innerHeight
                        }));
                    }
                });

                // Also dispatch keyboard and scroll events
                document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Shift' }));
                window.dispatchEvent(new Event('scroll', { bubbles: true }));

                log("Keep Alive: Ping");
            }, 60000); // 1 minute
            // Keep Alive started silently
        }

        const label = document.createElement('label');
        label.htmlFor = 'hsbc-bot-keep-alive-btn';
        label.className = 'table-actions__check-label';
        label.textContent = 'Keep Alive';

        fieldset.appendChild(checkbox);
        fieldset.appendChild(label);
        li.appendChild(fieldset);

        // Insert after Subtotal row (first child)
        const subtotalItem = rightToolbar.querySelector('li');
        if (subtotalItem && subtotalItem.nextSibling) {
            rightToolbar.insertBefore(li, subtotalItem.nextSibling);
        } else {
            rightToolbar.appendChild(li);
        }
    }

    isInjectingExportAll = false;
}

// Keep Alive Toggle
function toggleKeepAlive() {
    if (keepAliveActive) {
        // Turn OFF
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
        keepAliveActive = false;
        log("Keep Alive: OFF");
    } else {
        // Turn ON - dispatch activity every 1 minute
        keepAliveActive = true;
        keepAliveInterval = setInterval(() => {
            // Simulate comprehensive user activity
            const targets = [document, window, document.body];
            targets.forEach(target => {
                if (target) {
                    target.dispatchEvent(new MouseEvent('mousemove', {
                        bubbles: true,
                        clientX: Math.random() * window.innerWidth,
                        clientY: Math.random() * window.innerHeight
                    }));
                }
            });

            // Also dispatch keyboard and scroll events
            document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Shift' }));
            window.dispatchEvent(new Event('scroll', { bubbles: true }));

            log("Keep Alive: Ping");
        }, 60000); // 1 minute
        // Keep Alive started silently
    }
    updateKeepAliveButton();
}

function updateKeepAliveButton() {
    const checkbox = document.getElementById('hsbc-bot-keep-alive-btn');
    if (!checkbox) return;
    checkbox.checked = keepAliveActive;
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
        button.setAttribute('data-status', 'idle');
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

        // 1. CLICK EDIT BUTTON TO REVEAL DATE FIELDS (if needed)
        log("Looking for date inputs...");
        let startEl = document.getElementById('dateFieldFrom-field');
        let endEl = document.getElementById('dateFieldTo-field');

        // If date fields not visible, click the edit button to reveal them
        if (!startEl || !endEl) {
            log("Date fields hidden, clicking edit button...");
            const editBtn = document.getElementById('edit_date');
            if (editBtn) {
                editBtn.click();
                await sleep(1000); // Wait for fields to appear (increased from 500ms)

                // Double-check and retry click if still not visible
                startEl = document.getElementById('dateFieldFrom-field');
                if (!startEl) {
                    log("Retrying edit button click...");
                    editBtn.click();
                    await sleep(1000);
                }
            } else {
                log("Edit button not found - date fields may already be visible");
            }
        }

        // 2. WAIT FOR DATE INPUTS TO LOAD
        log("Waiting for date inputs...");
        try {
            startEl = await waitForElement('#dateFieldFrom-field', 10000);
            endEl = await waitForElement('#dateFieldTo-field', 5000);
        } catch (err) {
            logError("Date inputs NOT found after waiting.");
            const btn = document.getElementById('hsbc-bot-export-btn');
            if (btn) {
                btn.setAttribute('data-status', 'error');
                btn.textContent = 'ERROR';
                btn.style.backgroundColor = '#ef4444';
            }
            return;
        }

        if (!startEl || !endEl) {
            logError("Date inputs NOT found.");
            const btn = document.getElementById('hsbc-bot-export-btn');
            if (btn) {
                btn.setAttribute('data-status', 'error');
                btn.textContent = 'ERROR';
                btn.style.backgroundColor = '#ef4444';
            }
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

        // 2.5. SEND DOWNLOAD CONTEXT (for file renaming)
        const accountInfo = extractAccountInfoFromDetailsPage();
        if (accountInfo) {
            chrome.runtime.sendMessage({
                action: "set_download_context",
                accountTitle: accountInfo.title,
                accountNumber: accountInfo.number,
                currency: accountInfo.currency,
                dateFrom: startDateInput.replace(/\//g, '-'),
                dateTo: endDateInput.replace(/\//g, '-')
            });
            log(`Context set: ${accountInfo.title} (${accountInfo.number})`);
        } else {
            log("Warning: Could not extract account info for file naming");
        }

        // 3. CLICK EXPORT
        const trigger = document.getElementById('export-dropdown-trigger');
        if (!trigger) {
            logError("Export button NOT found.");
            return;
        }

        // Set status for PAD polling
        const exportBtn = document.getElementById('hsbc-bot-export-btn');
        if (exportBtn) exportBtn.setAttribute('data-status', 'exporting');

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
        const errorBtn = document.getElementById('hsbc-bot-export-btn');
        if (errorBtn) errorBtn.setAttribute('data-status', 'error');
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

// Task 5: Helper - Wait for element to appear (with proper cleanup)
function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
        const el = document.querySelector(selector);
        if (el) return resolve(el);

        let observer = null;
        let timeoutId = null;
        let resolved = false;

        const cleanup = () => {
            if (observer) {
                observer.disconnect();
                observer = null;
            }
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
        };

        observer = new MutationObserver(() => {
            if (resolved) return;
            const el = document.querySelector(selector);
            if (el) {
                resolved = true;
                cleanup();
                resolve(el);
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        timeoutId = setTimeout(() => {
            if (resolved) return;
            resolved = true;
            cleanup();
            reject(new Error(`Timeout waiting for ${selector}`));
        }, timeout);
    });
}

// Task 5: Helper - Wait for button text to change (with proper cleanup)
function waitForButtonText(selector, text, timeout = 60000) {
    return new Promise((resolve, reject) => {
        let interval = null;
        let timeoutId = null;
        let resolved = false;

        const cleanup = () => {
            if (interval) {
                clearInterval(interval);
                interval = null;
            }
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
        };

        const check = () => {
            if (resolved) return;
            const btn = document.querySelector(selector);
            if (btn && btn.textContent.includes(text)) {
                resolved = true;
                cleanup();
                resolve();
            }
        };

        check();
        interval = setInterval(check, 500);

        timeoutId = setTimeout(() => {
            if (resolved) return;
            resolved = true;
            cleanup();
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
    if (entries.length > 20) entries[0].remove();
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
        // 1. Verify we're on the accounts list page
        if (!isAccountsListPage()) {
            logExportAll('Not on list page, waiting...');
            await waitForElement('table.accounts-table', 10000);
            await sleep(1000);
        }

        // 2. Find fresh row element (DOM may have been refreshed)
        const rowElement = findRowByAccountNumber(account.number);
        if (!rowElement) {
            // Maybe we're on wrong pagination page - log and skip
            throw new Error('Row not found in table (may be on different page)');
        }

        // 2. Click account row to go to details
        rowElement.click();

        // 3. Wait for details page to load (look for header actions container first)
        await waitForElement('ul.header-actions', 10000);

        // Also wait for the edit date button to be available (date fields are hidden until clicked)
        await waitForElement('#edit_date', 10000);
        await sleep(300); // Let page settle

        // 4. Force button injection if not present
        if (!document.getElementById('hsbc-bot-export-btn')) {
            await injectButton();
            await sleep(300);
        }

        // 5. Wait for export button (should be there now)
        await waitForElement('#hsbc-bot-export-btn', 5000);

        // 3. Send metadata to background for filename
        chrome.runtime.sendMessage({
            action: "set_download_context",
            accountTitle: account.title,
            accountNumber: account.number,
            currency: account.currency,
            dateFrom: startDate.replace(/\//g, '-'),
            dateTo: endDate.replace(/\//g, '-')
        });

        // 4. Set current account for download verification
        setCurrentExportAccount(account.number);

        // 5. Reset button state and trigger export
        const btn = document.getElementById('hsbc-bot-export-btn');
        btn.textContent = 'Auto Export';
        btn.setAttribute('data-status', 'idle');
        btn.style.backgroundColor = '';
        btn.style.color = '';
        btn.style.borderColor = '';
        btn.setAttribute('data-start', startDate);
        btn.setAttribute('data-end', endDate);
        btn.click();

        // 5. Wait for download to complete
        await waitForButtonText('#hsbc-bot-export-btn', 'DOWNLOAD DONE', 60000);

        // 6. Mark success - store full account details
        exportAllState.completed.push({
            accountNumber: account.number,
            accountTitle: account.title,
            currency: account.currency
        });
        logExportAll(`✓ ${account.number}`);

    } catch (err) {
        logExportAll(`✗ FAILED: ${account.number} - ${err.message}`);
        // Store full account details with error message
        exportAllState.failed.push({
            accountNumber: account.number,
            accountTitle: account.title,
            currency: account.currency,
            error: err.message
        });
    }

    // 6. Go back to list
    try {
        const backBtn = document.querySelector('a.detail-header__info-back');
        if (backBtn) {
            backBtn.click();
        } else {
            // Fallback: use browser back
            window.history.back();
        }

        // 7. Wait for accounts table to appear
        await waitForElement('table.accounts-table', 15000);
        await sleep(1500); // Let table fully populate

        // 8. Verify we're on list page
        if (!isAccountsListPage()) {
            logExportAll('Warning: Not on list page, attempting recovery...');
            window.history.back();
            await waitForElement('table.accounts-table', 10000);
            await sleep(1000);
        }

    } catch (err) {
        logExportAll(`Error returning to list: ${err.message}`);
        // Recovery: try to get back to list page
        try {
            window.history.back();
            await sleep(2000);
        } catch (e) {
            // Give up on recovery
        }
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

// --- JSON Export Log ---
function downloadExportLog(exportData) {
    const jsonStr = JSON.stringify(exportData, null, 2);

    // Send to background.js to download with proper subfolder path
    chrome.runtime.sendMessage({
        action: 'download_json_log',
        content: jsonStr,
        filename: 'HSBC_Export_Log.json'
    }, (response) => {
        if (response && response.success) {
            log('Export log saved to HSBC_Exports folder');
        } else {
            // Fallback to blob download if background fails
            log('Fallback: saving to Downloads root');
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'HSBC_Export_Log.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    });
}

// --- Reconciliation State & Functions ---
let reconState = {
    status: 'idle',  // idle, checking, running, success, error, unavailable
    result: null
};

// Check native host availability
async function checkReconAvailability() {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: "check_native_host" }, (response) => {
            if (chrome.runtime.lastError) {
                resolve(false);
            } else {
                resolve(response?.available === true);
            }
        });
    });
}

// Trigger reconciliation via background script
function triggerReconciliation() {
    reconState.status = 'running';
    reconState.result = null;
    updateReconUI();

    chrome.runtime.sendMessage(
        { action: "run_reconciliation", options: { bank: "HSBC" } },
        (response) => {
            if (chrome.runtime.lastError) {
                reconState.status = 'error';
                reconState.result = { error: chrome.runtime.lastError.message };
            } else if (response && response.success) {
                reconState.status = 'success';
                reconState.result = response;
                log(`Reconciliation complete: ${response.steps?.reconciliation?.matched || 0} matched`);
            } else {
                reconState.status = 'error';
                reconState.result = response || { error: 'Unknown error' };
            }
            updateReconUI();
        }
    );
}

// Update reconciliation UI in modal
function updateReconUI() {
    const reconArea = document.getElementById('recon-status-area');
    const reconBtn = document.getElementById('recon-run-btn');

    if (!reconArea) return;

    switch (reconState.status) {
        case 'checking':
            reconArea.innerHTML = `
                <div style="display:flex; align-items:center; gap:8px; color:#6b7280; justify-content:center;">
                    <div class="hsbc-spinner-small"></div>
                    <span style="font-size:12px;">Checking reconciliation service...</span>
                </div>
            `;
            if (reconBtn) reconBtn.style.display = 'none';
            break;

        case 'unavailable':
            reconArea.innerHTML = `
                <div style="color:#9ca3af; font-size:11px; text-align:center;">
                    Reconciliation service not installed
                </div>
            `;
            if (reconBtn) reconBtn.style.display = 'none';
            break;

        case 'running':
            reconArea.innerHTML = `
                <div style="display:flex; align-items:center; gap:8px; color:#3b82f6; justify-content:center;">
                    <div class="hsbc-spinner-small"></div>
                    <span style="font-size:12px;">Running bank reconciliation...</span>
                </div>
            `;
            if (reconBtn) {
                reconBtn.disabled = true;
                reconBtn.style.opacity = '0.6';
                reconBtn.style.cursor = 'not-allowed';
                reconBtn.textContent = 'Running...';
            }
            break;

        case 'success':
            const r = reconState.result || {};
            const matched = r.steps?.reconciliation?.matched ?? '?';
            const time = r.total_time_seconds ? `${Math.round(r.total_time_seconds)}s` : '';
            reconArea.innerHTML = `
                <div style="background:#ecfdf5; border:1px solid #a7f3d0; border-radius:6px; padding:10px 12px;">
                    <div style="display:flex; align-items:center; gap:6px; color:#059669; font-weight:600; font-size:13px; margin-bottom:4px; justify-content:center;">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="width:16px;height:16px;"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
                        Reconciliation Complete
                    </div>
                    <div style="font-size:11px; color:#047857; text-align:center;">
                        ${matched} transactions matched${time ? ` in ${time}` : ''}
                    </div>
                </div>
            `;
            if (reconBtn) reconBtn.style.display = 'none';
            break;

        case 'error':
            const err = reconState.result || {};
            reconArea.innerHTML = `
                <div style="background:#fef2f2; border:1px solid #fecaca; border-radius:6px; padding:10px 12px;">
                    <div style="display:flex; align-items:center; gap:6px; color:#dc2626; font-weight:600; font-size:13px; margin-bottom:4px; justify-content:center;">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        Reconciliation Failed
                    </div>
                    <div style="font-size:10px; color:#991b1b; text-align:center; word-break:break-word;">${err.error || 'Unknown error'}</div>
                </div>
            `;
            if (reconBtn) {
                reconBtn.disabled = false;
                reconBtn.style.opacity = '1';
                reconBtn.style.cursor = 'pointer';
                reconBtn.textContent = 'Retry';
                reconBtn.style.display = 'inline-block';
            }
            break;

        default: // idle
            reconArea.innerHTML = '';
            if (reconBtn) {
                reconBtn.disabled = false;
                reconBtn.style.opacity = '1';
                reconBtn.style.cursor = 'pointer';
                reconBtn.textContent = 'Run Reconciliation';
                reconBtn.style.display = 'inline-block';
            }
    }
}

// Inject spinner styles for reconciliation UI
function injectReconStyles() {
    if (document.getElementById('hsbc-recon-styles')) return;
    const style = document.createElement('style');
    style.id = 'hsbc-recon-styles';
    style.textContent = `
        .hsbc-spinner-small {
            width: 14px;
            height: 14px;
            border: 2px solid #e5e7eb;
            border-top-color: #3b82f6;
            border-radius: 50%;
            animation: hsbc-spin 0.8s linear infinite;
        }
        @keyframes hsbc-spin {
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
}

// --- Completion Modal ---
function showCompletionModal(summary) {
    // Remove existing modal if any
    const existing = document.getElementById('hsbc-completion-modal');
    if (existing) existing.remove();

    const { completed, failed, cancelled, duration, dateRange } = summary;
    const totalProcessed = completed.length + failed.length;

    let statusIcon, statusColor, statusText, statusBg;
    if (cancelled) {
        statusIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="width:28px;height:28px;"><path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>`;
        statusColor = '#d97706';
        statusBg = '#fffbeb';
        statusText = 'Export Cancelled';
    } else if (failed.length > 0) {
        statusIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="width:28px;height:28px;"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>`;
        statusColor = '#dc2626';
        statusBg = '#fef2f2';
        statusText = 'Export Completed with Errors';
    } else {
        statusIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="width:28px;height:28px;"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>`;
        statusColor = '#059669';
        statusBg = '#ecfdf5';
        statusText = 'Export Completed';
    }

    const modal = document.createElement('div');
    modal.id = 'hsbc-completion-modal';
    modal.innerHTML = `
        <div style="position:fixed; inset:0; background:rgba(0,0,0,0.4); backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px); z-index:2147483647; display:flex; align-items:center; justify-content:center; animation:fadeIn 0.2s ease-out;">
            <div style="background:white; padding:28px; border-radius:12px; min-width:380px; max-width:460px; box-shadow:0 20px 40px rgba(0,0,0,0.15); font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; animation:modalSlideIn 0.3s ease-out;">
                <div style="text-align:center; margin-bottom:20px;">
                    <div style="width:56px; height:56px; background:${statusBg}; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 14px; color:${statusColor};">
                        ${statusIcon}
                    </div>
                    <h2 style="margin:0; color:#111827; font-size:18px; font-weight:600;">${statusText}</h2>
                    <p style="margin:6px 0 0; color:#6b7280; font-size:13px;">${dateRange}</p>
                </div>

                <div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:14px; margin-bottom:20px;">
                    <div style="display:grid; grid-template-columns:1fr 1fr ${failed.length > 0 ? '1fr' : ''}; gap:12px; text-align:center;">
                        <div>
                            <div style="font-size:24px; font-weight:700; color:#10b981;">${completed.length}</div>
                            <div style="font-size:11px; color:#6b7280; text-transform:uppercase; letter-spacing:0.3px; font-weight:500;">Completed</div>
                        </div>
                        ${failed.length > 0 ? `
                        <div style="border-left:1px solid #e5e7eb; border-right:1px solid #e5e7eb;">
                            <div style="font-size:24px; font-weight:700; color:#ef4444;">${failed.length}</div>
                            <div style="font-size:11px; color:#6b7280; text-transform:uppercase; letter-spacing:0.3px; font-weight:500;">Failed</div>
                        </div>
                        ` : ''}
                        <div>
                            <div style="font-size:24px; font-weight:700; color:#3b82f6;">${duration}</div>
                            <div style="font-size:11px; color:#6b7280; text-transform:uppercase; letter-spacing:0.3px; font-weight:500;">Duration</div>
                        </div>
                    </div>
                </div>

                ${failed.length > 0 ? `
                <div style="background:#fef2f2; border:1px solid #fecaca; border-radius:6px; padding:10px 12px; margin-bottom:20px; max-height:100px; overflow-y:auto;">
                    <div style="font-size:11px; font-weight:600; color:#991b1b; margin-bottom:6px;">Failed Accounts:</div>
                    ${failed.slice(0, 3).map(f => `<div style="font-size:11px; color:#7f1d1d; padding:2px 0;">${f.accountTitle} (${f.accountNumber})</div>`).join('')}
                    ${failed.length > 3 ? `<div style="font-size:11px; color:#991b1b; padding:2px 0; font-weight:500;">...and ${failed.length - 3} more</div>` : ''}
                </div>
                ` : ''}

                <div id="recon-status-area" style="margin-bottom:12px; min-height:20px;"></div>

                <div style="display:flex; justify-content:center; gap:10px;">
                    <button id="recon-run-btn" style="
                        padding:10px 20px;
                        border:2px solid #3b82f6;
                        background:#eff6ff;
                        color:#1d4ed8;
                        border-radius:6px;
                        cursor:pointer;
                        font-size:13px;
                        font-weight:600;
                        font-family:inherit;
                        transition:all 0.15s ease;
                        display:none;
                    ">Run Reconciliation</button>
                    <button id="completion-close-btn" style="
                        padding:10px 28px;
                        border:none;
                        background:#db0011;
                        color:white;
                        border-radius:6px;
                        cursor:pointer;
                        font-size:13px;
                        font-weight:600;
                        font-family:inherit;
                        box-shadow:0 1px 3px rgba(0,0,0,0.1);
                        transition:all 0.15s ease;
                    ">Close</button>
                </div>

                <p style="text-align:center; margin:14px 0 0; color:#9ca3af; font-size:10px;">
                    Export log saved as HSBC_Export_Log.json
                </p>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Inject spinner styles
    injectReconStyles();

    // Close button handler
    const closeBtn = document.getElementById('completion-close-btn');
    closeBtn.onmouseover = () => {
        closeBtn.style.background = '#c50010';
        closeBtn.style.transform = 'translateY(-1px)';
        closeBtn.style.boxShadow = '0 4px 8px rgba(219,0,17,0.2)';
    };
    closeBtn.onmouseout = () => {
        closeBtn.style.background = '#db0011';
        closeBtn.style.transform = 'translateY(0)';
        closeBtn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
    };
    closeBtn.onclick = () => modal.remove();

    // Reconciliation button handler
    const reconBtn = document.getElementById('recon-run-btn');
    reconBtn.onmouseover = () => {
        if (!reconBtn.disabled) {
            reconBtn.style.background = '#dbeafe';
            reconBtn.style.transform = 'translateY(-1px)';
        }
    };
    reconBtn.onmouseout = () => {
        if (!reconBtn.disabled) {
            reconBtn.style.background = '#eff6ff';
            reconBtn.style.transform = 'translateY(0)';
        }
    };
    reconBtn.onclick = () => {
        if (!reconBtn.disabled) {
            triggerReconciliation();
        }
    };

    // Check native host availability
    reconState = { status: 'checking', result: null };
    updateReconUI();
    checkReconAvailability().then(available => {
        reconState.status = available ? 'idle' : 'unavailable';
        updateReconUI();
    });

    // Close on overlay click
    modal.firstElementChild.onclick = (e) => {
        if (e.target === modal.firstElementChild) {
            modal.remove();
        }
    };
}

// Task 7: Completion Summary
function finishExportAll() {
    const { completed, failed, cancelled, startDate, endDate, startTime, accounts, currentIndex } = exportAllState;

    // Hide progress bar
    hideProgress();

    // Calculate duration
    const durationMs = Date.now() - startTime;
    const durationSec = Math.floor(durationMs / 1000);
    const durationMin = Math.floor(durationSec / 60);
    const durationStr = durationMin > 0 ? `${durationMin}m ${durationSec % 60}s` : `${durationSec}s`;

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
        logExportAll(`Failed: ${failed.map(f => f.accountNumber).join(', ')}`);
    }

    // Build export log data
    const exportLogData = {
        exportId: `export_${Date.now()}`,
        timestamp: new Date().toISOString(),
        dateRange: {
            from: startDate,
            to: endDate
        },
        summary: {
            total: completed.length + failed.length,
            completed: completed.length,
            failed: failed.length,
            cancelled: cancelled,
            durationSeconds: durationSec
        },
        completed: completed,
        failed: failed
    };

    // Download JSON log file
    downloadExportLog(exportLogData);

    // Show completion modal
    showCompletionModal({
        completed: completed,
        failed: failed,
        cancelled: cancelled,
        duration: durationStr,
        dateRange: startDate === endDate ? startDate : `${startDate} → ${endDate}`
    });

    // Save to Chrome storage history (for popup)
    saveExportHistory({
        id: exportLogData.exportId,
        timestamp: exportLogData.timestamp,
        dateRange: { from: startDate, to: endDate },
        totalAccounts: completed.length + failed.length,
        completed: completed.length,
        failed: failed.map(f => f.accountNumber),
        cancelled: cancelled,
        durationMs: durationMs
    });

    exportAllState.isRunning = false;
    updateExportAllButton(cancelled ? 'idle' : 'done');
}

// --- Track current export for verification ---
let currentExportAccount = null;

function setCurrentExportAccount(accountNumber) {
    currentExportAccount = accountNumber;
}

function clearCurrentExportAccount() {
    currentExportAccount = null;
}

// --- Listen for download confirmation from background ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Skip on redirect page
    if (CURRENT_URL.includes(REDIRECT_URL_KEYWORD)) return;

    console.log("[HSBC Bot] Message received:", message);
    if (message.action === "download_started") {
        const btn = document.getElementById('hsbc-bot-export-btn');
        if (!btn) return;

        // Verify the download is for the account we're expecting
        if (currentExportAccount && message.context) {
            if (message.context.number !== currentExportAccount) {
                console.log(`[HSBC Bot] Download context mismatch: expected ${currentExportAccount}, got ${message.context.number}`);
                return; // Ignore - not our download
            }
        }

        log("=== DOWNLOAD CONFIRMED ===");
        btn.textContent = 'DOWNLOAD DONE';
        btn.setAttribute('data-status', 'done');
        btn.style.backgroundColor = '#28a745';
        btn.style.color = '#fff';
        btn.style.borderColor = '#28a745';
        clearCurrentExportAccount();
    }

    // Keyboard shortcut: Export All (Alt+Shift+E)
    if (message.action === "keyboard_export_all") {
        log("Keyboard shortcut: Export All");
        const exportAllBtn = document.getElementById('hsbc-bot-export-all-btn');
        if (exportAllBtn) {
            exportAllBtn.click();
        } else {
            log("Export All button not found - are you on the Accounts List page?");
        }
    }

    // Keyboard shortcut: Auto Export (Alt+Shift+X)
    if (message.action === "keyboard_auto_export") {
        log("Keyboard shortcut: Auto Export");
        const autoExportBtn = document.getElementById('hsbc-bot-export-btn');
        if (autoExportBtn) {
            autoExportBtn.click();
        } else {
            log("Auto Export button not found - are you on an Account Details page?");
        }
    }
}); 

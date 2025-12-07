// HSBC Bot Companion - Content Script (Title Lock & Verify Version)

const CURRENT_URL = window.location.href;
console.log(`HSBC Bot Companion: Loaded on ${CURRENT_URL}`);

// --- Visual Logger ---
let logOverlay;

function initLogger() {
    if (logOverlay) return;
    if (!document.body) return; // Wait for body

    logOverlay = document.createElement('div');
    logOverlay.style.cssText = 'position:fixed; bottom:10px; left:10px; background:rgba(0,0,0,0.9); color:#00ff00; padding:10px; z-index:2147483647; font-family:monospace; font-size:14px; pointer-events:none; max-width: 500px; border-radius: 5px; border: 1px solid #00ff00; box-shadow: 0 0 10px rgba(0,0,0,0.5);';
    
    // Show current page type
    let pageType = "Unknown";
    if (CURRENT_URL.includes("GIBRfdRedirect")) pageType = "REDIRECT PAGE";
    else if (CURRENT_URL.includes("/accounts/details/")) pageType = "ACCOUNTS PAGE";

    logOverlay.innerHTML = `HSBC Bot: ${pageType}<br>`;
    document.body.appendChild(logOverlay);
}

function log(msg) {
    console.log("[HSBC Bot] " + msg);
    
    // Try to init if missing (e.g. body wasn't ready before)
    if (!logOverlay && document.body) initLogger();
    
    if (logOverlay) {
        logOverlay.innerHTML += `> ${msg}<br>`;
        const lines = logOverlay.innerHTML.split('<br>');
        if (lines.length > 8) {
            logOverlay.innerHTML = lines.slice(lines.length - 8).join('<br>');
        }
    }
}

// Init when safe
if (document.body) {
    initLogger();
} else {
    document.addEventListener('DOMContentLoaded', initLogger);
}


function logError(msg, err) {
    console.error("[HSBC Bot Error] " + msg, err);
    logOverlay.innerHTML += `<span style="color:red">> ERROR: ${msg}</span><br>`;
}

function logRPA(msg) {
    console.log("[HSBC Bot RPA] " + msg);
    if (!logOverlay && document.body) initLogger();
    if (logOverlay) {
        logOverlay.innerHTML += `<span style="color:#00bfff">> [RPA] ${msg}</span><br>`;
    }
}

// --- Configuration ---
const REDIRECT_URL_KEYWORD = "GIBRfdRedirect";
const ACCOUNTS_PAGE_HASH_KEYWORD = "/accounts/details/";

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
    accounts: [],        // [{number, title, rowElement}]
    currentIndex: 0,
    completed: [],
    failed: [],
    startDate: '',       // yesterday dd/mm/yyyy
    endDate: ''          // yesterday dd/mm/yyyy
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
        button.style.cssText = 'background-color: #db0011; color: #fff; border: none; padding: 8px 16px; cursor: pointer; font-weight: bold; border-radius: 4px;';

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
        // Integrated Style (Ghost Button)
        button.style.cssText = 'background-color: #fff; color: #db0011; border: 1px solid #ccc; cursor: pointer; margin-left: 10px;';

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
    logOverlay.innerHTML = "HSBC Bot: Working...<br>";
    log("=== STARTING ===");

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
    if (logOverlay) {
        logOverlay.innerHTML += `<span style="color:#ff9800">> [Export All] ${msg}</span><br>`;
        // Keep last 10 lines
        const lines = logOverlay.innerHTML.split('<br>');
        if (lines.length > 10) {
            logOverlay.innerHTML = lines.slice(lines.length - 10).join('<br>');
        }
    }
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

    // Calculate yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toLocaleDateString('en-GB'); // dd/mm/yyyy

    // Extract accounts from current page
    const accounts = extractAccountsFromTable();

    if (accounts.length === 0) {
        logExportAll("No accounts found on page!");
        return;
    }

    // Initialize state
    exportAllState = {
        isRunning: true,
        accounts: accounts,
        currentIndex: 0,
        completed: [],
        failed: [],
        startDate: dateStr,
        endDate: dateStr
    };

    logExportAll(`Starting: ${accounts.length} accounts`);
    logExportAll(`Date: ${dateStr}`);
    updateExportAllButton('working');

    // Start processing
    processNextAccount();
}

// Task 4: Process Single Account
async function processNextAccount() {
    const { accounts, currentIndex, startDate, endDate } = exportAllState;

    // Check if done with current page
    if (currentIndex >= accounts.length) {
        handlePageComplete();
        return;
    }

    const account = accounts[currentIndex];
    const total = accounts.length;
    logExportAll(`[${currentIndex + 1}/${total}] ${account.title}`);

    try {
        // 1. Click account row to go to details
        account.rowElement.click();

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

        // 8. Re-extract rows (DOM references may be stale)
        exportAllState.accounts = extractAccountsFromTable();

    } catch (err) {
        logExportAll(`Error returning to list: ${err.message}`);
    }

    // 9. Move to next account
    exportAllState.currentIndex++;
    processNextAccount();
}

// Task 6: Pagination Handler
async function handlePageComplete() {
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
    const { completed, failed } = exportAllState;

    logExportAll('========== COMPLETE ==========');
    logExportAll(`✓ Completed: ${completed.length}`);
    logExportAll(`✗ Failed: ${failed.length}`);

    if (failed.length > 0) {
        console.log("[HSBC Bot] Failed accounts:", failed);
        logExportAll(`Failed: ${failed.join(', ')}`);
    }

    exportAllState.isRunning = false;
    updateExportAllButton('done');
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

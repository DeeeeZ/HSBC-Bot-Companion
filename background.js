// HSBC Bot Companion - Background Script

console.log("HSBC Bot Background Service Worker Loaded");

// --- Keyboard Shortcuts ---
chrome.commands.onCommand.addListener((command) => {
    console.log("[HSBC Bot] Command received:", command);

    // Find active HSBC tab and send command
    chrome.tabs.query({ active: true, currentWindow: true, url: "*://*.hsbcnet.com/*" }, (tabs) => {
        if (tabs.length === 0) {
            console.log("[HSBC Bot] No active HSBC tab found");
            return;
        }

        const tab = tabs[0];
        console.log("[HSBC Bot] Sending command to tab:", tab.id);

        if (command === "trigger-export-all") {
            chrome.tabs.sendMessage(tab.id, { action: "keyboard_export_all" }).catch(err => {
                console.log("[HSBC Bot] Failed to send command:", err);
            });
        } else if (command === "trigger-auto-export") {
            chrome.tabs.sendMessage(tab.id, { action: "keyboard_auto_export" }).catch(err => {
                console.log("[HSBC Bot] Failed to send command:", err);
            });
        }
    });
});

// --- Download Context for File Renaming ---
let pendingDownloadContext = null;
let pendingJsonDownload = null; // For JSON log file

// Listen for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Manual close request
    if (message.action === "close_tab" && sender.tab && sender.tab.id) {
        console.log(`Received Manual Close Request for Tab ID: ${sender.tab.id}`);
        chrome.tabs.remove(sender.tab.id).catch(() => {});
    }

    // Set download context for filename (from content.js before export)
    if (message.action === "set_download_context") {
        const contextTimestamp = Date.now();
        pendingDownloadContext = {
            title: message.accountTitle,
            number: message.accountNumber,
            currency: message.currency || 'UNKNOWN',
            dateFrom: message.dateFrom,
            dateTo: message.dateTo,
            timestamp: contextTimestamp
        };
        console.log("[HSBC Bot] Download context set:", pendingDownloadContext);

        // Auto-clear after 60s (safety) - use closure to capture timestamp
        setTimeout(() => {
            if (pendingDownloadContext && pendingDownloadContext.timestamp === contextTimestamp) {
                pendingDownloadContext = null;
                console.log("[HSBC Bot] Download context expired");
            }
        }, 60000);
    }

    // Download JSON log to HSBC_Exports subfolder
    if (message.action === "download_json_log") {
        try {
            // Set context for onDeterminingFilename to use
            pendingJsonDownload = {
                filename: message.filename,
                timestamp: Date.now()
            };

            // Convert string to base64 safely (handles Unicode and large files)
            const utf8Bytes = new TextEncoder().encode(message.content);
            let binary = '';
            for (let i = 0; i < utf8Bytes.length; i++) {
                binary += String.fromCharCode(utf8Bytes[i]);
            }
            const base64 = btoa(binary);
            const dataUrl = `data:application/json;base64,${base64}`;

            console.log("[HSBC Bot] Starting JSON download, context set");

            chrome.downloads.download({
                url: dataUrl,
                saveAs: false
            }, (downloadId) => {
                if (chrome.runtime.lastError) {
                    console.log("[HSBC Bot] JSON download error:", chrome.runtime.lastError);
                    pendingJsonDownload = null;
                    sendResponse({ success: false, error: chrome.runtime.lastError.message });
                } else {
                    console.log("[HSBC Bot] JSON download started, id:", downloadId);
                    sendResponse({ success: true });
                }
            });

            // Auto-clear context after 10s (safety)
            setTimeout(() => {
                if (pendingJsonDownload && pendingJsonDownload.timestamp === message.timestamp) {
                    pendingJsonDownload = null;
                }
            }, 10000);
        } catch (err) {
            console.log("[HSBC Bot] JSON download exception:", err);
            pendingJsonDownload = null;
            sendResponse({ success: false, error: err.message });
        }

        return true; // Keep channel open for async response
    }
});

// --- Rename Downloads ---
chrome.downloads.onDeterminingFilename.addListener((downloadItem, suggest) => {
    console.log("[HSBC Bot] onDeterminingFilename:", downloadItem.filename);

    // Get today's date for folder organization (export run date)
    const today = new Date();
    const dateFolder = today.toISOString().split('T')[0]; // "YYYY-MM-DD"

    // Handle JSON log file download
    if (pendingJsonDownload && downloadItem.filename.toLowerCase().endsWith('.json')) {
        const fullPath = `HSBC_Exports/${dateFolder}/${pendingJsonDownload.filename}`;
        console.log("[HSBC Bot] Saving JSON to:", fullPath);
        suggest({ filename: fullPath });
        pendingJsonDownload = null;
        return;
    }

    // Handle Excel file download (from HSBC export)
    if (pendingDownloadContext && downloadItem.filename.toLowerCase().endsWith('.xlsx')) {
        const ctx = pendingDownloadContext;

        // Sanitize title - replace invalid filename chars but keep spaces
        const safeTitle = ctx.title.replace(/[\/\\:*?"<>|]/g, '_');

        // Build filename: Title_AccountNumber_Currency_DateFrom_TO_DateTo.xlsx
        const newFilename = `${safeTitle}_${ctx.number}_${ctx.currency}_${ctx.dateFrom}_TO_${ctx.dateTo}.xlsx`;

        // Build full path with subfolder: HSBC_Exports/YYYY-MM-DD/filename.xlsx
        const fullPath = `HSBC_Exports/${dateFolder}/${newFilename}`;

        console.log("[HSBC Bot] Saving Excel to:", fullPath);
        suggest({ filename: fullPath });

        // Clear context after use
        pendingDownloadContext = null;
        return;
    }

    // No context - use default filename
    suggest();
});

// Listen for new downloads
chrome.downloads.onCreated.addListener((downloadItem) => {
    console.log("Download detected:", downloadItem);

    // Check if the download comes from a relevant URL or MimeType
    // downloadItem.referrer might be the redirect page URL
    // downloadItem.mimeType should be 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' (xlsx) or similar
    
    // We only want to close the tab if it seems to be our automated export
    // The redirect page URL usually contains "GIBRfdRedirect"
    
    // Note: downloadItem might not have the full referrer populated immediately in some cases,
    // but the finalUrl or url usually indicates the source.
    
    // Also, we need the tabId. Use chrome.tabs.query or similar if not present?
    // downloadItem does NOT explicitly guarantee a tabId in all browsers/versions, 
    // but usually it's traceable if initiated by user navigation.
    
    // HOWEVER, Manifest V3 onCreated event doesn't directly provide the source Tab ID easily 
    // without some tricks if strictly background. 
    // But we know we are looking for the active tab that is on the redirect page.
    
    // Close all redirect tabs (single consolidated strategy)
    chrome.tabs.query({ url: "*://*.hsbcnet.com/*GIBRfdRedirect*" }, (tabs) => {
        if (!tabs || tabs.length === 0) return;

        // Track which tabs we're closing to avoid duplicates
        const closedTabs = new Set();

        tabs.forEach(tab => {
            if (closedTabs.has(tab.id)) return;
            closedTabs.add(tab.id);

            console.log("Closing redirect tab:", tab.id, tab.url);
            setTimeout(() => {
                chrome.tabs.remove(tab.id).catch(() => {});
            }, 300);
        });
    });

    // Notify ALL hsbcnet tabs that download started (include context for verification)
    chrome.tabs.query({ url: "*://*.hsbcnet.com/*" }, (tabs) => {
        console.log("Found HSBC tabs:", tabs.length);
        tabs.forEach(tab => {
            // Skip redirect tabs
            if (tab.url && tab.url.includes("GIBRfdRedirect")) return;

            console.log("Notifying tab:", tab.id, tab.url);
            chrome.tabs.sendMessage(tab.id, {
                action: "download_started",
                context: pendingDownloadContext ? {
                    number: pendingDownloadContext.number,
                    title: pendingDownloadContext.title
                } : null
            }).catch(err => {
                console.log("Tab not listening:", tab.id);
            });
        });
    });
});

// === NATIVE MESSAGING FOR RECONCILIATION ===

const NATIVE_HOST_NAME = "com.hsbc.bot.recon";

/**
 * Check if native messaging host is available.
 * Sends a ping command and waits for response.
 */
async function checkNativeHostAvailable() {
    return new Promise((resolve) => {
        try {
            const port = chrome.runtime.connectNative(NATIVE_HOST_NAME);

            const timeout = setTimeout(() => {
                port.disconnect();
                resolve({ available: false, error: "Connection timeout" });
            }, 5000);

            port.onMessage.addListener((response) => {
                clearTimeout(timeout);
                port.disconnect();
                resolve({
                    available: response.success === true,
                    version: response.version,
                    checks: response.checks
                });
            });

            port.onDisconnect.addListener(() => {
                clearTimeout(timeout);
                const error = chrome.runtime.lastError;
                resolve({
                    available: false,
                    error: error ? error.message : "Host disconnected"
                });
            });

            port.postMessage({ command: "ping" });
        } catch (e) {
            resolve({ available: false, error: e.message });
        }
    });
}

/**
 * Run reconciliation via native messaging host.
 * @param {Object} options - Options to pass to reconciliation
 * @param {Function} callback - Callback with result
 */
function runReconciliation(options, callback) {
    console.log("[HSBC Bot] Starting reconciliation via native host...");

    try {
        const port = chrome.runtime.connectNative(NATIVE_HOST_NAME);

        // 30 minute timeout for long-running reconciliation
        const timeout = setTimeout(() => {
            console.log("[HSBC Bot] Native host timeout");
            port.disconnect();
            callback({
                success: false,
                error: "Reconciliation timed out after 30 minutes",
                errorCode: "TIMEOUT"
            });
        }, 1800000);

        port.onMessage.addListener((response) => {
            console.log("[HSBC Bot] Native host response:", response);
            clearTimeout(timeout);
            port.disconnect();
            callback(response);
        });

        port.onDisconnect.addListener(() => {
            clearTimeout(timeout);
            const error = chrome.runtime.lastError;
            console.log("[HSBC Bot] Native host disconnected:", error);
            callback({
                success: false,
                error: error ? error.message : "Native host disconnected unexpectedly",
                errorCode: "DISCONNECTED"
            });
        });

        // Send reconciliation command
        port.postMessage({
            command: "run_reconciliation",
            bank: options.bank || "HSBC",
            options: options
        });

    } catch (e) {
        console.log("[HSBC Bot] Native host connection error:", e);
        callback({
            success: false,
            error: e.message,
            errorCode: "CONNECTION_ERROR"
        });
    }
}

// Handle native messaging requests from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Check native host availability
    if (message.action === "check_native_host") {
        console.log("[HSBC Bot] Checking native host availability...");
        checkNativeHostAvailable().then(result => {
            console.log("[HSBC Bot] Native host check result:", result);
            sendResponse(result);
        });
        return true; // Keep channel open for async response
    }

    // Run reconciliation
    if (message.action === "run_reconciliation") {
        console.log("[HSBC Bot] Running reconciliation with options:", message.options);
        runReconciliation(message.options || {}, (result) => {
            sendResponse(result);
        });
        return true; // Keep channel open for async response
    }
});

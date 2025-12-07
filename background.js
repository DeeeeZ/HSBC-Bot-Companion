// HSBC Bot Companion - Background Script

console.log("HSBC Bot Background Service Worker Loaded");

// --- Download Context for File Renaming ---
let pendingDownloadContext = null;

// Listen for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Manual close request
    if (message.action === "close_tab" && sender.tab && sender.tab.id) {
        console.log(`Received Manual Close Request for Tab ID: ${sender.tab.id}`);
        chrome.tabs.remove(sender.tab.id);
    }

    // Set download context for filename (from content.js before export)
    if (message.action === "set_download_context") {
        pendingDownloadContext = {
            title: message.accountTitle,
            number: message.accountNumber,
            currency: message.currency || 'UNKNOWN',
            dateFrom: message.dateFrom,
            dateTo: message.dateTo,
            timestamp: Date.now()
        };
        console.log("[HSBC Bot] Download context set:", pendingDownloadContext);

        // Auto-clear after 60s (safety)
        setTimeout(() => {
            if (pendingDownloadContext && pendingDownloadContext.timestamp === message.timestamp) {
                pendingDownloadContext = null;
                console.log("[HSBC Bot] Download context expired");
            }
        }, 60000);
    }
});

// --- Rename Downloads ---
chrome.downloads.onDeterminingFilename.addListener((downloadItem, suggest) => {
    console.log("[HSBC Bot] onDeterminingFilename:", downloadItem.filename);

    // Check if we have context and it's an xlsx file from HSBC
    if (pendingDownloadContext && downloadItem.filename.toLowerCase().endsWith('.xlsx')) {
        const ctx = pendingDownloadContext;

        // Sanitize title - replace invalid filename chars but keep spaces
        const safeTitle = ctx.title.replace(/[\/\\:*?"<>|]/g, '_');

        // Build filename: Title_AccountNumber_Currency_DateFrom_TO_DateTo.xlsx
        const newFilename = `${safeTitle}_${ctx.number}_${ctx.currency}_${ctx.dateFrom}_TO_${ctx.dateTo}.xlsx`;

        console.log("[HSBC Bot] Renaming to:", newFilename);
        suggest({ filename: newFilename });

        // Clear context after use
        pendingDownloadContext = null;
    } else {
        // No context or not xlsx - use default filename
        suggest();
    }
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
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs.length > 0) {
            const activeTab = tabs[0];
            if (activeTab.url && activeTab.url.includes("GIBRfdRedirect")) {
                console.log(`Closing tab ${activeTab.id} due to download start and matching URL.`);
                
                // Allow a tiny buffer (500ms) to ensure browser registers the download handoff
                setTimeout(() => {
                    chrome.tabs.remove(activeTab.id);
                }, 500); 
            }
        }
    });

    // Strategy 2: If we want to be more specific, we can search all tabs for the redirect URL
    chrome.tabs.query({ url: "*://*.hsbcnet.com/*GIBRfdRedirect*" }, (tabs) => {
        tabs.forEach(tab => {
            console.log("Found Redirect Tab:", tab.url);
            // Close it
            setTimeout(() => {
                 chrome.tabs.remove(tab.id);
            }, 500);
        });
    });

    // Notify ALL hsbcnet tabs that download started (content script checks if button exists)
    chrome.tabs.query({ url: "*://*.hsbcnet.com/*" }, (tabs) => {
        console.log("Found HSBC tabs:", tabs.length);
        tabs.forEach(tab => {
            // Skip redirect tabs
            if (tab.url && tab.url.includes("GIBRfdRedirect")) return;

            console.log("Notifying tab:", tab.id, tab.url);
            chrome.tabs.sendMessage(tab.id, { action: "download_started" }).catch(err => {
                console.log("Tab not listening:", tab.id);
            });
        });
    });
});

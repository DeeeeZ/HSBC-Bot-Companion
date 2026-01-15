// HSBC Bot Companion - Popup Script

const HISTORY_KEY = 'hsbc_export_history';
const HSBC_LOGIN_URL = 'https://www2.secure.hsbcnet.com/uims/dl/DSP_AUTHENTICATION';

// === Reconciliation State ===
let reconState = {
    status: 'checking', // checking, available, unavailable, running, success, error
    result: null
};

function formatDuration(ms) {
    if (!ms) return '-';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    } else {
        return `${seconds}s`;
    }
}

function formatDate(isoString) {
    const date = new Date(isoString);
    const options = {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return date.toLocaleDateString('en-GB', options);
}

function renderHistory(history) {
    const container = document.getElementById('history-list');
    const clearBtn = document.getElementById('clear-btn');

    if (!history || history.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                </div>
                <p>No exports yet</p>
                <span>Export to see history</span>
            </div>
        `;
        clearBtn.style.display = 'none';
        return;
    }

    clearBtn.style.display = 'inline';

    container.innerHTML = history.map(item => {
        const hasFailures = item.failed && item.failed.length > 0;
        const isCancelled = item.cancelled;
        let badgeClass = 'badge-success';
        let badgeText = 'Done';
        let badgeIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>`;

        if (isCancelled) {
            badgeClass = 'badge-warning';
            badgeText = 'Stopped';
            badgeIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" /></svg>`;
        } else if (hasFailures) {
            badgeClass = 'badge-error';
            badgeText = `${item.failed.length} Fail`;
            badgeIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>`;
        }

        const dateRange = item.dateRange.from === item.dateRange.to
            ? item.dateRange.from
            : `${item.dateRange.from} - ${item.dateRange.to}`;

        return `
            <div class="history-item">
                <div class="history-top">
                    <span class="history-date">${formatDate(item.timestamp)}</span>
                    <span class="badge ${badgeClass}">${badgeIcon}${badgeText}</span>
                </div>
                <div class="history-range">${dateRange}</div>
                <div class="history-stats">
                    <span class="stat stat-success">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                        ${item.completed}
                    </span>
                    ${hasFailures ? `
                        <span class="stat stat-failed">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            ${item.failed.length}
                        </span>
                    ` : ''}
                    <span class="stat stat-time">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        ${formatDuration(item.durationMs)}
                    </span>
                </div>
            </div>
        `;
    }).join('');
}

// === Reconciliation Functions ===

function updateReconUI() {
    const btn = document.getElementById('recon-btn');
    const btnText = document.getElementById('recon-btn-text');
    const status = document.getElementById('recon-status');

    // Reset classes
    btn.classList.remove('unavailable');
    status.className = 'status-banner';

    switch (reconState.status) {
        case 'checking':
            btn.style.display = 'none';
            status.className = 'status-banner checking';
            status.innerHTML = `
                <div class="spinner"></div>
                <span>Checking service...</span>
            `;
            break;

        case 'available':
            btn.style.display = 'flex';
            btn.disabled = false;
            btnText.textContent = 'Reconcile';
            status.className = 'status-banner';
            status.innerHTML = '';
            break;

        case 'unavailable':
            btn.style.display = 'flex';
            btn.classList.add('unavailable');
            btn.disabled = true;
            btnText.textContent = 'Not Installed';
            status.className = 'status-banner';
            status.innerHTML = '';
            break;

        case 'running':
            btn.style.display = 'flex';
            btn.disabled = true;
            btnText.textContent = 'Running...';
            status.className = 'status-banner running';
            status.innerHTML = `
                <div class="spinner"></div>
                <span>Reconciling transactions...</span>
            `;
            break;

        case 'success':
            const r = reconState.result || {};
            const matched = r.steps?.reconciliation?.matched ?? '?';
            const time = r.total_time_seconds ? `${Math.round(r.total_time_seconds)}s` : '';
            btn.style.display = 'flex';
            btn.disabled = false;
            btnText.textContent = 'Run Again';
            status.className = 'status-banner success';
            status.innerHTML = `
                <div class="status-row">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                    <span>Complete</span>
                </div>
                <div class="status-detail">${matched} matched${time ? ` in ${time}` : ''}</div>
            `;
            break;

        case 'warning':
            const w = reconState.result || {};
            const wMatched = w.steps?.reconciliation?.matched ?? 0;
            const wFailed = w.steps?.reconciliation?.failed ?? 0;
            btn.style.display = 'flex';
            btn.disabled = false;
            btnText.textContent = 'Run Again';
            status.className = 'status-banner warning';
            status.innerHTML = `
                <div class="status-row">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                    <span>Partial</span>
                </div>
                <div class="status-detail">${wMatched} ok, ${wFailed} failed</div>
            `;
            break;

        case 'error':
            const err = reconState.result || {};
            let errorMsg = err.error
                || (err.errors && err.errors.length > 0 ? err.errors[0] : null)
                || (err.steps?.reconciliation?.failures?.[0]?.error)
                || 'Unknown error';
            // Truncate long errors
            if (errorMsg.length > 50) errorMsg = errorMsg.substring(0, 47) + '...';
            btn.style.display = 'flex';
            btn.disabled = false;
            btnText.textContent = 'Retry';
            status.className = 'status-banner error';
            status.innerHTML = `
                <div class="status-row">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    <span>Failed</span>
                </div>
                <div class="status-detail">${errorMsg}</div>
            `;
            break;
    }
}

function checkNativeHost() {
    reconState.status = 'checking';
    updateReconUI();

    chrome.runtime.sendMessage({ action: 'check_native_host' }, (response) => {
        if (chrome.runtime.lastError) {
            reconState.status = 'unavailable';
        } else if (response && response.available) {
            reconState.status = 'available';
        } else {
            reconState.status = 'unavailable';
        }
        updateReconUI();
    });
}

function runReconciliation() {
    reconState.status = 'running';
    reconState.result = null;
    updateReconUI();

    chrome.runtime.sendMessage(
        { action: 'run_reconciliation', options: { bank: 'HSBC' } },
        (response) => {
            if (chrome.runtime.lastError) {
                reconState.status = 'error';
                reconState.result = { error: chrome.runtime.lastError.message };
                updateReconUI();
            } else {
                handleReconResult(response);
            }
        }
    );
}

// Load history on popup open
document.addEventListener('DOMContentLoaded', () => {
    // Load export history
    chrome.storage.local.get([HISTORY_KEY], (result) => {
        renderHistory(result[HISTORY_KEY] || []);
    });

    // Open HSBCnet button
    document.getElementById('open-hsbc-btn').addEventListener('click', () => {
        chrome.tabs.create({ url: HSBC_LOGIN_URL });
    });

    // Clear history button
    document.getElementById('clear-btn').addEventListener('click', () => {
        if (confirm('Clear all export history?')) {
            chrome.storage.local.remove([HISTORY_KEY], () => {
                renderHistory([]);
            });
        }
    });

    // Reconciliation button
    document.getElementById('recon-btn').addEventListener('click', () => {
        if (reconState.status === 'available' || reconState.status === 'success' || reconState.status === 'warning' || reconState.status === 'error') {
            runReconciliation();
        }
    });

    // Listen for reconciliation completion from background
    chrome.runtime.onMessage.addListener((message) => {
        if (message.action === 'recon_complete') {
            handleReconResult(message.result);
        }
    });

    // Check if reconciliation is already running, then check native host
    checkReconStatusOnLoad();
});

// Check recon status when popup opens (handles reopening mid-run)
function checkReconStatusOnLoad() {
    chrome.runtime.sendMessage({ action: 'check_recon_status' }, (data) => {
        if (chrome.runtime.lastError || !data) {
            checkNativeHost();
            return;
        }

        if (data.recon_running) {
            // Reconciliation is in progress - show spinner
            reconState.status = 'running';
            updateReconUI();
        } else if (data.recon_result) {
            // Show last result
            handleReconResult(data.recon_result);
        } else {
            // No running recon, check if service is available
            checkNativeHost();
        }
    });
}

// Handle reconciliation result (shared by callback and message listener)
function handleReconResult(response) {
    if (!response) {
        reconState.status = 'error';
        reconState.result = { error: 'No response' };
    } else {
        const matched = response.steps?.reconciliation?.matched;
        const failed = response.steps?.reconciliation?.failed || 0;

        if (matched > 0) {
            reconState.status = failed > 0 ? 'warning' : 'success';
            reconState.result = response;
        } else if (response.success) {
            reconState.status = 'success';
            reconState.result = response;
        } else {
            reconState.status = 'error';
            reconState.result = response;
        }
    }
    updateReconUI();
}

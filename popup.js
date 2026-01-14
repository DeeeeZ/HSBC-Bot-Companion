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
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
                <p>No exports yet</p>
                <span>Run an export to see history here</span>
            </div>
        `;
        clearBtn.style.display = 'none';
        return;
    }

    clearBtn.style.display = 'inline';

    container.innerHTML = history.map(item => {
        const hasFailures = item.failed && item.failed.length > 0;
        const isCancelled = item.cancelled;
        let statusClass = '';
        let badgeClass = 'success';
        let badgeText = 'Complete';
        let badgeIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>`;

        if (isCancelled) {
            statusClass = 'cancelled';
            badgeClass = 'warning';
            badgeText = 'Cancelled';
            badgeIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>`;
        } else if (hasFailures) {
            statusClass = 'has-failures';
            badgeClass = 'error';
            badgeText = `${item.failed.length} Failed`;
            badgeIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>`;
        }

        const dateRange = item.dateRange.from === item.dateRange.to
            ? item.dateRange.from
            : `${item.dateRange.from} → ${item.dateRange.to}`;

        return `
            <div class="history-item ${statusClass}">
                <div class="history-header">
                    <span class="history-date">${formatDate(item.timestamp)}</span>
                    <span class="status-badge ${badgeClass}">${badgeIcon}${badgeText}</span>
                </div>
                <div class="history-range">${dateRange}</div>
                <div class="history-stats">
                    <span class="stat stat-success">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
                        ${item.completed}
                    </span>
                    ${hasFailures ? `
                        <span class="stat stat-failed">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            ${item.failed.length}
                        </span>
                    ` : ''}
                    <span class="stat stat-duration">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
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
    status.className = 'recon-status';

    switch (reconState.status) {
        case 'checking':
            btn.style.display = 'none';
            status.className = 'recon-status checking';
            status.innerHTML = `
                <div class="spinner-small"></div>
                <span>Checking reconciliation service...</span>
            `;
            break;

        case 'available':
            btn.style.display = 'flex';
            btn.disabled = false;
            btnText.textContent = 'Run Reconciliation';
            status.className = 'recon-status';
            status.innerHTML = '';
            break;

        case 'unavailable':
            btn.style.display = 'flex';
            btn.classList.add('unavailable');
            btn.disabled = true;
            btnText.textContent = 'Service Not Installed';
            status.className = 'recon-status';
            status.innerHTML = '';
            break;

        case 'running':
            btn.style.display = 'flex';
            btn.disabled = true;
            btnText.textContent = 'Running...';
            status.className = 'recon-status running';
            status.innerHTML = `
                <div class="spinner-small"></div>
                <span>Running bank reconciliation...</span>
            `;
            break;

        case 'success':
            const r = reconState.result || {};
            const matched = r.steps?.reconciliation?.matched ?? '?';
            const time = r.total_time_seconds ? `${Math.round(r.total_time_seconds)}s` : '';
            btn.style.display = 'flex';
            btn.disabled = false;
            btnText.textContent = 'Run Again';
            status.className = 'recon-status success';
            status.innerHTML = `
                <div class="status-title">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
                    Reconciliation Complete
                </div>
                <div class="status-detail">${matched} transactions matched${time ? ` in ${time}` : ''}</div>
            `;
            break;

        case 'error':
            const err = reconState.result || {};
            btn.style.display = 'flex';
            btn.disabled = false;
            btnText.textContent = 'Retry';
            status.className = 'recon-status error';
            status.innerHTML = `
                <div class="status-title">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    Reconciliation Failed
                </div>
                <div class="status-detail">${err.error || 'Unknown error'}</div>
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
            } else if (response && response.success) {
                reconState.status = 'success';
                reconState.result = response;
            } else {
                reconState.status = 'error';
                reconState.result = response || { error: 'Unknown error' };
            }
            updateReconUI();
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
        if (reconState.status === 'available' || reconState.status === 'success' || reconState.status === 'error') {
            runReconciliation();
        }
    });

    // Check native host availability on popup open
    checkNativeHost();
});

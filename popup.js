// HSBC Bot Companion - Popup Script

const HISTORY_KEY = 'hsbc_export_history';
const HSBC_LOGIN_URL = 'https://www2.secure.hsbcnet.com/uims/dl/DSP_AUTHENTICATION';

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
});

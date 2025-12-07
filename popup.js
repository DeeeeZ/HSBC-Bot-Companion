// HSBC Bot Companion - Popup Script

const HISTORY_KEY = 'hsbc_export_history';

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
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>No exports yet</p>
            </div>
        `;
        clearBtn.style.display = 'none';
        return;
    }

    clearBtn.style.display = 'block';

    container.innerHTML = history.map(item => {
        const hasFailures = item.failed && item.failed.length > 0;
        const isCancelled = item.cancelled;
        let statusClass = '';
        if (isCancelled) statusClass = 'cancelled';
        else if (hasFailures) statusClass = 'has-failures';

        const dateRange = item.dateRange.from === item.dateRange.to
            ? item.dateRange.from
            : `${item.dateRange.from} → ${item.dateRange.to}`;

        return `
            <div class="history-item ${statusClass}">
                <div class="history-date">${formatDate(item.timestamp)}</div>
                <div class="history-range">${dateRange}</div>
                <div class="history-stats">
                    <span class="stat stat-success">✓ ${item.completed}</span>
                    ${hasFailures ? `<span class="stat stat-failed">✗ ${item.failed.length}</span>` : ''}
                    ${isCancelled ? `<span class="stat" style="color:#ffc107;">⊘ Cancelled</span>` : ''}
                    <span class="stat stat-duration">⏱ ${formatDuration(item.durationMs)}</span>
                </div>
            </div>
        `;
    }).join('');
}

// Load history on popup open
document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get([HISTORY_KEY], (result) => {
        renderHistory(result[HISTORY_KEY] || []);
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

/* ═══════════════════════════════════════════════════════════════════════════
   CampusHub — Utility Functions
   ═══════════════════════════════════════════════════════════════════════════ */

const Utils = {
    /**
     * Format date to readable string
     */
    formatDate(dateStr, options = {}) {
        if (!dateStr) return '—';
        const date = new Date(dateStr);
        const defaults = { year: 'numeric', month: 'short', day: 'numeric' };
        return date.toLocaleDateString('en-US', { ...defaults, ...options });
    },

    /**
     * Format date with time
     */
    formatDateTime(dateStr) {
        if (!dateStr) return '—';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    },

    /**
     * Relative time (e.g., "2 hours ago")
     */
    timeAgo(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        const intervals = [
            { label: 'year', seconds: 31536000 },
            { label: 'month', seconds: 2592000 },
            { label: 'week', seconds: 604800 },
            { label: 'day', seconds: 86400 },
            { label: 'hour', seconds: 3600 },
            { label: 'minute', seconds: 60 },
        ];

        for (const interval of intervals) {
            const count = Math.floor(seconds / interval.seconds);
            if (count >= 1) {
                return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`;
            }
        }
        return 'Just now';
    },

    /**
     * Debounce function
     */
    debounce(fn, delay = 300) {
        let timer;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    },

    /**
     * Truncate text
     */
    truncate(text, maxLength = 100) {
        if (!text || text.length <= maxLength) return text || '';
        return text.substring(0, maxLength) + '...';
    },

    /**
     * Get initials from name
     */
    getInitials(name) {
        if (!name) return '?';
        return name.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);
    },

    /**
     * Format file size
     */
    formatFileSize(bytes) {
        if (!bytes) return '0 B';
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
    },

    /**
     * Generate unique ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Parse URL query parameters
     */
    getQueryParams() {
        const params = {};
        new URLSearchParams(window.location.search).forEach((value, key) => {
            params[key] = value;
        });
        return params;
    },

    /**
     * Set page title
     */
    setPageTitle(title) {
        document.title = title ? `${title} | ${Config.APP_NAME}` : Config.APP_NAME;
    },

    /**
     * Copy text to clipboard
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            Toast.success('Copied to clipboard');
        } catch {
            // Fallback
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            Toast.success('Copied to clipboard');
        }
    },

    /**
     * Countdown timer
     */
    countdown(targetDate, callback) {
        const update = () => {
            const now = new Date().getTime();
            const target = new Date(targetDate).getTime();
            const diff = target - now;

            if (diff <= 0) {
                callback({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
                return;
            }

            callback({
                days: Math.floor(diff / (1000 * 60 * 60 * 24)),
                hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
                seconds: Math.floor((diff % (1000 * 60)) / 1000),
                expired: false,
            });
        };

        update();
        return setInterval(update, 1000);
    },

    /**
     * Difficulty color
     */
    getDifficultyColor(difficulty) {
        const map = {
            easy: 'success',
            medium: 'warning',
            hard: 'danger',
        };
        return map[difficulty?.toLowerCase()] || 'gray';
    },

    /**
     * Status badge color
     */
    getStatusColor(status) {
        const map = {
            active: 'success', completed: 'success', selected: 'success',
            'offer received': 'success', approved: 'success',
            pending: 'warning', 'in progress': 'warning', applied: 'warning',
            'oa scheduled': 'warning',
            rejected: 'danger', failed: 'danger', expired: 'danger',
            inactive: 'gray', draft: 'gray', wishlist: 'info',
        };
        return map[status?.toLowerCase()] || 'gray';
    },
};

/* ═══════════════════════════════════════════════════════════════════════════
   Toast Notification System
   ═══════════════════════════════════════════════════════════════════════════ */

const Toast = {
    _container: null,

    _getContainer() {
        if (!this._container) {
            this._container = document.createElement('div');
            this._container.className = 'toast-container';
            document.body.appendChild(this._container);
        }
        return this._container;
    },

    show(message, type = 'info', duration = Config.TOAST_DURATION) {
        const container = this._getContainer();
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ',
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${icons[type]}</span>
            <span class="toast-message">${Utils.escapeHtml(message)}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    success(msg) { this.show(msg, 'success'); },
    error(msg) { this.show(msg, 'error'); },
    warning(msg) { this.show(msg, 'warning'); },
    info(msg) { this.show(msg, 'info'); },
};

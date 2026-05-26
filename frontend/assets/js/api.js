/* ═══════════════════════════════════════════════════════════════════════════
   CampusHub — API Client
   Handles JWT injection, token refresh, and error handling
   ═══════════════════════════════════════════════════════════════════════════ */

const API = {
    _isRefreshing: false,
    _failedQueue: [],

    /**
     * Core fetch wrapper with auth and error handling
     */
    async request(endpoint, options = {}) {
        const url = `${Config.API_BASE_URL}${endpoint}`;
        const token = localStorage.getItem(Config.TOKEN_KEY);

        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // Remove Content-Type for FormData
        if (options.body instanceof FormData) {
            delete headers['Content-Type'];
        }

        const config = {
            ...options,
            headers,
        };

        try {
            const response = await fetch(url, config);

            // Handle 401 — attempt token refresh
            if (response.status === 401 && !options._retry) {
                return this._handleUnauthorized(endpoint, options);
            }

            // Parse response
            const data = await response.json().catch(() => null);

            if (!response.ok) {
                const error = new Error(data?.error?.message || data?.message || `Request failed with status ${response.status}`);
                error.status = response.status;
                error.data = data;
                throw error;
            }

            return data;
        } catch (error) {
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Network error. Please check your connection.');
            }
            throw error;
        }
    },

    /**
     * Handle 401 responses with token refresh
     */
    async _handleUnauthorized(endpoint, options) {
        if (this._isRefreshing) {
            // Queue the request
            return new Promise((resolve, reject) => {
                this._failedQueue.push({ resolve, reject, endpoint, options });
            });
        }

        this._isRefreshing = true;
        const refreshToken = localStorage.getItem(Config.REFRESH_KEY);

        if (!refreshToken) {
            this._isRefreshing = false;
            this._processQueue(new Error('No refresh token'));
            Auth.logout();
            return;
        }

        try {
            const response = await fetch(`${Config.API_BASE_URL}/auth/token/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh: refreshToken }),
            });

            if (!response.ok) {
                throw new Error('Token refresh failed');
            }

            const data = await response.json();
            localStorage.setItem(Config.TOKEN_KEY, data.access);
            if (data.refresh) {
                localStorage.setItem(Config.REFRESH_KEY, data.refresh);
            }

            this._processQueue(null);

            // Retry original request
            return this.request(endpoint, { ...options, _retry: true });
        } catch (error) {
            this._processQueue(error);
            Auth.logout();
            throw error;
        } finally {
            this._isRefreshing = false;
        }
    },

    _processQueue(error) {
        this._failedQueue.forEach(({ resolve, reject, endpoint, options }) => {
            if (error) {
                reject(error);
            } else {
                resolve(this.request(endpoint, { ...options, _retry: true }));
            }
        });
        this._failedQueue = [];
    },

    // ── Convenience methods ────────────────────────────────────────────────
    get(endpoint, params = {}) {
        const query = new URLSearchParams(params).toString();
        const url = query ? `${endpoint}?${query}` : endpoint;
        return this.request(url, { method: 'GET' });
    },

    post(endpoint, body = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: body instanceof FormData ? body : JSON.stringify(body),
        });
    },

    put(endpoint, body = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: body instanceof FormData ? body : JSON.stringify(body),
        });
    },

    patch(endpoint, body = {}) {
        return this.request(endpoint, {
            method: 'PATCH',
            body: body instanceof FormData ? body : JSON.stringify(body),
        });
    },

    delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    },

    /**
     * Upload file with progress tracking
     */
    upload(endpoint, formData, onProgress) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const token = localStorage.getItem(Config.TOKEN_KEY);

            xhr.open('POST', `${Config.API_BASE_URL}${endpoint}`);
            if (token) {
                xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            }

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable && onProgress) {
                    onProgress(Math.round((e.loaded / e.total) * 100));
                }
            };

            xhr.onload = () => {
                const data = JSON.parse(xhr.responseText);
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(data);
                } else {
                    reject(new Error(data?.error?.message || 'Upload failed'));
                }
            };

            xhr.onerror = () => reject(new Error('Network error during upload'));
            xhr.send(formData);
        });
    },
};

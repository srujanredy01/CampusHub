/* ═══════════════════════════════════════════════════════════════════════════
   CampusHub — Authentication Module
   ═══════════════════════════════════════════════════════════════════════════ */

const Auth = {
    /**
     * Get current user from localStorage
     */
    getUser() {
        try {
            const user = localStorage.getItem(Config.USER_KEY);
            return user ? JSON.parse(user) : null;
        } catch {
            return null;
        }
    },

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return !!localStorage.getItem(Config.TOKEN_KEY);
    },

    /**
     * Get user role
     */
    getRole() {
        const user = this.getUser();
        return user?.role || null;
    },

    /**
     * Check if user has specific role(s)
     */
    hasRole(...roles) {
        const userRole = this.getRole();
        return roles.includes(userRole);
    },

    /**
     * Check if user is admin
     */
    isAdmin() {
        return this.hasRole('admin', 'super_admin');
    },

    /**
     * Check if user is faculty
     */
    isFaculty() {
        return this.hasRole('faculty');
    },

    /**
     * Check if user is student
     */
    isStudent() {
        return this.hasRole('student');
    },

    /**
     * Login user
     */
    async login(studentId, password) {
        const data = await API.post('/auth/login', {
            student_id: studentId,
            password: password,
        });

        if (data.success) {
            localStorage.setItem(Config.TOKEN_KEY, data.data.access);
            localStorage.setItem(Config.REFRESH_KEY, data.data.refresh);
            localStorage.setItem(Config.USER_KEY, JSON.stringify(data.data.user));
        }

        return data;
    },

    /**
     * Signup new user
     */
    async signup(formData) {
        return API.post('/auth/signup', formData);
    },

    /**
     * Logout user
     */
    async logout() {
        const refreshToken = localStorage.getItem(Config.REFRESH_KEY);
        
        try {
            if (refreshToken) {
                await API.post('/auth/logout', { refresh: refreshToken });
            }
        } catch (e) {
            // Ignore logout API errors
        }

        localStorage.removeItem(Config.TOKEN_KEY);
        localStorage.removeItem(Config.REFRESH_KEY);
        localStorage.removeItem(Config.USER_KEY);
        
        window.location.href = '/pages/auth/login.html';
    },

    /**
     * Fetch and update current user data
     */
    async fetchCurrentUser() {
        try {
            const data = await API.get('/auth/me');
            if (data.success) {
                localStorage.setItem(Config.USER_KEY, JSON.stringify(data.data));
                return data.data;
            }
        } catch (e) {
            if (e.status === 401) {
                this.logout();
            }
        }
        return null;
    },

    /**
     * Forgot password
     */
    async forgotPassword(email) {
        return API.post('/auth/forgot-password', { email });
    },

    /**
     * Reset password
     */
    async resetPassword(token, password, passwordConfirm) {
        return API.post('/auth/reset-password', {
            token,
            password,
            password_confirm: passwordConfirm,
        });
    },

    /**
     * Change password (authenticated)
     */
    async changePassword(oldPassword, newPassword, confirmPassword) {
        return API.post('/auth/change-password', {
            old_password: oldPassword,
            new_password: newPassword,
            new_password_confirm: confirmPassword,
        });
    },

    /**
     * Protect a page — redirect if not authenticated
     */
    requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = '/pages/auth/login.html';
            return false;
        }
        return true;
    },

    /**
     * Protect admin pages
     */
    requireAdmin() {
        if (!this.requireAuth()) return false;
        if (!this.isAdmin()) {
            window.location.href = '/pages/student/dashboard.html';
            return false;
        }
        return true;
    },

    /**
     * Protect faculty pages
     */
    requireFaculty() {
        if (!this.requireAuth()) return false;
        if (!this.isFaculty() && !this.isAdmin()) {
            window.location.href = '/pages/student/dashboard.html';
            return false;
        }
        return true;
    },

    /**
     * Redirect if already authenticated
     */
    redirectIfAuth() {
        if (this.isAuthenticated()) {
            const role = this.getRole();
            if (role === 'admin' || role === 'super_admin') {
                window.location.href = '/pages/admin/dashboard.html';
            } else {
                window.location.href = '/pages/student/dashboard.html';
            }
            return true;
        }
        return false;
    },
};

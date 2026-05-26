/* ═══════════════════════════════════════════════════════════════════════════
   CampusHub — Configuration
   ═══════════════════════════════════════════════════════════════════════════ */

const Config = {
    // API Base URL — configurable for deployment
    API_BASE_URL: window.CAMPUSHUB_API_URL || '/api',

    // App info
    APP_NAME: 'CampusHub',
    APP_VERSION: '2.0.0',

    // Auth
    TOKEN_KEY: 'access_token',
    REFRESH_KEY: 'refresh_token',
    USER_KEY: 'campushub_user',

    // Pagination
    DEFAULT_PAGE_SIZE: 20,

    // Timeouts
    REQUEST_TIMEOUT: 15000,
    TOAST_DURATION: 4000,

    // File upload
    MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
    ALLOWED_FILE_TYPES: ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'zip', 'png', 'jpg', 'jpeg'],

    // Coding languages
    CODING_LANGUAGES: [
        { id: 'python', name: 'Python', extension: '.py' },
        { id: 'java', name: 'Java', extension: '.java' },
        { id: 'c', name: 'C', extension: '.c' },
        { id: 'cpp', name: 'C++', extension: '.cpp' },
        { id: 'javascript', name: 'JavaScript', extension: '.js' },
    ],

    // Placement statuses
    PLACEMENT_STATUSES: [
        'Wishlist', 'Applied', 'OA Scheduled', 'OA Completed',
        'Shortlisted', 'Interview Round 1', 'Interview Round 2',
        'HR Round', 'Selected', 'Rejected', 'Offer Received'
    ],

    // Roadmap categories
    ROADMAP_CATEGORIES: [
        'Web Development', 'AI/ML', 'DevOps', 'Cybersecurity', 'DSA + Placements'
    ],
};

// Freeze config to prevent accidental modification
Object.freeze(Config);

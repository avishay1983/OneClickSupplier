
// API Configuration for Python Backend Service

// In production (same-origin deploy), use empty string so requests go to same server.
// In development, use localhost:8000.
export const API_BASE_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:8000" : "");

export const ENDPOINTS = {
    // Vendor Portal (Public)
    VENDORS: {
        STATUS: `${API_BASE_URL}/api/vendors/status`,
        SEND_OTP: `${API_BASE_URL}/api/vendors/send-otp`,
        VERIFY_OTP: `${API_BASE_URL}/api/vendors/verify-otp`,
        FORM: `${API_BASE_URL}/api/vendors/form`, // Use action: 'get' | 'update' | 'submit' | 'get-documents' | 'delete-document'
        SEARCH_STREETS: `${API_BASE_URL}/api/vendors/search-streets`,
    },

    // Quotes (Public)
    QUOTES: {
        GET_DETAILS: (token: string) => `${API_BASE_URL}/api/vendors/quote/${token}`,
        SUBMIT: `${API_BASE_URL}/api/vendors/quote-submit`,
    },

    // Receipts (Approved Vendors)
    RECEIPTS: {
        LIST: `${API_BASE_URL}/api/receipts/`,
        UPLOAD: `${API_BASE_URL}/api/receipts/upload`,
        DELETE: `${API_BASE_URL}/api/receipts/delete`,
    },

    // Admin / Internal Dashboard
    ADMIN: {
        CONFIRM_VENDOR: `${API_BASE_URL}/api/vendors/confirm`,
        REJECT_VENDOR: `${API_BASE_URL}/api/vendors/reject`,
        REQUEST_DETAILS: `${API_BASE_URL}/api/vendors/send-email`,
        SEND_QUOTE_REQUEST: `${API_BASE_URL}/api/vendors/send-quote-request`,
        UPDATE_RECEIPT_STATUS: `${API_BASE_URL}/api/receipts/status`,
        SEND_RECEIPTS_LINK: `${API_BASE_URL}/api/receipts/send-link`,
        SEND_MANAGER_APPROVAL: `${API_BASE_URL}/api/users/send-manager-approval`,
    },

    // Utils / AI Services
    DOCUMENTS: {
        CLASSIFY: `${API_BASE_URL}/api/documents/classify`,
        EXTRACT_DATA: `${API_BASE_URL}/api/documents/extract-data`,
        EXTRACT_BANK: `${API_BASE_URL}/api/documents/extract-bank-details`,
        DETECT_SIGNATURE: `${API_BASE_URL}/api/documents/detect-signature`,
        EXTRACT_TEXT: `${API_BASE_URL}/api/documents/extract-text`,
    }
};

// Helper to get headers with token if needed (for future use with JWT)
export const getHeaders = (token?: string) => {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
};

// Export API_CONFIG for compatibility
export const API_CONFIG = {
    BASE_URL: API_BASE_URL,
    ENDPOINTS: {
        ...ENDPOINTS,
        ADMIN: {
            ...ENDPOINTS.ADMIN,
            GET_REQUESTS: `${API_BASE_URL}/api/admin/requests`,
            CREATE_REQUEST: `${API_BASE_URL}/api/admin/requests`,
            STATS: `${API_BASE_URL}/api/admin/stats`,
        }
    }
};

/**
 * Supabase Client Shim — Drop-in replacement that routes to Python backend.
 * 
 * This module replaces the real Supabase client with a shim that:
 * - functions.invoke() → fetch to Python API endpoints
 * - .from(table) → fetch to /api/data/{table} endpoints
 * - .auth → fetch to /api/auth endpoints
 * - .storage → fetch to /api/files endpoints
 *
 * All existing component code continues working unchanged.
 */

const API_BASE = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:8000" : "");

// --- Auth token management ---
let _accessToken: string | null = localStorage.getItem("access_token");
let _authChangeCallbacks: Array<(event: string, session: any) => void> = [];

function getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    if (_accessToken) {
        headers["Authorization"] = `Bearer ${_accessToken}`;
    }
    return headers;
}

function setToken(token: string | null) {
    _accessToken = token;
    if (token) {
        localStorage.setItem("access_token", token);
    } else {
        localStorage.removeItem("access_token");
    }
}

function notifyAuthChange(event: string, session: any) {
    for (const cb of _authChangeCallbacks) {
        try { cb(event, session); } catch (e) { console.error("Auth callback error:", e); }
    }
}

// --- Edge Function mapping ---
const FUNCTION_ENDPOINT_MAP: Record<string, { url: string; method?: string }> = {
    "vendor-form-api": { url: "/api/vendors/form", method: "POST" },
    "vendor-status": { url: "/api/vendors/status", method: "POST" },
    "search-streets": { url: "/api/vendors/search-streets", method: "POST" },
    "send-vendor-otp": { url: "/api/vendors/send-otp", method: "POST" },
    "verify-vendor-otp": { url: "/api/vendors/verify-otp", method: "POST" },
    "send-vendor-email": { url: "/api/vendors/send-email", method: "POST" },
    "send-vendor-confirmation": { url: "/api/vendors/confirm", method: "POST" },
    "send-vendor-rejection": { url: "/api/vendors/reject", method: "POST" },
    "send-quote-request": { url: "/api/vendors/send-quote-request", method: "POST" },
    "send-quote-approval-email": { url: "/api/vendors/send-quote-approval-email", method: "POST" },
    "extract-bank-details": { url: "/api/documents/extract-bank-details", method: "POST" },
    "extract-document-data": { url: "/api/documents/extract-data", method: "POST" },
    "extract-document-text": { url: "/api/documents/extract-text", method: "POST" },
    "classify-document": { url: "/api/documents/classify", method: "POST" },
    "send-approval-request": { url: "/api/users/send-approval-request", method: "POST" },
    "send-manager-approval": { url: "/api/users/send-manager-approval", method: "POST" },
    "send-receipts-link": { url: "/api/receipts/send-link", method: "POST" },
    "send-receipt-status": { url: "/api/receipts/status", method: "POST" },
    "send-handler-notification": { url: "/api/vendors/send-handler-notification", method: "POST" },
    "approve-user": { url: "/api/users/approve", method: "POST" },
};

// --- Functions API (replaces supabase.functions.invoke) ---
const functionsApi = {
    async invoke(functionName: string, options?: { body?: any }) {
        const mapping = FUNCTION_ENDPOINT_MAP[functionName];
        if (!mapping) {
            console.warn(`[supabase-shim] Unknown function: ${functionName}, trying /api/${functionName}`);
        }
        const url = `${API_BASE}${mapping?.url ?? `/api/${functionName}`}`;
        const method = mapping?.method ?? "POST";

        try {
            const isFormData = options?.body instanceof FormData;
            const headers: Record<string, string> = {
                ...getAuthHeaders(),
            };
            if (!isFormData) {
                headers["Content-Type"] = "application/json";
            }

            const response = await fetch(url, {
                method,
                headers,
                body: isFormData ? options!.body : options?.body ? JSON.stringify(options.body) : undefined,
            });

            const responseData = await response.json().catch(() => null);

            if (!response.ok) {
                return {
                    data: null,
                    error: { message: responseData?.detail || responseData?.error || `HTTP ${response.status}` },
                    response,
                };
            }

            return { data: responseData, error: null, response };
        } catch (err: any) {
            return { data: null, error: { message: err.message }, response: null };
        }
    }
};

// --- Query Builder (replaces supabase.from(table).select/insert/update/delete) ---
class QueryBuilder {
    private _table: string;
    private _operation: "select" | "insert" | "update" | "delete" | "upsert" = "select";
    private _columns = "*";
    private _filters: Array<{ type: string; column: string; value: any }> = [];
    private _body: any = null;
    private _orderBy: string | null = null;
    private _orderDesc = false;
    private _limitN: number | null = null;
    private _single = false;
    private _maybeSingle = false;
    private _count: string | null = null;
    private _head = false;

    constructor(table: string) {
        this._table = table;
    }

    select(columns = "*", options?: { count?: string; head?: boolean }) {
        this._operation = "select";
        this._columns = columns;
        if (options?.count) this._count = options.count;
        if (options?.head) this._head = true;
        return this;
    }

    insert(data: any) {
        this._operation = "insert";
        this._body = data;
        return this;
    }

    update(data: any) {
        this._operation = "update";
        this._body = data;
        return this;
    }

    delete() {
        this._operation = "delete";
        return this;
    }

    upsert(data: any) {
        this._operation = "upsert";
        this._body = data;
        return this;
    }

    eq(column: string, value: any) { this._filters.push({ type: "eq", column, value }); return this; }
    neq(column: string, value: any) { this._filters.push({ type: "neq", column, value }); return this; }
    gt(column: string, value: any) { this._filters.push({ type: "gt", column, value }); return this; }
    gte(column: string, value: any) { this._filters.push({ type: "gte", column, value }); return this; }
    lt(column: string, value: any) { this._filters.push({ type: "lt", column, value }); return this; }
    lte(column: string, value: any) { this._filters.push({ type: "lte", column, value }); return this; }
    in(column: string, values: any[]) { this._filters.push({ type: "in", column, value: values }); return this; }
    is(column: string, value: any) { this._filters.push({ type: "is", column, value }); return this; }
    ilike(column: string, pattern: string) { this._filters.push({ type: "ilike", column, value: pattern }); return this; }
    or(filterStr: string) { this._filters.push({ type: "or", column: "", value: filterStr }); return this; }

    order(column: string, options?: { ascending?: boolean }) {
        this._orderBy = column;
        this._orderDesc = options?.ascending === false;
        return this;
    }

    limit(n: number) { this._limitN = n; return this; }
    single() { this._single = true; return this; }
    maybeSingle() { this._maybeSingle = true; return this; }

    async then(resolve: (value: any) => void, reject?: (reason: any) => void) {
        try {
            const result = await this._execute();
            resolve(result);
        } catch (err) {
            if (reject) reject(err);
            else throw err;
        }
    }

    async _execute(): Promise<{ data: any; error: any; count?: number }> {
        const url = `${API_BASE}/api/data/${this._table}`;

        const payload: any = {
            operation: this._operation,
            columns: this._columns,
            filters: this._filters,
        };

        if (this._body !== null) payload.body = this._body;
        if (this._orderBy) payload.order_by = this._orderBy;
        if (this._orderDesc) payload.order_desc = true;
        if (this._limitN !== null) payload.limit = this._limitN;
        if (this._single) payload.single = true;
        if (this._maybeSingle) payload.maybe_single = true;
        if (this._count) payload.count = this._count;
        if (this._head) payload.head = true;

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...getAuthHeaders(),
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json().catch(() => null);

            if (!response.ok) {
                return { data: null, error: { message: data?.detail || `HTTP ${response.status}` } };
            }

            let resultData = data?.data ?? data;
            const count = data?.count;

            if (this._single && Array.isArray(resultData)) {
                resultData = resultData[0] || null;
                if (!resultData) {
                    return { data: null, error: { message: "Row not found", code: "PGRST116" } };
                }
            }
            if (this._maybeSingle && Array.isArray(resultData)) {
                resultData = resultData[0] || null;
            }

            return { data: resultData, error: null, count };
        } catch (err: any) {
            return { data: null, error: { message: err.message } };
        }
    }
}

// --- Storage API (replaces supabase.storage) ---
const storageApi = {
    from(bucket: string) {
        return {
            async upload(path: string, file: File | Blob, options?: any) {
                const formData = new FormData();
                formData.append("file", file);
                formData.append("path", path);
                if (options?.upsert) formData.append("upsert", "true");

                try {
                    const response = await fetch(`${API_BASE}/api/files/${bucket}/upload`, {
                        method: "POST",
                        headers: getAuthHeaders(),
                        body: formData,
                    });
                    const data = await response.json().catch(() => null);
                    if (!response.ok) return { data: null, error: { message: data?.detail || "Upload failed" } };
                    return { data: { path }, error: null };
                } catch (err: any) {
                    return { data: null, error: { message: err.message } };
                }
            },

            async download(path: string) {
                try {
                    const response = await fetch(`${API_BASE}/api/files/${bucket}/${path}`, {
                        headers: getAuthHeaders(),
                    });
                    if (!response.ok) return { data: null, error: { message: `Download failed: ${response.status}` } };
                    const blob = await response.blob();
                    return { data: blob, error: null };
                } catch (err: any) {
                    return { data: null, error: { message: err.message } };
                }
            },

            async remove(paths: string[]) {
                try {
                    const response = await fetch(`${API_BASE}/api/files/${bucket}/remove`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
                        body: JSON.stringify({ paths }),
                    });
                    const data = await response.json().catch(() => null);
                    if (!response.ok) return { data: null, error: { message: data?.detail || "Remove failed" } };
                    return { data, error: null };
                } catch (err: any) {
                    return { data: null, error: { message: err.message } };
                }
            },

            getPublicUrl(path: string) {
                return { data: { publicUrl: `${API_BASE}/api/files/${bucket}/${path}` } };
            },

            async list(path?: string) {
                try {
                    const response = await fetch(`${API_BASE}/api/files/${bucket}/list${path ? `?path=${encodeURIComponent(path)}` : ""}`, {
                        headers: getAuthHeaders(),
                    });
                    const data = await response.json().catch(() => null);
                    if (!response.ok) return { data: null, error: { message: data?.detail || "List failed" } };
                    return { data, error: null };
                } catch (err: any) {
                    return { data: null, error: { message: err.message } };
                }
            },
        };
    }
};

// --- Auth API (replaces supabase.auth) ---
const authApi = {
    async signUp({ email, password, options }: { email: string; password: string; options?: any }) {
        try {
            const response = await fetch(`${API_BASE}/api/auth/signup`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, full_name: options?.data?.full_name }),
            });
            const data = await response.json();
            if (!response.ok) return { data: { user: null, session: null }, error: { message: data.detail } };

            setToken(data.access_token);
            const session = { access_token: data.access_token, user: data.user };
            notifyAuthChange("SIGNED_IN", session);
            return { data: { user: data.user, session }, error: null };
        } catch (err: any) {
            return { data: { user: null, session: null }, error: { message: err.message } };
        }
    },

    async signInWithPassword({ email, password }: { email: string; password: string }) {
        try {
            const response = await fetch(`${API_BASE}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });
            const data = await response.json();
            if (!response.ok) return { data: { user: null, session: null }, error: { message: data.detail } };

            setToken(data.access_token);
            const user = data.user;
            const session = { access_token: data.access_token, user };
            notifyAuthChange("SIGNED_IN", session);
            return { data: { user, session }, error: null };
        } catch (err: any) {
            return { data: { user: null, session: null }, error: { message: err.message } };
        }
    },

    async signOut() {
        try {
            await fetch(`${API_BASE}/api/auth/logout`, {
                method: "POST",
                headers: getAuthHeaders(),
            });
        } catch (e) { /* ignore */ }
        setToken(null);
        notifyAuthChange("SIGNED_OUT", null);
        return { error: null };
    },

    async getSession() {
        if (!_accessToken) {
            return { data: { session: null }, error: null };
        }
        try {
            const response = await fetch(`${API_BASE}/api/auth/me`, {
                headers: getAuthHeaders(),
            });
            if (!response.ok) {
                setToken(null);
                return { data: { session: null }, error: null };
            }
            const user = await response.json();
            return {
                data: { session: { access_token: _accessToken, user } },
                error: null,
            };
        } catch {
            return { data: { session: null }, error: null };
        }
    },

    async getUser() {
        if (!_accessToken) {
            return { data: { user: null }, error: { message: "Not authenticated" } };
        }
        try {
            const response = await fetch(`${API_BASE}/api/auth/me`, {
                headers: getAuthHeaders(),
            });
            if (!response.ok) return { data: { user: null }, error: { message: "Not authenticated" } };
            const user = await response.json();
            return { data: { user }, error: null };
        } catch (err: any) {
            return { data: { user: null }, error: { message: err.message } };
        }
    },

    async setSession({ access_token }: { access_token: string; refresh_token?: string }) {
        setToken(access_token);
        const { data } = await authApi.getSession();
        notifyAuthChange("SIGNED_IN", data?.session);
        return { data, error: null };
    },

    async resetPasswordForEmail(email: string, options?: any) {
        try {
            const response = await fetch(`${API_BASE}/api/auth/reset-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            const data = await response.json();
            if (!response.ok) return { error: { message: data.detail } };
            return { data, error: null };
        } catch (err: any) {
            return { error: { message: err.message } };
        }
    },

    async updateUser(updates: { password?: string; data?: any }) {
        try {
            const response = await fetch(`${API_BASE}/api/auth/update-user`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...getAuthHeaders() },
                body: JSON.stringify(updates),
            });
            const data = await response.json();
            if (!response.ok) return { data: { user: null }, error: { message: data.detail } };
            return { data: { user: data }, error: null };
        } catch (err: any) {
            return { data: { user: null }, error: { message: err.message } };
        }
    },

    onAuthStateChange(callback: (event: string, session: any) => void) {
        _authChangeCallbacks.push(callback);
        return {
            data: {
                subscription: {
                    unsubscribe: () => {
                        _authChangeCallbacks = _authChangeCallbacks.filter(cb => cb !== callback);
                    }
                }
            }
        };
    },
};

// --- Main supabase shim ---
export const supabase = {
    functions: functionsApi,
    from: (table: string) => new QueryBuilder(table),
    auth: authApi,
    storage: storageApi,
};

export const isSupabaseConfigured = true;

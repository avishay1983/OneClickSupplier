import { API_CONFIG, getHeaders } from "@/config/api";
import { VendorRequest } from "@/types/vendor";
import { supabase } from "@/integrations/supabase/client";

export const adminService = {
    // Fetch all requests with optional filtering
    getRequests: async (filters?: { status?: string; handler?: string; search?: string }): Promise<VendorRequest[]> => {
        try {
            // Build query string
            const params = new URLSearchParams();
            if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
            if (filters?.handler && filters.handler !== 'all') params.append('handler', filters.handler);
            if (filters?.search) params.append('search', filters.search);

            const response = await fetch(`${API_CONFIG.ENDPOINTS.ADMIN.GET_REQUESTS}?${params.toString()}`, {
                method: 'GET',
                headers: getHeaders(),
            });

            if (!response.ok) throw new Error('Failed to fetch requests');

            const data = await response.json();
            return data.requests || [];
        } catch (error) {
            console.error('Error fetching requests from API:', error);
            throw error;
        }
    },

    // Create a new vendor request
    createRequest: async (data: any): Promise<any> => {
        try {
            const response = await fetch(`${API_CONFIG.ENDPOINTS.ADMIN.CREATE_REQUEST}`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Failed to create request');
            }

            return await response.json();
        } catch (error) {
            console.error('Error creating request via API:', error);
            throw error;
        }
    },

    // Get dashboard stats
    getStats: async (): Promise<any> => {
        try {
            const response = await fetch(API_CONFIG.ENDPOINTS.ADMIN.STATS, {
                method: 'GET',
                headers: getHeaders(),
            });

            if (!response.ok) throw new Error('Failed to fetch stats');
            return await response.json();
        } catch (error) {
            console.error('Error fetching stats:', error);
            throw error;
        }
    }
};

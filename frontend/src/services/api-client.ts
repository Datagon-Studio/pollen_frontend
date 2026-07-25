import { supabase } from '@/lib/supabase';

// Backend URL:
// - In development: use VITE_API_URL if defined (e.g. http://localhost:3333/api/v1)
// - In production (Vercel): always hit same-origin /api/v1 so that
//   requests go through the serverless function
const API_BASE_URL =
  import.meta.env.DEV && import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL
    : '/api/v1';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  ussd_code?: string;
}

export async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Get auth token from Supabase session and refresh if needed
  let { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  // If session exists but token might be expired, try to refresh
  if (session && session.expires_at) {
    const expiresAt = session.expires_at * 1000; // Convert to milliseconds
    const now = Date.now();
    const bufferTime = 5 * 60 * 1000; // 5 minutes buffer
    
    // If token expires within 5 minutes, refresh it
    if (expiresAt - now < bufferTime) {
      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
      if (!refreshError && refreshedSession) {
        session = refreshedSession;
      }
    }
  }
  
  const token = session?.access_token;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const config: RequestInit = {
    headers,
    ...options,
  };

  try {
    const response = await fetch(url, config);
    
    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      // If not JSON, read as text
      const text = await response.text();
      console.error('Non-JSON response:', text);
      return {
        success: false,
        error: `Server returned non-JSON response: ${response.status} ${response.statusText}`,
      };
    }
    
    if (!response.ok) {
      // Handle 401 Unauthorized - token expired or invalid
      if (response.status === 401) {
        // Try to refresh the session once
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        
        if (!refreshError && refreshedSession) {
          // Retry the request with the new token
          const retryHeaders: HeadersInit = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${refreshedSession.access_token}`,
            ...options.headers,
          };
          
          const retryResponse = await fetch(url, {
            ...config,
            headers: retryHeaders,
          });
          
          if (retryResponse.ok) {
            const retryData = await retryResponse.json();
            return retryData;
          }
        }
        
        // If refresh failed or retry failed, clear session and redirect
        console.warn('Token expired or invalid, clearing session');
        await supabase.auth.signOut();
        
        // Only redirect if we're in the browser, not already on signin, and not on a public route
        if (typeof window !== 'undefined' && 
            !window.location.pathname.includes('/signin') &&
            !window.location.pathname.startsWith('/group') &&
            !window.location.pathname.startsWith('/payment/callback')) {
          window.location.href = '/signin';
        }
      }
      
      console.error('API Error:', {
        url,
        status: response.status,
        statusText: response.statusText,
        error: data.error || data.message,
      });
      return {
        success: false,
        error: data.error || data.message || `HTTP error! status: ${response.status}`,
      };
    }
    
    return data;
  } catch (error) {
    console.error('API Request Failed:', {
      url,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error - backend may be down',
    };
  }
}

export const apiClient = {
  get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return request<T>(endpoint, { method: 'GET' });
  },

  post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  put<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return request<T>(endpoint, { method: 'DELETE' });
  },
};


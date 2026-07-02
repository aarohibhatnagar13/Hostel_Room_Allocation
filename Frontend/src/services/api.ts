/// <reference types="vite/client" />

if (!import.meta.env.VITE_API_BASE_URL) {
  console.error("CRITICAL: VITE_API_BASE_URL is missing from environment variables.");
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const fetchOptions = (method: string, body?: any, extraHeaders = {}) => {
  const options: RequestInit = {
    method,
    credentials: 'include',
    headers: {
      ...extraHeaders,
    },
  };
  if (body) {
    options.body = JSON.stringify(body);
    options.headers = { ...options.headers, 'Content-Type': 'application/json' };
  }
  return options;
};

const handleResponse = async (res: Response) => {
  if (res.status === 409) {
    const data = await res.json();
    return { success: false, conflict: true, message: data.message };
  }

  const data = await res.json().catch(() => ({}));

  if ((res.status === 401 || res.status === 403) && !res.url.includes('/auth/login')) {
    localStorage.clear();
    window.location.href = '/';
    return { success: false, message: "Session expired. Please log in again." };
  }

  if (!res.ok) {
    throw new Error(data.message || 'API Request Failed');
  }

  return data;
};

export const api = {
  // --- AUTHENTICATION ---
  login: async (email: string, password?: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, fetchOptions('POST', { email, password }));
      return await handleResponse(res);
    } catch (err: any) {
      return { success: false, message: err.message || "Network Error" };
    }
  },

  signup: async (userData: any) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/signup`, fetchOptions('POST', userData));
      return await handleResponse(res);
    } catch (err: any) {
      return { success: false, message: err.message || "Network Error" };
    }
  },

  verifyEmailToken: async (token: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/verify/${token}`, fetchOptions('POST'));
      return await handleResponse(res);
    } catch (err: any) {
      return { success: false, message: err.message || "Network Error" };
    }
  },

  forgotPassword: async (email: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, fetchOptions('POST', { email }));
      return await handleResponse(res);
    } catch (err: any) {
      return { success: false, message: err.message || "Network Error" };
    }
  },

  resetPassword: async (token: string, newPassword: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/reset-password`, fetchOptions('POST', { token, newPassword }));
      return await handleResponse(res);
    } catch (err: any) {
      return { success: false, message: err.message || "Network Error" };
    }
  },

  // --- STUDENT PORTAL ---
  checkStudentStatus: async (rollNo: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/student/check/${rollNo.toUpperCase()}`, fetchOptions('GET'));
      return await handleResponse(res);
    } catch (error) { throw error; }
  },

  submitStudentPreferences: async (payload: any) => {
    try {
      const res = await fetch(`${API_BASE_URL}/student/preferences`, fetchOptions('POST', payload));
      return await handleResponse(res);
    } catch (error: any) {
      return { success: false, message: error.message || "Network Error" };
    }
  },

  confirmRoomBooking: async (studentId: string, roomId: string, version: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/allocation/confirm`,
        fetchOptions('POST', { studentId, roomId, version }));
      return await handleResponse(res);
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  },

  // --- ADMIN & WARDEN ---
  getRooms: async (page?: number, limit?: number, block?: string, search?: string) => {
    const query = new URLSearchParams();
    if (page) query.append('page', page.toString());
    if (limit) query.append('limit', limit.toString());
    if (block && block !== 'ALL') query.append('hostelBlock', block);
    if (search) query.append('search', search);
    const res = await fetch(`${API_BASE_URL}/rooms?${query.toString()}`, fetchOptions('GET'));
    return await handleResponse(res);
  },

  getStudentReports: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/students`, fetchOptions('GET'));
      return await handleResponse(res);
    } catch (e: any) { 
      return { success: false, message: e.message }; 
    }
  },

  runAllocation: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/allocation/run`, fetchOptions('POST'));
      return await handleResponse(res);
    } catch (e: any) { return { success: false, message: e.message }; }
  },

  getAllocationHistory: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/allocation/history`, fetchOptions('GET'));
      return await handleResponse(res);
    } catch (e: any) { return { success: false, message: e.message }; }
  },

  getCachedRunDetails: async (runId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/allocation/history/${runId}`, fetchOptions('GET'));
      return await handleResponse(res);
    } catch (e: any) { return { success: false, message: e.message }; }
  }
};
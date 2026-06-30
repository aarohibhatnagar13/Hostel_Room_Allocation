/// <reference types="vite/client" />
if (!import.meta.env.VITE_API_BASE_URL) {
    console.error("CRITICAL: VITE_API_BASE_URL is missing from environment variables.");
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Helper to standardise fetch options and enforce secure cookies
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

// GLOBAL 401 INTERCEPTOR
// This catches expired tokens and forces the user back to the login screen automatically.
const handleResponse = async (res: Response) => {
    const data = await res.json().catch(() => ({})); // Safe parse

    // Catch both Expired (401) and Revoked/Forbidden (403) and force redirect!
    if ((res.status === 401 || res.status === 403) && !res.url.includes('/auth/login')) {
        console.warn("Session expired or unauthorized. Redirecting to login...");
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

  // --- STUDENT PORTAL CALLS ---
  checkStudentStatus: async (rollNo: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/student/check/${rollNo.toUpperCase()}`, fetchOptions('GET'));
      return await handleResponse(res);
    } catch (error) { throw error; }
  },

  submitStudentData: async (payload: any) => {
    try {
        const res = await fetch(`${API_BASE_URL}/student/submit`, fetchOptions('POST', payload));
        return await handleResponse(res);
    } catch (error: any) {
        return { success: false, message: error.message || "Network Error" };
    }
  },

  withdrawApplication: async (payload: { rollNo: string, availabilityId?: number }) => {
    try {
      const res = await fetch(`${API_BASE_URL}/student/withdraw`, fetchOptions('POST', payload));
      return await handleResponse(res);
    } catch (error: any) {
      return { success: false, message: error.message || "Network error during withdrawal" };
    }
  },

  // --- ADMIN: DATA FETCHING ---
  getLabs: async (page?: number, limit?: number, day?: string, subject?: string, search?: string, academicYear?: string, semester?: string) => {
    const query = new URLSearchParams();
    if (page) query.append('page', page.toString());
    if (limit) query.append('limit', limit.toString());
    if (day && day !== 'ALL') query.append('day', day);
    if (subject && subject !== 'ALL') query.append('subject', subject);
    if (search) query.append('search', search);
    if (academicYear) query.append('academicYear', academicYear);
    if (semester) query.append('semester', semester);
    const res = await fetch(`${API_BASE_URL}/labs?${query.toString()}`, fetchOptions('GET'));
    return await handleResponse(res);
  },

  getAllocationResults: async (page?: number | string, limit?: number, round?: string | number, day?: string, subject?: string, academicYear?: string, semester?: string) => {
    const query = new URLSearchParams();
    if (page) query.append('page', page.toString());
    if (limit) query.append('limit', limit.toString());
    if (round && round !== 'ALL') query.append('round', round.toString());
    if (day && day !== 'ALL') query.append('day', day);
    if (subject && subject !== 'ALL') query.append('subject', subject);
    if (academicYear) query.append('academicYear', academicYear);
    if (semester) query.append('semester', semester);
    const res = await fetch(`${API_BASE_URL}/admin/results?${query.toString()}`, fetchOptions('GET'));
    return await handleResponse(res);
  },

  getAttendance: async (labId: string, date: string, academicYear?: string, semester?: string, isExport?: boolean) => {
    const query = new URLSearchParams({ labId, date });
    if (academicYear) query.append('academicYear', academicYear);
    if (semester) query.append('semester', semester);
    if (isExport) query.append('export', 'true');
    const res = await fetch(`${API_BASE_URL}/admin/attendance?${query.toString()}`, fetchOptions('GET'));
    return await handleResponse(res);
  },

  exportLabAttendance: async (labId: string, academicYear?: string, semester?: string) => {
    const query = new URLSearchParams({ labId });
    if (academicYear) query.append('academicYear', academicYear);
    if (semester) query.append('semester', semester);
    const res = await fetch(`${API_BASE_URL}/admin/attendance/export?${query.toString()}`, fetchOptions('GET'));
    return await handleResponse(res);
  },

  getStudents: async (page?: number, limit?: number, search?: string) => {
    const query = new URLSearchParams();
    if (page) query.append('page', page.toString());
    if (limit) query.append('limit', limit.toString());
    if (search) query.append('search', search);
    const res = await fetch(`${API_BASE_URL}/admin/students?${query.toString()}`, fetchOptions('GET'));
    return await handleResponse(res);
  },

  // --- ADMIN: ACTIONS ---
  uploadLabsBulk: async (labs: any[]) => {
    try {
        const res = await fetch(`${API_BASE_URL}/admin/labs/bulk`, fetchOptions('POST', labs));
        return await handleResponse(res);
    } catch (e: any) { return { success: false, message: e.message }; }
  },

  addLab: async (lab: any) => {
    try {
        const res = await fetch(`${API_BASE_URL}/admin/labs`, fetchOptions('POST', lab));
        return await handleResponse(res);
    } catch (e: any) { return { success: false, message: e.message }; }
  },

  updateLabDetails: async (id: string, labData: any) => {
    try {
        const res = await fetch(`${API_BASE_URL}/admin/labs/${id}`, fetchOptions('PUT', labData));
        return await handleResponse(res);
    } catch (e: any) { return { success: false, message: e.message }; }
  },

  updateLabCapacity: async (labId: string, capacity: number) => {
    try {
        const res = await fetch(`${API_BASE_URL}/admin/labs/${labId}/capacity`, fetchOptions('PUT', { capacity }));
        return await handleResponse(res);
    } catch (e: any) { return { success: false, message: e.message }; }
  },

  deleteLab: async (id: string) => {
    try {
        const res = await fetch(`${API_BASE_URL}/admin/labs/${id}`, fetchOptions('DELETE'));
        return await handleResponse(res);
    } catch (e: any) { return { success: false, message: e.message }; }
  },

  addStudent: async (student: any) => {
    try {
        const res = await fetch(`${API_BASE_URL}/admin/students`, fetchOptions('POST', student));
        return await handleResponse(res);
    } catch (e: any) { return { success: false, message: e.message }; }
  },

  manualAllocate: async (studentId: string, labId: string) => {
    try {
        const res = await fetch(`${API_BASE_URL}/admin/manual-allocate`, fetchOptions('POST', { studentId, labId }));
        return await handleResponse(res);
    } catch (e: any) { return { success: false, message: e.message }; }
  },

  deallocateStudent: async (studentId: string, labId: string) => {
    try {
        const res = await fetch(`${API_BASE_URL}/admin/deallocate`, fetchOptions('POST', { studentId, labId }));
        return await handleResponse(res);
    } catch (e: any) { return { success: false, message: e.message }; }
  },

  toggleBlacklist: async (studentId: string, scope: 'all' | 'lab', labId?: string, blacklistedBy?: string) => {
    try {
        const res = await fetch(`${API_BASE_URL}/admin/student/blacklist`, fetchOptions('POST', { studentId, scope, labId, blacklistedBy }));
        return await handleResponse(res);
    } catch (e: any) { return { success: false, message: e.message }; }
  },

  // --- ADMIN: ALLOCATION ENGINE ---
  runAllocation: async () => {
    try {
        const res = await fetch(`${API_BASE_URL}/admin/allocate`, fetchOptions('POST'));
        return await handleResponse(res);
    } catch (e: any) { return { success: false, message: e.message }; }
  },

  confirmRound: async () => {
    try {
        const res = await fetch(`${API_BASE_URL}/admin/allocate/confirm`, fetchOptions('POST', {}));
        return await handleResponse(res);
    } catch (e: any) { return { success: false, message: e.message }; }
  },

  rollbackRound: async () => {
    try {
        const res = await fetch(`${API_BASE_URL}/admin/allocate/rollback`, fetchOptions('POST'));
        return await handleResponse(res);
    } catch (e: any) { return { success: false, message: e.message }; }
  },

  clearAllocations: async () => {
    try {
        const res = await fetch(`${API_BASE_URL}/admin/allocate/clear`, fetchOptions('DELETE'));
        return await handleResponse(res);
    } catch (e: any) { return { success: false, message: e.message }; }
  },

  // --- ADMIN: SETTINGS & TERMS ---
  getSettings: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/settings`, fetchOptions('GET'));
      return await handleResponse(res);
    } catch {
      return { success: false, currentRound: 1, isConfirmed: false };
    }
  },

  updateSettings: async (settings: any) => {
    try {
        const res = await fetch(`${API_BASE_URL}/admin/settings`, fetchOptions('POST', settings));
        return await handleResponse(res);
    } catch (e: any) { return { success: false, message: e.message }; }
  },

  getTerms: async () => {
    try {
        const res = await fetch(`${API_BASE_URL}/admin/terms`, fetchOptions('GET'));
        return await handleResponse(res);
    } catch { return { success: false, data: [] }; }
  },

  // --- MISC & REPORTS ---
  saveAttendance: async (labId: string, date: string, records: any[]) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/attendance`, fetchOptions('POST', { labId, date, records }));
      return await handleResponse(res);
    } catch (e: any) { return { success: false, message: e.message || "Network Error" }; }
  },

  getManagers: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/managers`, fetchOptions('GET'));
      return await handleResponse(res);
    } catch { return { success: false, data: [] }; }
  },

  addManager: async (email: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/managers`, fetchOptions('POST', { email }));
      return await handleResponse(res);
    } catch (e: any) { return { success: false, message: e.message || "Network Error" }; }
  },

  removeManager: async (id: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/managers/${id}`, fetchOptions('DELETE'));
      return await handleResponse(res);
    } catch (e: any) { return { success: false, message: e.message || "Network Error" }; }
  },

  getUnfulfilledLabs: async () => {
    try {
        const res = await fetch(`${API_BASE_URL}/admin/labs/unfulfilled`, fetchOptions('GET'));
        return await handleResponse(res);
    } catch { return { success: false, data: [] }; }
  },

  getArchives: async (page?: number, limit?: number, academicYear?: string, semester?: string) => {
    try {
        const query = new URLSearchParams();
        if (page) query.append('page', page.toString());
        if (limit) query.append('limit', limit.toString());
        if (academicYear) query.append('academicYear', academicYear);
        if (semester) query.append('semester', semester);
        const res = await fetch(`${API_BASE_URL}/admin/archives?${query.toString()}`, fetchOptions('GET'));
        return await handleResponse(res);
    } catch { return { success: false, data: [] }; }
  }
};
import { api } from './api';

/**
 * Authenticates the user against the backend.
 * The backend handles domain validation, role assignment, and securely 
 * sets an HttpOnly cookie containing the JWT.
 */
export const loginUser = async (email: string, password?: string) => {
  try {
    // Calls the updated api.login which includes { credentials: 'include' }
    const response = await api.login(email, password);
    
    if (response.success) {
      return { 
        success: true, 
        role: response.role, 
        rollNo: response.rollNo 
      };
    }
    
    return { 
      success: false, 
      message: response.message || "Invalid credentials or email." 
    };
    
  } catch (error: any) {
    console.error("Login Error:", error);
    return { 
      success: false, 
      message: error.message || "Network Error. Is the server running?" 
    };
  }
};

/**
 * Logs the user out by hitting the backend logout route,
 * which blacklists the token in MySQL and clears the secure cookie.
 */
export const logoutUser = async () => {
    try {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
        if (!API_BASE_URL) throw new Error("VITE_API_BASE_URL is not defined in environment variables");
        await fetch(`${API_BASE_URL}/auth/logout`, {
            method: 'POST',
            credentials: 'include' // Ensures the cookie is sent to be cleared
        });
    } catch (error) {
        console.error("Logout failed:", error);
    }
};
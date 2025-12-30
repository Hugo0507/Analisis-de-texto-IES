/**
 * Authentication Service
 *
 * Handles JWT authentication, login, logout, and user management.
 */

import apiClient from './api';

export interface User {
  id: number;
  username: string;
  email: string;
  name: string;
  surname: string;
  full_name: string;
  role: 'admin' | 'user';
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface CreateUserData {
  username: string;
  email: string;
  password: string;
  password_confirm: string;
  name: string;
  surname: string;
  role: 'admin' | 'user';
  is_active: boolean;
}

export interface UpdateUserData {
  username?: string;
  email?: string;
  name?: string;
  surname?: string;
  role?: 'admin' | 'user';
  is_active?: boolean;
}

class AuthService {
  private readonly TOKEN_KEY = 'authToken';
  private readonly REFRESH_KEY = 'refreshToken';
  private readonly USER_KEY = 'currentUser';

  /**
   * Login with username and password
   */
  async login(credentials: LoginCredentials): Promise<User> {
    const response = await apiClient.post<LoginResponse>('/auth/login/', credentials);

    const { access, refresh, user } = response.data;

    // Store tokens and user data
    localStorage.setItem(this.TOKEN_KEY, access);
    localStorage.setItem(this.REFRESH_KEY, refresh);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));

    return user;
  }

  /**
   * Logout - clear all auth data
   */
  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  /**
   * Get current user from localStorage
   */
  getCurrentUser(): User | null {
    const userStr = localStorage.getItem(this.USER_KEY);
    if (!userStr) return null;

    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Get access token
   */
  getAccessToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Get refresh token
   */
  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_KEY);
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(): Promise<string> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await apiClient.post<{ access: string }>('/auth/refresh/', {
      refresh: refreshToken,
    });

    const { access } = response.data;
    localStorage.setItem(this.TOKEN_KEY, access);

    return access;
  }

  /**
   * Fetch current user data from API
   */
  async fetchCurrentUser(): Promise<User> {
    const response = await apiClient.get<User>('/users/me/');
    const user = response.data;

    // Update stored user data
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));

    return user;
  }

  /**
   * Get all users (admin only)
   */
  async getUsers(): Promise<User[]> {
    const response = await apiClient.get<{ results: User[] }>('/users/');
    return response.data.results || response.data as any;
  }

  /**
   * Get user by ID
   */
  async getUserById(id: number): Promise<User> {
    const response = await apiClient.get<User>(`/users/${id}/`);
    return response.data;
  }

  /**
   * Create new user
   */
  async createUser(data: CreateUserData): Promise<User> {
    const response = await apiClient.post<User>('/users/', data);
    return response.data;
  }

  /**
   * Update user
   */
  async updateUser(id: number, data: UpdateUserData): Promise<User> {
    const response = await apiClient.patch<User>(`/users/${id}/`, data);
    return response.data;
  }

  /**
   * Delete user
   */
  async deleteUser(id: number): Promise<void> {
    await apiClient.delete(`/users/${id}/`);
  }

  /**
   * Change password
   */
  async changePassword(userId: number, oldPassword: string, newPassword: string): Promise<void> {
    await apiClient.post(`/users/${userId}/change-password/`, {
      old_password: oldPassword,
      new_password: newPassword,
      new_password_confirm: newPassword,
    });
  }
}

export default new AuthService();

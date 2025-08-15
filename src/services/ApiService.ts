import { User } from '../types';
import { 
  getApiBaseUrl, 
  getApiTimeout, 
  getMaxRetryAttempts,
  getUploadMaxSize,
  debugLog,
  currentConfig
} from '../config/environment';


export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken?: string;
}



export interface ApiConfig {
  baseUrl: string;
  apiKey?: string;
  timeout: number;
  retryAttempts: number;
  retryDelay?: number;
}

export interface ApiRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, any>;
  timeout?: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  statusCode: number;
  headers?: Record<string, string>;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ApiServiceClass {
  private config: ApiConfig;
  private authService: AuthService;
  private authToken?: string;

  constructor() {
    this.config = {
      baseUrl: getApiBaseUrl(),
      timeout: getApiTimeout(),
      retryAttempts: getMaxRetryAttempts(),
      retryDelay: 1000
    };
    this.authService = new AuthService();
    
    debugLog('ApiService initialized with config:', this.config);
  }

  setAuthToken(token: string) {
    this.authToken = token;
  }

  clearAuthToken() {
    this.authToken = undefined;
  }



  private buildUrl(endpoint: string, params?: Record<string, any>): string {
    const url = new URL(endpoint, this.config.baseUrl);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    
    return url.toString();
  }

  private getDefaultHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (this.config.apiKey) {
      headers['X-API-Key'] = this.config.apiKey;
    }

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  private async executeRequest<T>(
    url: string,
    options: ApiRequestOptions,
    attempt = 1
  ): Promise<ApiResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      options.timeout || this.config.timeout
    );

    try {
      const requestOptions: RequestInit = {
        method: options.method,
        headers: {
          ...this.getDefaultHeaders(),
          ...options.headers,
        },
        signal: controller.signal,
      };

      if (options.body && options.method !== 'GET') {
        requestOptions.body = JSON.stringify(options.body);
      }

      const response = await fetch(url, requestOptions);
      clearTimeout(timeoutId);

      let responseData: any;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      if (!response.ok) {
        
        if (response.status === 401) {
          
          this.clearAuthToken();
          throw new ApiError('Authentication required', response.status, responseData);
        }
        
  

        throw new ApiError(
          responseData?.message || responseData?.error || 'Request failed',
          response.status,
          responseData
        );
      }

      return {
        success: true,
        data: responseData,
        statusCode: response.status,
        headers: Object.fromEntries(response.headers.entries()),
      };

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof ApiError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError('Request timeout', 408);
      }

      if (!navigator.onLine) {
        throw new ApiError('No internet connection', 0);
      }

      
  

      throw new ApiError(
        error instanceof Error ? error.message : 'Network error',
        0,
        error
      );
    }
  }

  async request<T>(
    endpoint: string,
    options: ApiRequestOptions
  ): Promise<ApiResponse<T>> {
    const url = this.buildUrl(endpoint, options.params);
    return this.executeRequest(url, options);
  }

  
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    return this.request(endpoint, { method: 'GET', params });
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request(endpoint, { method: 'POST', body: data });
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request(endpoint, { method: 'PUT', body: data });
  }

  async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request(endpoint, { method: 'PATCH', body: data });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request(endpoint, { method: 'DELETE' });
  }

  
  async uploadFile<T>(
    endpoint: string,
    file: File,
    additionalData?: Record<string, any>
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }

    const headers = { ...this.getDefaultHeaders() };
    delete headers['Content-Type']; 

    return this.executeRequest(
      this.buildUrl(endpoint),
      {
        method: 'POST',
        headers,
        body: formData as any,
      }
    );
  }

  
  async batch<T>(requests: Array<{
    endpoint: string;
    options: ApiRequestOptions;
  }>): Promise<ApiResponse<T>[]> {
    const promises = requests.map(({ endpoint, options }) =>
      this.request<T>(endpoint, options).catch(error => ({
        success: false,
        error: error.message,
        statusCode: error.statusCode || 0,
      }))
    );

    return Promise.all(promises);
  }
}


export const defaultApiConfig: ApiConfig = {
  baseUrl: process.env.REACT_APP_API_URL || 'http://localhost:3000',
  timeout: 10000, 
  retryAttempts: 3,
  retryDelay: 1000, 
};


export const apiService = new ApiServiceClass();


export class AuthService {
  private static readonly TOKEN_KEY = 'fleetfix_auth_token';
  private static readonly REFRESH_TOKEN_KEY = 'fleetfix_refresh_token';
  private static readonly USER_KEY = 'fleetfix_user';

  static setTokens(accessToken: string, refreshToken?: string) {
    localStorage.setItem(this.TOKEN_KEY, accessToken);
    if (refreshToken) {
      localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
    }
    apiService.setAuthToken(accessToken);
  }

  static getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  static getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  static clearTokens() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    apiService.clearAuthToken();
  }

  static setUser(user: any) {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  static getUser(): any | null {
    const userData = localStorage.getItem(this.USER_KEY);
    return userData ? JSON.parse(userData) : null;
  }

  static isAuthenticated(): boolean {
    return !!this.getToken();
  }

  static async login(email: string, password: string): Promise<User> {
    const response = await apiService.post<LoginResponse>('/auth/login', { email, password });
    
    if (response.success && response.data) {
      this.setTokens(response.data.accessToken, response.data.refreshToken);
      if (response.data.user) {
        this.setUser(response.data.user);
      }
      return response.data.user;
    }
    
    throw new Error(response.error || 'Login failed');
  }

  static async logout(): Promise<void> {
    try {
      await apiService.post('/auth/logout');
    } catch (error) {
      console.warn('Logout request failed:', error);
    } finally {
      this.clearTokens();
    }
  }

  static async refreshAuthToken(): Promise<string> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await apiService.post<RefreshResponse>('/auth/refresh', { refreshToken });
    
    if (response.success && response.data?.accessToken) {
      this.setTokens(response.data.accessToken, response.data.refreshToken);
      return response.data.accessToken;
    }
    
    throw new Error('Token refresh failed');
  }

  static initializeAuth() {
    const token = this.getToken();
    if (token) {
      apiService.setAuthToken(token);
    }
  }
}


AuthService.initializeAuth();

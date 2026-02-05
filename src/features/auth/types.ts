/**
 * Auth Feature Types
 * All types related to authentication
 */

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  email: string;
  password: string;
  username: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    username: string;
  };
}

export interface AuthError {
  message: string;
  code?: string;
}

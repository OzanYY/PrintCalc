export interface User {
  id: string;
  email: string;
  name: string; 
  role?: 'user' | 'admin' | 'moderator';
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => void;
  isAuthenticated: boolean;
}

export interface LoginResult {
  success: boolean;
  error?: string;
}
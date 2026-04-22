// contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { authAPI } from '@/api/auth';

// Типы для пользователя (настрой под свой API)
interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

// Тип для ответа API
interface AuthStatusResponse {
  isAuth: boolean;
  user: User | null;
}

// Тип для контекста
interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isLoading: boolean;
}

// Создаем контекст с начальным значением undefined
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Тип для пропсов провайдера
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async (): Promise<void> => {
    try {
      const response = await authAPI.status();

      if (response.status != 200) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: AuthStatusResponse = await response.data;
      //console.log(data);
      setUser(data.user);
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="size-6" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, setUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

// Кастомный хук с проверкой использования внутри провайдера
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}
import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

// Определяем тип для пользователя (можно расширить в зависимости от ваших нужд)
interface User {
  id: string;
  email: string;
  username?: string;        
  is_activated?: boolean;   
  created_at?: string;      
  updated_at?: string;      
}
// Определяем тип для контекста
interface AuthContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

// 1. Создаем контекст с начальным значением undefined
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 2. Создаем провайдер
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  
  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// 3. Создаем хук для удобства
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth должен использоваться внутри AuthProvider');
  }
  
  return context;
};
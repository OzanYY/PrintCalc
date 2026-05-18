// components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

interface GuestRouteProps {
  children: React.ReactNode;
}

// Редиректит авторизованных пользователей на /profile
export function GuestRoute({ children }: GuestRouteProps) {
  const { user } = useAuth();

  if (user) {
    return <Navigate to="/profile" replace />;
  }

  return children;
}

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string; // опционально для проверки ролей
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Проверка роли (опционально)
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return children;
}
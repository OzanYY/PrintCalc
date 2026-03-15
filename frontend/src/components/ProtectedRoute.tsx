import { Navigate } from 'react-router-dom';
import { useAuth } from '../features/auth/context/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { user } = useAuth();
    
    if (!user) {
        // Если пользователь не авторизован, перенаправляем на логин
        return <Navigate to="/login" replace />;
    }
    
    // Если авторизован, показываем защищенный контент
    return <>{children}</>;
}
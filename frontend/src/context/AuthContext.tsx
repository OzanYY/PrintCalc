// contexts/AuthContext.tsx
import {
    createContext, useContext, useState,
    useEffect, useCallback, type ReactNode,
} from 'react';
import { Spinner } from '@/components/ui/spinner';
import { authAPI } from '@/api/auth';
import { performRefresh } from '@/api/axios'; // импортируем единую функцию рефреша
import { authRefreshBridge } from '@/utils/authRefreshBridge';

interface User {
    id: string;
    email: string;
    username?: string;
    role?: string;
}

export interface AuthStatusResponse {
    isAuth: boolean;
    user: User | null;
    hasRefreshToken: boolean;
}

interface AuthContextType {
    user: User | null;
    setUser: (user: User | null) => void;
    isLoading: boolean;
    checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser]           = useState<User | null>(null);

    const checkAuth = useCallback(async () => {
        try {
            const response = await authAPI.status();
            const data: AuthStatusResponse = response.data;

            if (data.isAuth) {
                setUser(data.user);
                return;
            }

            if (data.hasRefreshToken) {
                // Используем ту же функцию что и интерцептор —
                // если рефреш уже идёт, просто ждём его, не запускаем второй
                try {
                    await performRefresh();
                    // После рефреша authRefreshBridge.notify() уже вызван внутри performRefresh,
                    // но нам нужен user — делаем ещё один запрос status
                    const retryResponse = await authAPI.status();
                    setUser(retryResponse.data.user);
                } catch {
                    setUser(null);
                }
                return;
            }

            setUser(null);
        } catch {
            setUser(null);
        }
    }, []);

    useEffect(() => {
        checkAuth().finally(() => setIsLoading(false));
    }, [checkAuth]);

    useEffect(() => {
        authRefreshBridge.register(checkAuth);
        return () => authRefreshBridge.unregister();
    }, [checkAuth]);

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Spinner className="size-6" />
            </div>
        );
    }

    return (
        <AuthContext.Provider value={{ user, setUser, isLoading, checkAuth }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
}
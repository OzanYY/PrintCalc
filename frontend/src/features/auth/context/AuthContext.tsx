// src/features/auth/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { authAPI } from '@/api/auth';
import type { User } from '@/types';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            authAPI.getMe()
                .then(response => {
                    setUser(response.data.user);
                })
                .catch(() => {
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, setUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuthContext = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuthContext must be used within AuthProvider');
    }
    return context;
};
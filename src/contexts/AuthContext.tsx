import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '@/lib/api';
import type { User, LoginRequest, RegisterRequest } from '@/types/auth';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (data: LoginRequest) => Promise<void>;
    register: (data: RegisterRequest) => Promise<void>;
    googleLogin: (credential: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Check for existing token on mount
    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem('token');
            const savedUser = localStorage.getItem('user');

            if (token && savedUser) {
                try {
                    setUser(JSON.parse(savedUser));
                } catch (error) {
                    console.error('Error parsing saved user:', error);
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                }
            }
            setIsLoading(false);
        };

        initAuth();
    }, []);

    const login = async (data: LoginRequest) => {
        try {
            const response = await authAPI.login(data);

            // Save token and user data
            localStorage.setItem('token', response.token);
            localStorage.setItem('user', JSON.stringify({
                _id: response._id,
                name: response.name,
                email: response.email,
            }));

            setUser({
                _id: response._id,
                name: response.name,
                email: response.email,
            });
        } catch (error: any) {
            throw new Error(error.response?.data?.message || 'Login failed');
        }
    };

    const register = async (data: RegisterRequest) => {
        try {
            const response = await authAPI.register(data);

            // Save token and user data
            localStorage.setItem('token', response.token);
            localStorage.setItem('user', JSON.stringify({
                _id: response._id,
                name: response.name,
                email: response.email,
            }));

            setUser({
                _id: response._id,
                name: response.name,
                email: response.email,
            });
        } catch (error: any) {
            throw new Error(error.response?.data?.message || 'Registration failed');
        }
    };

    const googleLogin = async (credential: string) => {
        try {
            const response = await authAPI.googleLogin(credential);

            // Save token and user data
            localStorage.setItem('token', response.token);
            localStorage.setItem('user', JSON.stringify({
                _id: response._id,
                name: response.name,
                email: response.email,
                avatar: response.avatar,
            }));

            setUser({
                _id: response._id,
                name: response.name,
                email: response.email,
            });
        } catch (error: any) {
            throw new Error(error.response?.data?.message || 'Google login failed');
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                isLoading,
                login,
                register,
                googleLogin,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

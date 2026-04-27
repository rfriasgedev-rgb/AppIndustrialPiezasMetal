import { createContext, useContext, useState, useCallback } from 'react';
import API from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
    });

    const login = useCallback(async (email, pw) => {
        const { data } = await API.post('/auth/login', { email, pw });
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        return data.user;
    }, []);

    const logout = useCallback(async () => {
        try {
            await API.post('/auth/logout');
        } catch (e) {
            console.error('Logout error', e);
        }
        localStorage.removeItem('user');
        setUser(null);
    }, []);

    const hasRole = useCallback((...roles) => roles.includes(user?.role), [user]);

    return (
        <AuthContext.Provider value={{ user, login, logout, hasRole, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);

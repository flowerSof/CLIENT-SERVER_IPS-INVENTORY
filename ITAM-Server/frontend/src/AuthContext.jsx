import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import Login from './components/Login';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    // Estado de autenticación
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Verificar si hay token al cargar
    useEffect(() => {
        const token = localStorage.getItem('access_token');
        const username = localStorage.getItem('username');
        const fullName = localStorage.getItem('nombre_completo');

        if (token && username) {
            setUser({ username, nombre_completo: fullName });
        }
        setLoading(false);
    }, []);

    // Función de Login
    const login = (userData) => {
        setUser({
            username: userData.username,
            nombre_completo: userData.nombre_completo
        });
    };

    // Función de Logout
    const logout = useCallback(() => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('username');
        localStorage.removeItem('nombre_completo');
        setUser(null);
        window.location.href = '/'; // Forzar recarga limpia
    }, []);

    // --- MANEJO DE INACTIVIDAD (5 min) ---
    useEffect(() => {
        if (!user) return; // Solo monitorear si está logueado

        let inactivityTimer;
        const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutos

        const resetTimer = () => {
            if (inactivityTimer) clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(() => {
                console.log("Sesión expirada por inactividad");
                logout();
            }, TIMEOUT_MS);
        };

        // Eventos a monitorear
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];

        // Configurar listeners
        events.forEach(event => {
            document.addEventListener(event, resetTimer);
        });

        // Iniciar timer
        resetTimer();

        // Cleanup
        return () => {
            if (inactivityTimer) clearTimeout(inactivityTimer);
            events.forEach(event => {
                document.removeEventListener(event, resetTimer);
            });
        };
    }, [user, logout]);

    if (loading) {
        return <div style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#1E3A5F',
            color: 'white'
        }}>Cargando...</div>;
    }

    // Si no hay usuario, mostrar Login
    if (!user) {
        return <Login onLoginSuccess={login} />;
    }

    // Si hay usuario, mostrar app (children)
    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);

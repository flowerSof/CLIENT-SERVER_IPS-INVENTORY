import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_ENDPOINTS } from './config';
import Login from './components/Login';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    // Estado de autenticación
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Función de Logout (debe estar declarada antes del useEffect de interceptors)
    const logout = useCallback(() => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('username');
        localStorage.removeItem('nombre_completo');
        localStorage.removeItem('es_superadmin');
        localStorage.removeItem('permisos');
        setUser(null);
        window.location.href = '/'; // Forzar recarga limpia
    }, []);

    // Verificar si hay token al cargar
    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem('access_token');
            if (token) {
                try {
                    // Validar token real con el backend
                    const response = await axios.get(`${API_ENDPOINTS.AUTH}/me`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    // Asegurar que si el token es válido, seteamos el usuario con datos frescos de la BD
                    const username = localStorage.getItem('username') || response.data.username;
                    const fullName = localStorage.getItem('nombre_completo') || response.data.nombre_completo;
                    const esSuperadmin = response.data.es_superadmin;
                    const permisos = response.data.permisos || [];

                    setUser({
                        username,
                        nombre_completo: fullName,
                        es_superadmin: esSuperadmin,
                        permisos
                    });
                } catch (error) {
                    console.error("Sesión inválida o expirada", error);
                    localStorage.removeItem('access_token');
                }
            }
            setLoading(false);
        };
        initAuth();
    }, []);

    // Configurar axios interceptors globales para token y 401
    useEffect(() => {
        const reqInterceptor = axios.interceptors.request.use(config => {
            const token = localStorage.getItem('access_token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        });

        const resInterceptor = axios.interceptors.response.use(
            response => response,
            error => {
                if (error.response && error.response.status === 401) {
                    // Evitar loop infinito si ya estamos deslogeando
                    if (localStorage.getItem('access_token')) {
                        console.warn('Token rechazado por la API (401), cerrando sesión...');
                        logout();
                    }
                }
                return Promise.reject(error);
            }
        );

        return () => {
            axios.interceptors.request.eject(reqInterceptor);
            axios.interceptors.response.eject(resInterceptor);
        };
    }, [logout]);

    // Función de Login
    const login = (userData) => {
        // Guardar permisos en localStorage
        localStorage.setItem('es_superadmin', userData.es_superadmin ? 'true' : 'false');
        localStorage.setItem('permisos', JSON.stringify(userData.permisos || []));

        setUser({
            username: userData.username,
            nombre_completo: userData.nombre_completo,
            es_superadmin: userData.es_superadmin || false,
            permisos: userData.permisos || []
        });
    };

    // Helper para verificar si puede ver un edificio
    const canViewBuilding = useCallback((edificioId) => {
        if (!user) return false;
        if (user.es_superadmin) return true;

        return user.permisos.some(p =>
            p.edificio_id === edificioId
        );
    }, [user]);

    // Helper para verificar si puede ver un piso específico
    const canViewFloor = useCallback((edificioId, pisoId) => {
        if (!user) return false;
        if (user.es_superadmin) return true;

        return user.permisos.some(p =>
            p.edificio_id === edificioId &&
            (p.piso_id === null || p.piso_id === pisoId)
        );
    }, [user]);

    // Helper para filtrar edificios según permisos
    const filterBuildingsByPermission = useCallback((edificios) => {
        if (!user) return [];
        if (user.es_superadmin) return edificios;

        const allowedEdificioIds = [...new Set(user.permisos.map(p => p.edificio_id))];
        return edificios.filter(e => allowedEdificioIds.includes(e.id));
    }, [user]);

    // Helper para filtrar pisos según permisos
    const filterFloorsByPermission = useCallback((pisos, edificioId = null) => {
        if (!user) return [];
        if (user.es_superadmin) return pisos;

        return pisos.filter(piso => {
            const targetEdificioId = edificioId || piso.edificio_id;
            return user.permisos.some(p =>
                p.edificio_id === targetEdificioId &&
                (p.piso_id === null || p.piso_id === piso.id)
            );
        });
    }, [user]);

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
        <AuthContext.Provider value={{
            user,
            login,
            logout,
            canViewBuilding,
            canViewFloor,
            filterBuildingsByPermission,
            filterFloorsByPermission
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);


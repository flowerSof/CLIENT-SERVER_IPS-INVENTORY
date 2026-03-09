import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, User, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { API_ENDPOINTS } from '../config';

export default function Login({ onLoginSuccess }) {
    const [credentials, setCredentials] = useState({
        username: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await axios.post(`${API_ENDPOINTS.AUTH}/login`, credentials);

            // Guardar token en localStorage
            localStorage.setItem('access_token', response.data.access_token);
            localStorage.setItem('username', response.data.username);
            localStorage.setItem('nombre_completo', response.data.nombre_completo || '');

            // Llamar callback de éxito
            if (onLoginSuccess) {
                onLoginSuccess(response.data);
            }
        } catch (err) {
            console.error('Login error:', err);
            setError(err.response?.data?.detail || 'Error al iniciar sesión. Verifique sus credenciales.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex',
            flexWrap: 'wrap-reverse',
            minHeight: '100vh',
            backgroundColor: '#F9FAFB'
        }}>
            {/* LADO IZQUIERDO: Imagen con Filtro */}
            <div style={{
                flex: '1 1 50%',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                minHeight: '400px'
            }}>
                {/* 1. Capa de Filtro de Color (gradiente actual con opacidad) */}
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'linear-gradient(135deg, rgba(30, 58, 95, 0.85) 0%, rgba(185, 28, 28, 0.85) 100%)',
                    zIndex: 1
                }}></div>

                {/* 2. Imagen de fondo */}
                <img
                    src="/login-bg.jpg"
                    alt="Fondo ITAM"
                    style={{
                        position: 'absolute',
                        top: 0, left: 0,
                        width: '100%', height: '100%',
                        objectFit: 'cover',
                        zIndex: 0
                    }}
                />

                {/* 3. Contenido Textual sobre la imagen (opcional) */}
                <div style={{
                    position: 'relative',
                    zIndex: 2,
                    padding: '4rem',
                    color: 'white',
                }}>
                    <h1 style={{ fontSize: '3.5rem', fontWeight: 'bold', marginBottom: '1rem', textShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>
                        ITAM PLATFORM
                    </h1>
                    <p style={{ fontSize: '1.25rem', opacity: 0.9, lineHeight: '1.6', maxWidth: '500px', textShadow: '0 2px 5px rgba(0,0,0,0.3)' }}>
                        Sistema inteligente de Gestión de Activos de TI para automatización e inventario del Poder Judicial del Perú.
                    </p>
                </div>
            </div>

            {/* LADO DERECHO: Formulario y Acceso */}
            <div style={{
                flex: '1 1 450px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem',
                background: '#ffffff'
            }}>
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    style={{
                        background: 'white',
                        borderRadius: '16px',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                        maxWidth: '450px',
                        width: '100%',
                        overflow: 'hidden',
                        border: '1px solid #F3F4F6'
                    }}
                >
                    {/* Header */}
                    <div style={{
                        background: 'linear-gradient(135deg, #1E3A5F 0%, #2C5282 100%)',
                        padding: '3rem 2rem',
                        textAlign: 'center',
                        color: 'white'
                    }}>
                        <div style={{
                            width: '80px',
                            height: '80px',
                            background: 'white',
                            borderRadius: '50%',
                            margin: '0 auto 1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                        }}>
                            <img
                                src="/logo-poder-judicial.png"
                                alt="Poder Judicial"
                                style={{ width: '60px', height: '60px', objectFit: 'contain' }}
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                }}
                            />
                            <div style={{
                                display: 'none',
                                width: '60px',
                                height: '60px',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.5rem',
                                fontWeight: 'bold',
                                color: '#1E3A5F'
                            }}>
                                PJ
                            </div>
                        </div>
                        <h1 style={{
                            margin: 0,
                            fontSize: '1.75rem',
                            fontWeight: '700',
                            marginBottom: '0.5rem'
                        }}>
                            Acceso Autorizado
                        </h1>
                        <p style={{
                            margin: 0,
                            fontSize: '0.875rem',
                            opacity: 0.9,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>
                            Identifíquese en la red
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} style={{ padding: '2.5rem 2rem' }}>
                        <h2 style={{
                            margin: '0 0 1.5rem 0',
                            fontSize: '1.25rem',
                            fontWeight: '600',
                            color: '#111827',
                            textAlign: 'center'
                        }}>
                            Iniciar Sesión
                        </h2>

                        {/* Error Message */}
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={{
                                    background: '#FEE2E2',
                                    border: '1px solid #FCA5A5',
                                    borderRadius: '8px',
                                    padding: '0.75rem 1rem',
                                    marginBottom: '1.5rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem'
                                }}
                            >
                                <AlertCircle size={20} color="#DC2626" />
                                <span style={{ fontSize: '0.875rem', color: '#991B1B' }}>{error}</span>
                            </motion.div>
                        )}

                        {/* Username Field */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{
                                display: 'block',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: '#374151',
                                marginBottom: '0.5rem'
                            }}>
                                Usuario
                            </label>
                            <div style={{ position: 'relative' }}>
                                <User
                                    size={20}
                                    style={{
                                        position: 'absolute',
                                        left: '1rem',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: '#9CA3AF'
                                    }}
                                />
                                <input
                                    type="text"
                                    value={credentials.username}
                                    onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                                    placeholder=".localadminpj"
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem 1rem 0.75rem 3rem',
                                        border: '2px solid #E5E7EB',
                                        borderRadius: '8px',
                                        fontSize: '0.875rem',
                                        transition: 'all 0.2s',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = '#B91C1C'}
                                    onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div style={{ marginBottom: '2rem' }}>
                            <label style={{
                                display: 'block',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: '#374151',
                                marginBottom: '0.5rem'
                            }}>
                                Contraseña
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Lock
                                    size={20}
                                    style={{
                                        position: 'absolute',
                                        left: '1rem',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: '#9CA3AF'
                                    }}
                                />
                                <input
                                    type="password"
                                    value={credentials.password}
                                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                                    placeholder="••••••••••"
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem 1rem 0.75rem 3rem',
                                        border: '2px solid #E5E7EB',
                                        borderRadius: '8px',
                                        fontSize: '0.875rem',
                                        transition: 'all 0.2s',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = '#B91C1C'}
                                    onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '0.875rem',
                                background: loading ? '#9CA3AF' : '#1E3A5F',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}
                            onMouseEnter={(e) => !loading && (e.target.style.background = '#2C5282')}
                            onMouseLeave={(e) => !loading && (e.target.style.background = '#1E3A5F')}
                        >
                            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                        </button>
                    </form>

                    {/* Footer */}
                    <div style={{
                        padding: '1.5rem 2rem',
                        background: '#F9FAFB',
                        borderTop: '1px solid #E5E7EB',
                        textAlign: 'center'
                    }}>
                        <p style={{
                            margin: 0,
                            fontSize: '0.75rem',
                            color: '#6B7280'
                        }}>
                            © 2026 Poder Judicial del Perú<br />
                            Gerencia de Informática
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

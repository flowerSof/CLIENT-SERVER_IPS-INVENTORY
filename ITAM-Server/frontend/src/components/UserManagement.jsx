import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, UserPlus, Edit, Trash2, X, Save,
    Shield, ShieldCheck, Building2, Layers,
    Eye, EyeOff, Check, AlertCircle
} from 'lucide-react';
import axios from 'axios';

import { API_ENDPOINTS } from '../config';

export default function UserManagement() {
    const [users, setUsers] = useState([]);
    const [edificios, setEdificios] = useState([]);
    const [pisos, setPisos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [formData, setFormData] = useState({
        username: '',
        password: '',
        nombre_completo: '',
        email: '',
        es_activo: true,
        es_superadmin: false,
        permisos: []
    });

    const getAuthHeaders = () => ({
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [usersRes, edificiosRes, pisosRes] = await Promise.all([
                axios.get(API_ENDPOINTS.USERS, getAuthHeaders()),
                axios.get(API_ENDPOINTS.BUILDINGS),
                axios.get(API_ENDPOINTS.FLOORS)
            ]);
            setUsers(usersRes.data);
            setEdificios(edificiosRes.data);
            setPisos(pisosRes.data);
        } catch (err) {
            setError('Error al cargar datos: ' + (err.response?.data?.detail || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            if (editingUser) {
                // Actualizar usuario
                await axios.put(
                    `${API_ENDPOINTS.USERS}/${editingUser.id}`,
                    {
                        email: formData.email,
                        nombre_completo: formData.nombre_completo,
                        es_activo: formData.es_activo,
                        password: formData.password || undefined
                    },
                    getAuthHeaders()
                );

                // Actualizar permisos
                if (!formData.es_superadmin) {
                    await axios.put(
                        `${API_ENDPOINTS.USERS}/${editingUser.id}/permisos`,
                        { permisos: formData.permisos },
                        getAuthHeaders()
                    );
                }

                setSuccess('Usuario actualizado correctamente');
            } else {
                // Crear usuario
                await axios.post(
                    API_ENDPOINTS.USERS,
                    formData,
                    getAuthHeaders()
                );
                setSuccess('Usuario creado correctamente');
            }

            loadData();
            setTimeout(() => {
                setShowModal(false);
                resetForm();
            }, 1500);
        } catch (err) {
            setError(err.response?.data?.detail || 'Error al guardar usuario');
        }
    };

    const handleEdit = async (user) => {
        try {
            const response = await axios.get(
                `${API_ENDPOINTS.USERS}/${user.id}`,
                getAuthHeaders()
            );
            const userData = response.data;

            setEditingUser(userData);
            setFormData({
                username: userData.username,
                password: '',
                nombre_completo: userData.nombre_completo || '',
                email: userData.email || '',
                es_activo: userData.es_activo,
                es_superadmin: userData.es_superadmin,
                permisos: userData.permisos.map(p => ({
                    edificio_id: p.edificio_id,
                    piso_id: p.piso_id
                }))
            });
            setShowModal(true);
        } catch (err) {
            setError('Error al cargar usuario: ' + err.message);
        }
    };

    const handleDelete = async (userId) => {
        if (!window.confirm('¿Está seguro de eliminar este usuario?')) return;

        try {
            await axios.delete(`${API_ENDPOINTS.USERS}/${userId}`, getAuthHeaders());
            setSuccess('Usuario eliminado');
            loadData();
        } catch (err) {
            setError(err.response?.data?.detail || 'Error al eliminar usuario');
        }
    };

    const resetForm = () => {
        setFormData({
            username: '',
            password: '',
            nombre_completo: '',
            email: '',
            es_activo: true,
            es_superadmin: false,
            permisos: []
        });
        setEditingUser(null);
        setError('');
        setSuccess('');
    };

    const togglePermiso = (edificioId, pisoId = null) => {
        setFormData(prev => {
            const permisos = [...prev.permisos];
            const existingIndex = permisos.findIndex(
                p => p.edificio_id === edificioId && p.piso_id === pisoId
            );

            if (existingIndex >= 0) {
                permisos.splice(existingIndex, 1);
            } else {
                // Si seleccionamos un piso específico, asegurarnos de no tener el edificio completo
                if (pisoId !== null) {
                    const edificioCompleto = permisos.findIndex(
                        p => p.edificio_id === edificioId && p.piso_id === null
                    );
                    if (edificioCompleto >= 0) {
                        permisos.splice(edificioCompleto, 1);
                    }
                } else {
                    // Si seleccionamos edificio completo, quitar pisos individuales
                    const pisosDelEdificio = permisos.filter(
                        p => p.edificio_id === edificioId && p.piso_id !== null
                    );
                    pisosDelEdificio.forEach(piso => {
                        const idx = permisos.findIndex(
                            p => p.edificio_id === piso.edificio_id && p.piso_id === piso.piso_id
                        );
                        if (idx >= 0) permisos.splice(idx, 1);
                    });
                }
                permisos.push({ edificio_id: edificioId, piso_id: pisoId });
            }

            return { ...prev, permisos };
        });
    };

    const hasPermiso = (edificioId, pisoId = null) => {
        return formData.permisos.some(
            p => p.edificio_id === edificioId && p.piso_id === pisoId
        );
    };

    const hasEdificioCompleto = (edificioId) => {
        return formData.permisos.some(
            p => p.edificio_id === edificioId && p.piso_id === null
        );
    };

    const getPisosEdificio = (edificioId) => {
        return pisos.filter(p => p.edificio_id === edificioId);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-700"></div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-red-700 to-red-900 rounded-xl shadow-lg">
                        <Users className="text-white" size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Gestión de Usuarios</h1>
                        <p className="text-sm text-gray-500">Administra usuarios y sus permisos de acceso</p>
                    </div>
                </div>

                <button
                    onClick={() => { resetForm(); setShowModal(true); }}
                    className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-red-700 to-red-800 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all font-medium"
                >
                    <UserPlus size={20} />
                    Nuevo Usuario
                </button>
            </div>

            {/* Mensajes */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2"
                    >
                        <AlertCircle size={20} />
                        {error}
                    </motion.div>
                )}
                {success && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 flex items-center gap-2"
                    >
                        <Check size={20} />
                        {success}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Tabla de Usuarios */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gradient-to-r from-slate-800 to-slate-900 text-white">
                        <tr>
                            <th className="px-6 py-4 text-left text-sm font-semibold">Usuario</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold">Nombre</th>
                            <th className="px-6 py-4 text-center text-sm font-semibold">Rol</th>
                            <th className="px-6 py-4 text-center text-sm font-semibold">Permisos</th>
                            <th className="px-6 py-4 text-center text-sm font-semibold">Estado</th>
                            <th className="px-6 py-4 text-center text-sm font-semibold">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {users.map((user, idx) => (
                            <motion.tr
                                key={user.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="hover:bg-gray-50 transition-colors"
                            >
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${user.es_superadmin
                                            ? 'bg-gradient-to-br from-amber-500 to-amber-700'
                                            : 'bg-gradient-to-br from-slate-600 to-slate-800'
                                            }`}>
                                            {user.username.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="font-medium text-slate-800">{user.username}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-gray-600">
                                    {user.nombre_completo || '-'}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    {user.es_superadmin ? (
                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
                                            <ShieldCheck size={14} />
                                            Super Admin
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold">
                                            <Shield size={14} />
                                            Administrador
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    {user.es_superadmin ? (
                                        <span className="text-amber-600 font-medium">Acceso Total</span>
                                    ) : (
                                        <span className="text-gray-600">{user.permisos_count} permisos</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    {user.es_activo ? (
                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-800 text-xs font-semibold">
                                            <Eye size={14} />
                                            Activo
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold">
                                            <EyeOff size={14} />
                                            Inactivo
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-center gap-2">
                                        <button
                                            onClick={() => handleEdit(user)}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Editar"
                                        >
                                            <Edit size={18} />
                                        </button>
                                        {!user.es_superadmin && (
                                            <button
                                                onClick={() => handleDelete(user.id)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Eliminar"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal Crear/Editar */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                        onClick={() => setShowModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-t-2xl">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    {editingUser ? <Edit size={24} /> : <UserPlus size={24} />}
                                    {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
                                </h2>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                                {/* Datos básicos */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Username
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.username}
                                            onChange={e => setFormData({ ...formData, username: e.target.value })}
                                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
                                            placeholder="usuario"
                                            required
                                            disabled={!!editingUser}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Contraseña {editingUser && '(dejar vacío para mantener)'}
                                        </label>
                                        <input
                                            type="password"
                                            value={formData.password}
                                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
                                            placeholder="••••••••"
                                            required={!editingUser}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Nombre Completo
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.nombre_completo}
                                            onChange={e => setFormData({ ...formData, nombre_completo: e.target.value })}
                                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
                                            placeholder="Juan Pérez"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
                                            placeholder="correo@ejemplo.com"
                                        />
                                    </div>
                                </div>

                                {/* Switches */}
                                <div className="flex items-center gap-6">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.es_activo}
                                            onChange={e => setFormData({ ...formData, es_activo: e.target.checked })}
                                            className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500"
                                        />
                                        <span className="font-medium text-gray-700">Usuario Activo</span>
                                    </label>

                                    {!editingUser && (
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.es_superadmin}
                                                onChange={e => setFormData({ ...formData, es_superadmin: e.target.checked })}
                                                className="w-5 h-5 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                                            />
                                            <span className="font-medium text-gray-700">Super Administrador</span>
                                        </label>
                                    )}
                                </div>

                                {/* Selector de Permisos */}
                                {!formData.es_superadmin && !editingUser?.es_superadmin && (
                                    <div className="border-t pt-6">
                                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                            <Building2 size={20} className="text-red-700" />
                                            Permisos de Acceso
                                        </h3>
                                        <p className="text-sm text-gray-500 mb-4">
                                            Selecciona los edificios y pisos que este usuario podrá ver
                                        </p>

                                        <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
                                            {edificios.map(edificio => (
                                                <div key={edificio.id} className="border rounded-xl p-4 bg-gray-50">
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => togglePermiso(edificio.id, null)}
                                                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${hasEdificioCompleto(edificio.id)
                                                                ? 'bg-red-700 text-white'
                                                                : 'bg-white border-2 border-gray-200 hover:border-red-300'
                                                                }`}
                                                        >
                                                            <Building2 size={16} />
                                                            {edificio.nombre}
                                                            {hasEdificioCompleto(edificio.id) && (
                                                                <span className="text-xs bg-white/20 px-2 py-0.5 rounded">
                                                                    Completo
                                                                </span>
                                                            )}
                                                        </button>
                                                    </div>

                                                    {!hasEdificioCompleto(edificio.id) && (
                                                        <div className="flex flex-wrap gap-2 ml-4">
                                                            {getPisosEdificio(edificio.id).map(piso => (
                                                                <button
                                                                    key={piso.id}
                                                                    type="button"
                                                                    onClick={() => togglePermiso(edificio.id, piso.id)}
                                                                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-all ${hasPermiso(edificio.id, piso.id)
                                                                        ? 'bg-blue-600 text-white'
                                                                        : 'bg-white border border-gray-200 hover:border-blue-300'
                                                                        }`}
                                                                >
                                                                    <Layers size={14} />
                                                                    {piso.nombre}
                                                                </button>
                                                            ))}
                                                            {getPisosEdificio(edificio.id).length === 0 && (
                                                                <span className="text-sm text-gray-400 italic">
                                                                    Sin pisos registrados
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {formData.es_superadmin && (
                                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                                        <p className="text-amber-800 flex items-center gap-2">
                                            <ShieldCheck size={20} />
                                            Los superadministradores tienen acceso completo a todo el sistema
                                        </p>
                                    </div>
                                )}

                                {/* Botones */}
                                <div className="flex gap-4 pt-4 border-t">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 px-6 py-3 border-2 border-gray-200 rounded-xl hover:bg-gray-50 font-medium transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-6 py-3 bg-gradient-to-r from-red-700 to-red-800 text-white rounded-xl hover:shadow-lg font-medium transition-all flex items-center justify-center gap-2"
                                    >
                                        <Save size={20} />
                                        {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

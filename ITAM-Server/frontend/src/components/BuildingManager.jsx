import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Building2, Plus, Edit, Trash2, MapPin, Sparkles, Star } from 'lucide-react';
import axios from 'axios';
import { API_ENDPOINTS } from '../config';

export default function BuildingManager({ isOpen, onClose, onBuildingSelected, embedded = false }) {
    const [edificios, setEdificios] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingBuilding, setEditingBuilding] = useState(null);

    const [formData, setFormData] = useState({
        nombre: '',
        ciudad: ''
    });

    const API_URL = API_ENDPOINTS.BUILDINGS;

    useEffect(() => {
        if (isOpen) {
            loadBuildings();
        }
    }, [isOpen]);

    const loadBuildings = async () => {
        try {
            const response = await axios.get(API_URL);
            setEdificios(response.data);
        } catch (error) {
            console.error('Error loading buildings:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (editingBuilding) {
                await axios.put(`${API_URL}/${editingBuilding.id}`, formData);
            } else {
                await axios.post(API_URL, formData);
            }

            loadBuildings();
            resetForm();
        } catch (error) {
            console.error('Error saving building:', error);
            alert('Error al guardar el edificio: ' + (error.response?.data?.detail || error.message));
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (edificioId) => {
        if (!confirm('¿Estás seguro de eliminar este edificio?')) return;

        try {
            await axios.delete(`${API_URL}/${edificioId}`);
            loadBuildings();
        } catch (error) {
            alert('Error al eliminar: ' + (error.response?.data?.detail || error.message));
        }
    };

    const handleEdit = (edificio) => {
        setEditingBuilding(edificio);
        setFormData({
            nombre: edificio.nombre,
            ciudad: edificio.ciudad || ''
        });
    };

    const resetForm = () => {
        setFormData({
            nombre: '',
            ciudad: ''
        });
        setEditingBuilding(null);
    };

    const handleSelectBuilding = (edificio) => {
        if (onBuildingSelected) {
            onBuildingSelected(edificio);
        }
        onClose();
    };

    if (!isOpen) return null;

    const content = (
        <div className={`bg-white rounded-3xl shadow-2xl w-full h-full overflow-hidden flex flex-col ${embedded ? '' : 'max-w-4xl max-h-[90vh]'}`} onClick={(e) => e.stopPropagation()}>
            {/* Header - Only show if NOT embedded, or show simplified */}
            {!embedded && (
                <div className="relative p-8 bg-gradient-to-br from-primary-blue via-primary-purple to-primary-blue text-white overflow-hidden shrink-0">
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full blur-3xl"></div>
                        <div className="absolute bottom-0 right-0 w-60 h-60 bg-white rounded-full blur-3xl"></div>
                    </div>
                    <div className="relative flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                <Building2 size={28} />
                            </div>
                            <div>
                                <h2 className="text-3xl font-bold">Gestión de Edificios</h2>
                                <p className="text-white/80 mt-1">Administra tus edificios e instalaciones</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-3 hover:bg-white/20 rounded-xl transition-all backdrop-blur-sm"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>
            )}

            <div className="p-8 overflow-y-auto flex-1">
                {/* Form */}
                <form onSubmit={handleSubmit} className="mb-8 bg-gradient-to-br from-gray-50 to-white p-8 rounded-2xl border-2 border-gray-100 shadow-lg" style={{ marginTop: embedded ? '1rem' : 0 }}>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-blue to-primary-purple flex items-center justify-center">
                            <Plus size={20} className="text-white" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900">
                            {editingBuilding ? 'Editar Edificio' : 'Nuevo Edificio'}
                        </h3>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">🏢 Nombre del Edificio</label>
                            <input
                                type="text"
                                value={formData.nombre}
                                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-blue/20 focus:border-primary-blue transition-all shadow-sm"
                                placeholder="Ej: Edificio Principal"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">📍 Ciudad</label>
                            <input
                                type="text"
                                value={formData.ciudad}
                                onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-blue/20 focus:border-primary-blue transition-all shadow-sm"
                                placeholder="Ej: Lima"
                            />
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-6 py-4 bg-gradient-to-r from-primary-blue to-primary-purple text-white rounded-xl hover:shadow-2xl hover:scale-105 transition-all font-bold text-lg disabled:opacity-50"
                        >
                            {loading ? '⏳ Guardando...' : (editingBuilding ? '✨ Actualizar' : '🚀 Crear Edificio')}
                        </button>

                        {editingBuilding && (
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-8 py-4 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all font-semibold"
                            >
                                Cancelar
                            </button>
                        )}
                    </div>
                </form>

                {/* Building List */}
                <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                        <Star className="text-primary-blue" size={28} />
                        Edificios Existentes
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {edificios.map((edificio) => (
                            <motion.div
                                key={edificio.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                whileHover={{ scale: 1.02, y: -4 }}
                                className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-2xl border-2 border-gray-100 hover:border-primary-blue/30 hover:shadow-xl transition-all cursor-pointer"
                                onClick={() => handleSelectBuilding(edificio)}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-start gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-blue/10 to-primary-purple/10 flex items-center justify-center">
                                            <Building2 size={24} className="text-primary-blue" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-xl text-gray-900 mb-1">{edificio.nombre}</h4>
                                            {edificio.ciudad && (
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <MapPin size={14} />
                                                    <span>{edificio.ciudad}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={() => handleEdit(edificio)}
                                            className="p-2 hover:bg-primary-blue/10 rounded-lg transition-colors group"
                                            title="Editar"
                                        >
                                            <Edit size={18} className="text-primary-blue group-hover:scale-110 transition-transform" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(edificio.id)}
                                            className="p-2 hover:bg-red-100 rounded-lg transition-colors group"
                                            title="Eliminar"
                                        >
                                            <Trash2 size={18} className="text-red-600 group-hover:scale-110 transition-transform" />
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-gray-200">
                                    <p className="text-xs text-gray-500 text-center">Click para ver pisos →</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {edificios.length === 0 && (
                        <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-white rounded-2xl border-2 border-dashed border-gray-200">
                            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                <Building2 size={36} className="text-gray-400" />
                            </div>
                            <p className="text-lg font-semibold text-gray-900 mb-2">No hay edificios registrados</p>
                            <p className="text-sm text-gray-500">Crea tu primer edificio para comenzar</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    if (embedded) return content;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    transition={{ type: "spring", duration: 0.5 }}
                    className="contents" // Use contents to pass through layout
                >
                    {content}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

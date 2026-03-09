import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Edit, Trash2, MapPin, Building2, Map } from 'lucide-react';
import axios from 'axios';
import { API_ENDPOINTS } from '../config';

export default function AreaManager({ isOpen, onClose }) {
    const [areas, setAreas] = useState([]);
    const [pisos, setPisos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingArea, setEditingArea] = useState(null);

    const [formData, setFormData] = useState({
        nombre: '',
        piso_id: '',
        coordenadas_json: ''
    });

    const API_AREAS = API_ENDPOINTS.AREAS;
    const API_FLOORS = API_ENDPOINTS.FLOORS;

    useEffect(() => {
        if (isOpen) {
            loadData();
        }
    }, [isOpen]);

    const loadData = async () => {
        try {
            const [pisosRes, areasRes] = await Promise.all([
                axios.get(API_FLOORS),
                axios.get(API_AREAS)
            ]);
            setPisos(pisosRes.data);
            setAreas(areasRes.data);

            if (pisosRes.data.length > 0 && !formData.piso_id) {
                setFormData(prev => ({ ...prev, piso_id: pisosRes.data[0].id }));
            }
        } catch (error) {
            console.error('Error loading data:', error);
        }
    };

    const loadAreas = async () => {
        try {
            const response = await axios.get(API_AREAS);
            setAreas(response.data);
        } catch (error) {
            console.error('Error loading areas:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (editingArea) {
                await axios.put(`${API_AREAS}/${editingArea.id}`, formData);
            } else {
                await axios.post(API_AREAS, formData);
            }

            loadAreas();
            resetForm();
        } catch (error) {
            console.error('Error saving area:', error);
            alert('Error al guardar el área: ' + (error.response?.data?.detail || error.message));
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (areaId) => {
        if (!confirm('¿Estás seguro de eliminar esta área?')) return;

        try {
            await axios.delete(`${API_AREAS}/${areaId}`);
            loadAreas();
        } catch (error) {
            alert('Error al eliminar: ' + (error.response?.data?.detail || error.message));
        }
    };

    const handleEdit = (area) => {
        setEditingArea(area);
        setFormData({
            nombre: area.nombre,
            piso_id: area.piso_id,
            coordenadas_json: area.coordenadas_json || ''
        });
    };

    const resetForm = () => {
        setFormData(prev => ({
            nombre: '',
            piso_id: prev.piso_id,
            coordenadas_json: ''
        }));
        setEditingArea(null);
    };

    if (!isOpen) return null;

    // Helper para obtener nombre del piso
    const getPisoNombre = (id) => pisos.find(p => p.id === id)?.nombre || 'Desconocido';

    return (
        <div className="p-8 h-full flex flex-col">
            {/* Form */}
            <form onSubmit={handleSubmit} className="mb-8 bg-gradient-to-br from-gray-50 to-white p-6 rounded-2xl border-2 border-gray-100 shadow-md">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-blue to-primary-purple flex items-center justify-center">
                        <Plus size={20} className="text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">
                        {editingArea ? 'Editar Área' : 'Nueva Área'}
                    </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">🏢 Piso</label>
                        <select
                            value={formData.piso_id}
                            onChange={(e) => setFormData({ ...formData, piso_id: parseInt(e.target.value) })}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-blue/20 focus:border-primary-blue transition-all bg-white shadow-sm"
                            required
                        >
                            {pisos.map(piso => (
                                <option key={piso.id} value={piso.id}>{piso.nombre} (Nivel {piso.nivel})</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">📍 Nombre del Área</label>
                        <input
                            type="text"
                            value={formData.nombre}
                            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-blue/20 focus:border-primary-blue transition-all shadow-sm"
                            placeholder="Ej: Recursos Humanos"
                            required
                        />
                    </div>
                </div>

                <div className="flex gap-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-primary-blue to-primary-purple text-white rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all font-bold disabled:opacity-50"
                    >
                        {loading ? '⏳ Guardando...' : (editingArea ? '✨ Actualizar' : '🚀 Crear Área')}
                    </button>

                    {editingArea && (
                        <button
                            type="button"
                            onClick={resetForm}
                            className="px-6 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all font-semibold"
                        >
                            Cancelar
                        </button>
                    )}
                </div>
            </form>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Map className="text-primary-blue" size={24} />
                    Áreas Registradas
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {areas.map((area) => (
                        <motion.div
                            key={area.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white p-4 rounded-xl border border-gray-200 hover:border-primary-blue/30 hover:shadow-md transition-all"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-bold text-gray-900">{area.nombre}</h4>
                                    <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                                        <Building2 size={12} />
                                        <span>{getPisoNombre(area.piso_id)}</span>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => handleEdit(area)}
                                        className="p-1.5 hover:bg-primary-blue/10 rounded-lg text-primary-blue transition-colors"
                                    >
                                        <Edit size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(area.id)}
                                        className="p-1.5 hover:bg-red-100 rounded-lg text-red-600 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {areas.length === 0 && (
                    <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        No hay áreas registradas
                    </div>
                )}
            </div>
        </div>
    );
}

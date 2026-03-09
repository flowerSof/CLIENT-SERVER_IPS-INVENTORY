import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Image as ImageIcon, Plus, Trash2, Edit, Building2, Sparkles } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { API_ENDPOINTS } from '../config';

export default function FloorManager({ isOpen, onClose, onFloorCreated, embedded = false }) {
    const [pisos, setPisos] = useState([]);
    const [edificios, setEdificios] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingFloor, setEditingFloor] = useState(null);

    const [formData, setFormData] = useState({
        nombre: '',
        nivel: 1,
        edificio_id: '',
        mapa_imagen: null,
        mapa_filename: null
    });

    const API_URL = API_ENDPOINTS.FLOORS;
    const API_BUILDINGS = API_ENDPOINTS.BUILDINGS;

    useEffect(() => {
        if (isOpen) {
            loadFloors();
            loadBuildings();
        }
    }, [isOpen]);

    const loadFloors = async () => {
        try {
            const response = await axios.get(API_URL);
            setPisos(response.data);
        } catch (error) {
            console.error('Error loading floors:', error);
        }
    };

    const loadBuildings = async () => {
        try {
            const response = await axios.get(API_BUILDINGS);
            setEdificios(response.data);
            if (response.data.length > 0 && !formData.edificio_id) {
                setFormData(prev => ({ ...prev, edificio_id: response.data[0].id }));
            }
        } catch (error) {
            console.error('Error loading buildings:', error);
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        accept: {
            'image/*': ['.png', '.jpg', '.jpeg', '.gif']
        },
        maxFiles: 1,
        onDrop: (acceptedFiles) => {
            const file = acceptedFiles[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = () => {
                    setFormData(prev => ({
                        ...prev,
                        mapa_imagen: reader.result,
                        mapa_filename: file.name
                    }));
                };
                reader.readAsDataURL(file);
            }
        }
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (editingFloor) {
                await axios.put(`${API_URL}/${editingFloor.id}`, formData);
            } else {
                await axios.post(API_URL, formData);
            }

            loadFloors();
            resetForm();
            if (onFloorCreated) onFloorCreated();
        } catch (error) {
            console.error('Error saving floor:', error);
            alert('Error al guardar el piso: ' + (error.response?.data?.detail || error.message));
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (pisoId) => {
        if (!confirm('¿Estás seguro de eliminar este piso?')) return;

        try {
            await axios.delete(`${API_URL}/${pisoId}`);
            loadFloors();
            if (onFloorCreated) onFloorCreated();
        } catch (error) {
            alert('Error al eliminar: ' + (error.response?.data?.detail || error.message));
        }
    };

    const handleEdit = (piso) => {
        setEditingFloor(piso);
        setFormData({
            nombre: piso.nombre,
            nivel: piso.nivel,
            edificio_id: piso.edificio_id,
            mapa_imagen: null,
            mapa_filename: piso.mapa_filename
        });
    };

    const resetForm = () => {
        setFormData({
            nombre: '',
            nivel: 1,
            edificio_id: edificios.length > 0 ? edificios[0].id : '',
            mapa_imagen: null,
            mapa_filename: null
        });
        setEditingFloor(null);
    };

    if (!isOpen) return null;

    if (!isOpen) return null;

    const content = (
        <div className={`bg-white rounded-3xl shadow-2xl w-full h-full overflow-hidden flex flex-col ${embedded ? '' : 'max-w-5xl max-h-[90vh]'}`} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            {!embedded && (
                <div className="relative p-8 bg-gradient-to-br from-primary-blue via-primary-purple to-primary-blue text-white overflow-hidden shrink-0">
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full blur-3xl"></div>
                        <div className="absolute bottom-0 right-0 w-60 h-60 bg-white rounded-full blur-3xl"></div>
                    </div>
                    <div className="relative flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                <Sparkles size={28} />
                            </div>
                            <div>
                                <h2 className="text-3xl font-bold">Gestión de Pisos</h2>
                                <p className="text-white/80 mt-1">Administra los pisos de tus edificios</p>
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
                            {editingFloor ? 'Editar Piso' : 'Nuevo Piso'}
                        </h3>
                    </div>

                    <div className="grid grid-cols-3 gap-6 mb-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">🏢 Edificio</label>
                            <select
                                value={formData.edificio_id}
                                onChange={(e) => setFormData({ ...formData, edificio_id: parseInt(e.target.value) })}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-blue/20 focus:border-primary-blue transition-all bg-white shadow-sm"
                                required
                            >
                                <option value="">Seleccionar...</option>
                                {edificios.map(ed => (
                                    <option key={ed.id} value={ed.id}>{ed.nombre}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">📝 Nombre</label>
                            <input
                                type="text"
                                value={formData.nombre}
                                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-blue/20 focus:border-primary-blue transition-all shadow-sm"
                                placeholder="Ej: Administración"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">🔢 Nivel</label>
                            <input
                                type="number"
                                value={formData.nivel}
                                onChange={(e) => setFormData({ ...formData, nivel: parseInt(e.target.value) })}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-blue/20 focus:border-primary-blue transition-all shadow-sm"
                                required
                            />
                        </div>
                    </div>

                    {/* Image Upload - BEAUTIFUL DRAG DROP */}
                    <div className="mb-6">
                        <label className="block text-sm font-bold text-gray-700 mb-3">🖼️ Plano del Piso</label>
                        <div
                            {...getRootProps()}
                            className={`
                                relative border-3 border-dashed rounded-2xl p-12 text-center cursor-pointer 
                                transition-all duration-300 overflow-hidden group
                                ${isDragActive
                                    ? 'border-primary-blue bg-gradient-to-br from-primary-blue/5 to-primary-purple/5 scale-105'
                                    : 'border-gray-300 hover:border-primary-blue/50 bg-gradient-to-br from-gray-50 to-white hover:shadow-xl'
                                }
                            `}
                        >
                            {/* Animated Background */}
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="absolute top-0 left-0 w-32 h-32 bg-primary-blue/10 rounded-full blur-3xl animate-pulse"></div>
                                <div className="absolute bottom-0 right-0 w-40 h-40 bg-primary-purple/10 rounded-full blur-3xl animate-pulse delay-75"></div>
                            </div>

                            <input {...getInputProps()} />
                            {formData.mapa_imagen ? (
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="relative space-y-4"
                                >
                                    <div className="relative inline-block">
                                        <img
                                            src={formData.mapa_imagen}
                                            alt="Preview"
                                            className="max-h-48 mx-auto rounded-xl shadow-2xl border-4 border-white"
                                        />
                                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-green-400 to-green-500 rounded-full flex items-center justify-center shadow-lg">
                                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    </div>
                                    <p className="text-sm font-semibold text-gray-700">{formData.mapa_filename}</p>
                                    <p className="text-xs text-gray-500">Click o arrastra para cambiar</p>
                                </motion.div>
                            ) : (
                                <div className="relative space-y-4">
                                    <motion.div
                                        animate={{ y: isDragActive ? -10 : 0 }}
                                        transition={{ type: "spring", stiffness: 300 }}
                                        className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary-blue to-primary-purple flex items-center justify-center shadow-xl"
                                    >
                                        <Upload className="text-white" size={36} />
                                    </motion.div>
                                    <div>
                                        <p className="text-lg font-bold text-gray-900 mb-2">
                                            {isDragActive ? '¡Suelta la imagen aquí!' : 'Arrastra tu plano aquí'}
                                        </p>
                                        <p className="text-sm text-gray-600 mb-1">o haz click para seleccionar</p>
                                        <p className="text-xs text-gray-400">PNG, JPG, GIF hasta 10MB</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-6 py-4 bg-gradient-to-r from-primary-blue to-primary-purple text-white rounded-xl hover:shadow-2xl hover:scale-105 transition-all font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? '⏳ Guardando...' : (editingFloor ? '✨ Actualizar Piso' : '🚀 Crear Piso')}
                        </button>

                        {editingFloor && (
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

                {/* Floor List */}
                <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                        <Building2 className="text-primary-blue" size={28} />
                        Pisos Existentes
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {pisos.map((piso) => (
                            <motion.div
                                key={piso.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                whileHover={{ scale: 1.02, y: -4 }}
                                className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-2xl border-2 border-gray-100 hover:border-primary-blue/30 hover:shadow-xl transition-all"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-start gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-blue/10 to-primary-purple/10 flex items-center justify-center">
                                            <span className="text-2xl font-bold text-primary-blue">{piso.nivel}</span>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-lg text-gray-900">{piso.nombre}</h4>
                                            <p className="text-sm text-gray-600">Nivel {piso.nivel}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleEdit(piso)}
                                            className="p-2 hover:bg-primary-blue/10 rounded-lg transition-colors group"
                                            title="Editar"
                                        >
                                            <Edit size={18} className="text-primary-blue group-hover:scale-110 transition-transform" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(piso.id)}
                                            className="p-2 hover:bg-red-100 rounded-lg transition-colors group"
                                            title="Eliminar"
                                        >
                                            <Trash2 size={18} className="text-red-600 group-hover:scale-110 transition-transform" />
                                        </button>
                                    </div>
                                </div>

                                {piso.mapa_filename ? (
                                    <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg border border-green-200">
                                        <ImageIcon size={16} className="text-green-600" />
                                        <span className="text-xs font-medium text-green-700 truncate flex-1">{piso.mapa_filename}</span>
                                        <button
                                            onClick={() => handleEdit(piso)}
                                            className="text-xs text-primary-blue hover:underline font-medium"
                                        >
                                            Cambiar
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleEdit(piso)}
                                        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-amber-50 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors"
                                    >
                                        <Upload size={14} />
                                        <span className="text-xs font-medium">Subir plano</span>
                                    </button>
                                )}
                            </motion.div>
                        ))}
                    </div>

                    {pisos.length === 0 && (
                        <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-white rounded-2xl border-2 border-dashed border-gray-200">
                            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                <Building2 size={36} className="text-gray-400" />
                            </div>
                            <p className="text-lg font-semibold text-gray-900 mb-2">No hay pisos registrados</p>
                            <p className="text-sm text-gray-500">Crea tu primer piso para comenzar</p>
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
                    className="contents"
                >
                    {content}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

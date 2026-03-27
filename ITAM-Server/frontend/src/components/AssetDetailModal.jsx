import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, MapPin, Printer, Laptop, HardDrive, Wifi, Shield, ArrowRight, Activity } from 'lucide-react';
import { format } from 'date-fns';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../config';

export default function AssetDetailModal({ isOpen, onClose, asset, onOpenHistory }) {
    const [printStats, setPrintStats] = useState(null);
    const [loadingPrints, setLoadingPrints] = useState(false);
    const [pisos, setPisos] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        if (isOpen && asset) {
            fetchPrintStats();
            // Load pisos if not already loaded
            if (pisos.length === 0) fetchPisos();
        }
    }, [isOpen, asset]);

    const fetchPisos = async () => {
        try {
            const res = await axios.get(API_ENDPOINTS.FLOORS);
            setPisos(res.data);
        } catch (err) {
            console.error('Error fetching pisos:', err);
        }
    };

    const fetchPrintStats = async () => {
        setLoadingPrints(true);
        try {
            // Buscar impresiones del día actual
            const today = new Date().toISOString().split('T')[0];
            const response = await axios.get(`${API_ENDPOINTS.PRINT_STATS}/by-asset/${asset.id}?fecha_inicio=${today}&fecha_fin=${today}`);
            setPrintStats(response.data);
        } catch (error) {
            console.error("Error fetching print stats:", error);
        } finally {
            setLoadingPrints(false);
        }
    };

    const handleViewOnMap = () => {
        onClose();
        if (asset.piso_id) {
            // Resolve edificio_id from the pisos list
            const piso = pisos.find(p => p.id === asset.piso_id);
            const edificioId = piso?.edificio_id || null;
            navigate('/map', {
                state: {
                    edificioId,
                    pisoId: asset.piso_id,
                    highlightAsset: asset.id
                }
            });
        }
    };

    if (!isOpen || !asset) return null;

    // Calcular totales del día (resumen agrupado)
    const todayTotalPages = printStats?.resumen_por_impresora?.reduce((acc, curr) => acc + curr.total_pages, 0) || 0;
    const todayTotalJobs = printStats?.resumen_por_impresora?.reduce((acc, curr) => acc + curr.total_jobs, 0) || 0;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-6 bg-gradient-to-r from-red-800 to-red-900 text-white flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                                <Laptop size={24} className="text-white" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold">{asset.hostname}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className={`w-2 h-2 rounded-full ${asset.is_online ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                                    <span className="text-sm font-medium opacity-90">{asset.is_online ? 'ONLINE' : 'OFFLINE'}</span>
                                    <span className="text-sm opacity-70">| IP: {asset.ip_address}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => { onClose(); onOpenHistory(asset); }}
                                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm font-medium"
                            >
                                <Clock size={16} /> Historial
                            </button>
                            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                            {/* Columna Izquierda: Detalles del Hardware e Info General */}
                            <div className="md:col-span-2 space-y-6">
                                {/* Actions Bar */}
                                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <MapPin size={20} className="text-red-700" />
                                        <span className="font-medium">Ubicación:</span>
                                        <span>{asset.area || 'Sin área asignada'}</span>
                                    </div>
                                    <button
                                        onClick={handleViewOnMap}
                                        disabled={!asset.piso_id}
                                        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-all ${asset.piso_id
                                            ? 'bg-red-700 text-white hover:bg-red-800 hover:shadow-md'
                                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            }`}
                                    >
                                        <MapPin size={16} />
                                        {asset.piso_id ? 'UBICAR EN MAPA' : 'NO MAPA'}
                                    </button>
                                </div>

                                {/* Detailed Info Grid */}
                                <div className="grid grid-cols-2 gap-4">
                                    {/* System Info */}
                                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                        <h4 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2 border-b pb-2">
                                            <Shield size={16} className="text-blue-600" /> Sistema & Dominio
                                        </h4>
                                        <div className="space-y-3">
                                            <div>
                                                <p className="text-xs text-gray-500 font-medium">Sistema Operativo</p>
                                                <p className="text-sm font-semibold text-gray-900">{asset.sistema_operativo || 'Desconocido'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 font-medium">Usuario Detectado</p>
                                                <p className="text-sm font-semibold text-gray-900">{asset.usuario_detectado || 'N/A'}</p>
                                                {asset.usuario_nombre_completo && asset.usuario_nombre_completo !== asset.usuario_detectado && (
                                                    <p className="text-xs text-gray-500 mt-0.5">{asset.usuario_nombre_completo}</p>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 font-medium">Unido a Dominio</p>
                                                <p className="text-sm font-semibold text-gray-900">{asset.es_dominio ? 'SÍ' : 'NO'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Network Info */}
                                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                        <h4 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2 border-b pb-2">
                                            <Wifi size={16} className="text-blue-600" /> Red & Conectividad
                                        </h4>
                                        <div className="space-y-3">
                                            <div>
                                                <p className="text-xs text-gray-500 font-medium">Dirección IP</p>
                                                <p className="text-sm font-mono text-gray-900">{asset.ip_address || 'Desconocida'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 font-medium">Dirección MAC</p>
                                                <p className="text-sm font-mono text-gray-900">{asset.mac_address || 'Desconocida'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 font-medium">Último Reporte (Agente)</p>
                                                <p className="text-sm font-semibold text-gray-900">
                                                    {asset.ultimo_reporte ? format(new Date(asset.ultimo_reporte), 'dd/MM/yyyy HH:mm') : 'Nunca'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Hardware Info */}
                                    <div className="col-span-2 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                        <h4 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2 border-b pb-2">
                                            <HardDrive size={16} className="text-blue-600" /> Hardware
                                        </h4>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <p className="text-xs text-gray-500 font-medium">Marca / Modelo</p>
                                                <p className="text-sm font-semibold text-gray-900">{asset.marca || 'N/A'} {asset.modelo ? `- ${asset.modelo}` : ''}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 font-medium">Procesador</p>
                                                <p className="text-sm font-semibold text-gray-900">{asset.procesador || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 font-medium">Memoria RAM</p>
                                                <p className="text-sm font-semibold text-gray-900">{asset.memoria_ram || 'N/A'}</p>
                                            </div>
                                            <div className="col-span-3">
                                                <p className="text-xs text-gray-500 font-medium">Almacenamiento</p>
                                                <p className="text-sm font-semibold text-gray-900">{asset.disco_duro || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Columna Derecha: Impresiones del Día */}
                            <div className="space-y-6">
                                <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg text-white h-full flex flex-col">
                                    <h4 className="text-sm font-bold text-blue-300 mb-4 flex items-center gap-2 border-b border-slate-700 pb-3">
                                        <Printer size={18} /> IMPRESIONES DE HOY
                                    </h4>

                                    {loadingPrints ? (
                                        <div className="flex-1 flex items-center justify-center">
                                            <div className="animate-spin h-8 w-8 border-2 border-blue-400 border-t-transparent rounded-full"></div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col h-full">
                                            {/* KPIs Rápidos */}
                                            <div className="grid grid-cols-2 gap-3 mb-6">
                                                <div className="bg-white/10 p-3 rounded-lg border border-white/5">
                                                    <p className="text-xs text-gray-400 font-medium mb-1">Páginas</p>
                                                    <p className="text-3xl font-bold text-white">{todayTotalPages}</p>
                                                </div>
                                                <div className="bg-white/10 p-3 rounded-lg border border-white/5">
                                                    <p className="text-xs text-gray-400 font-medium mb-1">Trabajos</p>
                                                    <p className="text-3xl font-bold text-white">{todayTotalJobs}</p>
                                                </div>
                                            </div>

                                            {/* Desglose por Impresora */}
                                            <h5 className="text-xs text-gray-400 font-bold mb-3 uppercase tracking-wider">Desglose por Dispositivo</h5>

                                            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                                                {printStats?.resumen_por_impresora?.length > 0 ? (
                                                    printStats.resumen_por_impresora.map((p, idx) => (
                                                        <div key={idx} className="bg-white/5 p-3 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <p className="text-sm font-medium text-blue-200 line-clamp-1 flex-1 pr-2" title={p.printer_name}>
                                                                    {p.printer_name}
                                                                </p>
                                                                {p.is_network && (
                                                                    <span className="shrink-0 px-2 py-0.5 bg-blue-500/20 text-blue-300 text-[10px] font-bold rounded">RED</span>
                                                                )}
                                                            </div>
                                                            <div className="flex justify-between text-xs">
                                                                <span className="text-gray-400">{p.total_jobs} docs</span>
                                                                <span className="font-bold text-white bg-blue-600/50 px-2 py-0.5 rounded">{p.total_pages} pág</span>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-center py-8">
                                                        <Activity size={32} className="mx-auto text-slate-600 mb-2" />
                                                        <p className="text-sm text-gray-400">No ha impreso documentos hoy.</p>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="mt-4 pt-3 border-t border-slate-700 text-center">
                                                <p className="text-[10px] text-gray-500">Estadísticas basadas en lecturas del Agente local.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

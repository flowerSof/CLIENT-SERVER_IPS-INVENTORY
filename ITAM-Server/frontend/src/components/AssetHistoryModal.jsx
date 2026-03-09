import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Calendar, User, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import axios from 'axios';
import { API_ENDPOINTS } from '../config';

export default function AssetHistoryModal({ isOpen, onClose, assetId, hostname }) {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && assetId) {
            fetchHistory();
        }
    }, [isOpen, assetId]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_ENDPOINTS.HISTORY}/${assetId}`);
            setHistory(response.data);
        } catch (error) {
            console.error("Error fetching history:", error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

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
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-6 bg-gradient-to-r from-gray-900 to-gray-800 text-white flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                                <Clock size={20} className="text-blue-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold">Historial de Cambios</h3>
                                <p className="text-sm text-gray-400">Activo: {hostname}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                        {loading ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-24 bg-white rounded-xl animate-pulse" />
                                ))}
                            </div>
                        ) : history.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <Clock size={48} className="mx-auto mb-4 text-gray-300" />
                                <p>No hay cambios registrados para este activo.</p>
                            </div>
                        ) : (
                            <div className="relative space-y-6 pl-4 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:bg-gradient-to-b before:from-blue-500 before:to-purple-500/0">
                                {history.map((record, index) => (
                                    <motion.div
                                        key={record.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="relative bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                                    >
                                        <div className="absolute -left-[22px] top-5 w-3 h-3 rounded-full bg-blue-500 ring-4 ring-blue-100" />

                                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
                                            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                <Calendar size={14} />
                                                {format(new Date(record.fecha_cambio), 'dd MMM yyyy, HH:mm')}
                                            </div>
                                            <span className="px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
                                                {record.campo_modificado}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-4 text-sm">
                                            <div className="flex-1 p-3 bg-red-50 rounded-lg border border-red-100/50">
                                                <div className="text-xs font-semibold text-red-500 mb-1">ANTERIOR</div>
                                                <div className="font-mono text-gray-700 break-all">{record.valor_anterior || '(Vacío)'}</div>
                                            </div>
                                            <ArrowRight size={16} className="text-gray-400 shrink-0" />
                                            <div className="flex-1 p-3 bg-green-50 rounded-lg border border-green-100/50">
                                                <div className="text-xs font-semibold text-green-500 mb-1">NUEVO</div>
                                                <div className="font-mono text-gray-700 break-all">{record.valor_nuevo || '(Vacío)'}</div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    Printer, RefreshCw, Search, Calendar, BarChart3,
    FileText, User, Laptop, MapPin, Hash, Trophy
} from "lucide-react";
import axios from "axios";
import { API_ENDPOINTS } from '../config';

const API_URL = API_ENDPOINTS.PRINT_STATS;

const PrinterPanel = () => {
    const [ranking, setRanking] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [dateRange, setDateRange] = useState("all");

    useEffect(() => {
        fetchData();
    }, [dateRange]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Configurar fechas según el filtro
            let queryParams = "";
            const today = new Date();

            if (dateRange === "today") {
                const dateStr = today.toISOString().split('T')[0];
                queryParams = `?fecha_inicio=${dateStr}&fecha_fin=${dateStr}`;
            } else if (dateRange === "month") {
                const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
                const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
                queryParams = `?fecha_inicio=${firstDay}&fecha_fin=${lastDay}`;
            }

            // Obtener ranking y el endpoint tradicional de stats de servidores (opcional)
            const [rankingRes, statsRes] = await Promise.all([
                axios.get(`${API_URL}/ranking${queryParams}`),
                axios.get(`${API_URL}/summary`).catch(() => ({ data: null }))
            ]);

            setRanking(rankingRes.data);
            if (statsRes.data) {
                setStats(statsRes.data);
            }

        } catch (error) {
            console.error("Error fetching print ranking:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredRanking = ranking.filter(item => {
        const term = searchTerm.toLowerCase();
        return (
            (item.hostname && item.hostname.toLowerCase().includes(term)) ||
            (item.ip_address && item.ip_address.includes(term)) ||
            (item.area && item.area.toLowerCase().includes(term))
        );
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="p-6 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-gradient-to-br from-red-600 to-red-700 rounded-xl shadow-lg">
                                <BarChart3 className="text-white" size={28} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800">Ranking de Impresiones</h2>
                                <p className="text-sm text-gray-500">Volumen de impresión por computadora</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={fetchData}
                                disabled={loading}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                            >
                                <RefreshCw size={18} className={loading ? "animate-spin text-red-600" : "text-gray-500"} />
                                Actualizar
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 bg-gray-50/50">
                    <StatCard
                        icon={<FileText size={24} />}
                        label={dateRange === "today" ? "Páginas Hoy" : (dateRange === "month" ? "Páginas este Mes" : "Total Páginas Histórico")}
                        value={ranking.reduce((acc, curr) => acc + curr.total_pages, 0).toLocaleString()}
                        color="blue"
                    />
                    <StatCard
                        icon={<Printer size={24} />}
                        label="Trabajos Enviados"
                        value={ranking.reduce((acc, curr) => acc + curr.total_jobs, 0).toLocaleString()}
                        color="purple"
                    />
                    <StatCard
                        icon={<Laptop size={24} />}
                        label="PCs Activas (Imprimiendo)"
                        value={ranking.filter(r => r.total_pages > 0).length.toString()}
                        color="orange"
                    />
                </div>
            </div>

            {/* Filters & Search */}
            <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex-1 min-w-[250px]">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar por hostname, IP o área..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setDateRange("today")}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${dateRange === "today" ? "bg-white text-red-700 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
                        >
                            Hoy
                        </button>
                        <button
                            onClick={() => setDateRange("month")}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${dateRange === "month" ? "bg-white text-red-700 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
                        >
                            Este Mes
                        </button>
                        <button
                            onClick={() => setDateRange("all")}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${dateRange === "all" ? "bg-white text-red-700 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
                        >
                            Histórico
                        </button>
                    </div>
                </div>
            </div>

            {/* Table Area */}
            <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                            <tr>
                                <th className="px-6 py-4 w-16 text-center">Rank</th>
                                <th className="px-6 py-4">Computadora (Hostname)</th>
                                <th className="px-6 py-4">IP Address</th>
                                <th className="px-6 py-4">Área / Ubicación</th>
                                <th className="px-6 py-4 text-right">Trabajos (Docs)</th>
                                <th className="px-6 py-4 text-right">Páginas Impresas</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading && ranking.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                        <RefreshCw className="animate-spin h-8 w-8 text-red-600 mx-auto mb-4" />
                                        Cargando estadísticas...
                                    </td>
                                </tr>
                            ) : filteredRanking.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                        <p className="font-medium text-gray-600">No hay registros de impresión</p>
                                        <p className="text-sm">Intenta cambiar los filtros de búsqueda o fecha.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredRanking.map((item, index) => (
                                    <motion.tr
                                        key={item.activo_id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.02 }}
                                        className="hover:bg-red-50/30 transition-colors"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            {index === 0 ? (
                                                <Trophy className="inline text-yellow-500" size={20} />
                                            ) : index === 1 ? (
                                                <Trophy className="inline text-gray-400" size={20} />
                                            ) : index === 2 ? (
                                                <Trophy className="inline text-amber-600" size={20} />
                                            ) : (
                                                <span className="font-bold text-gray-400">#{index + 1}</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded bg-red-100 flex items-center justify-center text-red-700">
                                                    <Laptop size={16} />
                                                </div>
                                                <span className="font-bold text-gray-800">{item.hostname}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-600">
                                            {item.ip_address || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                                <MapPin size={14} className="text-gray-400" />
                                                {item.area || 'Sin Área Asignada'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-gray-600">
                                            {item.total_jobs.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <span className="inline-flex px-3 py-1 bg-red-100 text-red-800 rounded-full font-bold text-sm">
                                                {item.total_pages.toLocaleString()} pág
                                            </span>
                                        </td>
                                    </motion.tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// Subcomponente
const StatCard = ({ icon, label, value, color }) => {
    const colorClasses = {
        blue: "from-blue-500 to-blue-600",
        green: "from-green-500 to-green-600",
        purple: "from-purple-500 to-purple-600",
        orange: "from-orange-500 to-orange-600",
        red: "from-red-500 to-red-600"
    };

    return (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
                <div className={`p-2 bg-gradient-to-br ${colorClasses[color]} rounded-lg text-white`}>
                    {icon}
                </div>
                <div>
                    <p className="text-2xl font-bold text-slate-800">{value}</p>
                    <p className="text-sm text-gray-500">{label}</p>
                </div>
            </div>
        </div>
    );
};

export default PrinterPanel;

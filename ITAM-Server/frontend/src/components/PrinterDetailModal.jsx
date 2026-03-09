import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    Printer,
    X,
    MapPin,
    Clock,
    FileText,
    BarChart3,
    Calendar,
    RefreshCw,
    Edit2,
    Trash2,
    TrendingUp,
    Zap,
    Building2,
    Wifi,
    WifiOff
} from "lucide-react";
import { API_ENDPOINTS } from '../config';

const API_URL = API_ENDPOINTS.PRINTERS;

const PrinterDetailModal = ({ printer, onClose, onUpdate }) => {
    const [details, setDetails] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [scanning, setScanning] = useState(false);
    const [dateRange, setDateRange] = useState("week");
    const [customDates, setCustomDates] = useState({
        inicio: "",
        fin: ""
    });

    useEffect(() => {
        fetchDetails();
        fetchHistory();
    }, [printer.id, dateRange]);

    const fetchDetails = async () => {
        try {
            const response = await fetch(`${API_URL}/${printer.id}`);
            if (response.ok) {
                const data = await response.json();
                setDetails(data);
            }
        } catch (error) {
            console.error("Error fetching printer details:", error);
        }
    };

    const fetchHistory = async () => {
        setLoading(true);
        try {
            let url = `${API_URL}/${printer.id}/history`;

            const today = new Date();
            let fechaInicio, fechaFin;

            switch (dateRange) {
                case "today":
                    fechaInicio = fechaFin = today.toISOString().split("T")[0];
                    break;
                case "week":
                    fechaFin = today.toISOString().split("T")[0];
                    fechaInicio = new Date(today.setDate(today.getDate() - 7)).toISOString().split("T")[0];
                    break;
                case "month":
                    fechaFin = today.toISOString().split("T")[0];
                    fechaInicio = new Date(today.setDate(today.getDate() - 30)).toISOString().split("T")[0];
                    break;
                case "custom":
                    if (customDates.inicio && customDates.fin) {
                        fechaInicio = customDates.inicio;
                        fechaFin = customDates.fin;
                    }
                    break;
            }

            if (fechaInicio && fechaFin) {
                url += `?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`;
            }

            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                setHistory(data);
            }
        } catch (error) {
            console.error("Error fetching history:", error);
        } finally {
            setLoading(false);
        }
    };

    const scanPrinter = async () => {
        setScanning(true);
        try {
            const response = await fetch(`${API_URL}/${printer.id}/scan`, {
                method: "POST"
            });

            if (response.ok) {
                await fetchDetails();
                await fetchHistory();
                onUpdate();
            }
        } catch (error) {
            console.error("Error scanning printer:", error);
        } finally {
            setScanning(false);
        }
    };

    const deletePrinter = async () => {
        if (!window.confirm("¿Estás seguro de eliminar esta impresora?")) return;

        try {
            const response = await fetch(`${API_URL}/${printer.id}`, {
                method: "DELETE"
            });

            if (response.ok) {
                onUpdate();
                onClose();
            }
        } catch (error) {
            console.error("Error deleting printer:", error);
        }
    };

    const data = details || printer;

    // Calculate max for chart scaling
    const maxImpresiones = history?.historial?.length > 0
        ? Math.max(...history.historial.map(h => h.impresiones))
        : 100;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="p-6 bg-gradient-to-r from-slate-800 to-slate-900 text-white flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`p-4 rounded-xl ${data.is_online
                                ? "bg-gradient-to-br from-green-500 to-green-600"
                                : "bg-gradient-to-br from-gray-500 to-gray-600"
                                }`}>
                                <Printer size={32} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold">{data.nombre}</h2>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className="text-gray-300">{data.ip_address}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${data.is_online
                                        ? "bg-green-500/30 text-green-300"
                                        : "bg-gray-500/30 text-gray-300"
                                        }`}>
                                        {data.is_online ? "En línea" : "Fuera de línea"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={scanPrinter}
                                disabled={scanning}
                                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
                            >
                                <RefreshCw size={18} className={scanning ? "animate-spin" : ""} />
                                {scanning ? "Escaneando..." : "Actualizar"}
                            </button>
                            <button
                                onClick={deletePrinter}
                                className="p-2 bg-red-500/20 hover:bg-red-500/40 text-red-300 rounded-lg transition-colors"
                            >
                                <Trash2 size={18} />
                            </button>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Info Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <InfoCard
                            icon={<FileText size={20} />}
                            label="Impresiones Hoy"
                            value={data.impresiones_hoy?.toLocaleString() || 0}
                            color="red"
                        />
                        <InfoCard
                            icon={<TrendingUp size={20} />}
                            label="Última Semana"
                            value={data.impresiones_semana?.toLocaleString() || 0}
                            color="blue"
                        />
                        <InfoCard
                            icon={<BarChart3 size={20} />}
                            label="Total Acumulado"
                            value={data.ultimo_contador?.toLocaleString() || 0}
                            color="purple"
                        />
                    </div>

                    {/* Details Grid */}
                    <div className="bg-gray-50 rounded-xl p-5">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Información del Dispositivo</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <DetailItem icon={<Printer size={16} />} label="Marca" value={data.marca} />
                            <DetailItem icon={<FileText size={16} />} label="Modelo" value={data.modelo || "N/A"} />
                            <DetailItem icon={<Wifi size={16} />} label="IP" value={data.ip_address} />
                            <DetailItem icon={<Clock size={16} />} label="Último Sondeo" value={
                                data.ultimo_sondeo
                                    ? new Date(data.ultimo_sondeo).toLocaleString()
                                    : "Nunca"
                            } />
                            <DetailItem icon={<MapPin size={16} />} label="Ubicación" value={data.ubicacion || "Sin asignar"} />
                            <DetailItem icon={<Building2 size={16} />} label="Edificio" value={data.edificio_nombre || "N/A"} />
                            <DetailItem icon={<Building2 size={16} />} label="Piso" value={data.piso_nombre || "N/A"} />
                            <DetailItem icon={<Zap size={16} />} label="SNMP Community" value={data.snmp_community || "public"} />
                        </div>
                    </div>

                    {/* History Chart */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-800">Historial de Impresiones</h3>

                            {/* Date Range Selector */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setDateRange("today")}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${dateRange === "today" ? "bg-red-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                        }`}
                                >
                                    Hoy
                                </button>
                                <button
                                    onClick={() => setDateRange("week")}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${dateRange === "week" ? "bg-red-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                        }`}
                                >
                                    Semana
                                </button>
                                <button
                                    onClick={() => setDateRange("month")}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${dateRange === "month" ? "bg-red-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                        }`}
                                >
                                    Mes
                                </button>
                                <button
                                    onClick={() => setDateRange("custom")}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${dateRange === "custom" ? "bg-red-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                        }`}
                                >
                                    <Calendar size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Custom Date Range */}
                        {dateRange === "custom" && (
                            <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <label className="text-sm text-gray-600">Desde:</label>
                                    <input
                                        type="date"
                                        value={customDates.inicio}
                                        onChange={(e) => setCustomDates({ ...customDates, inicio: e.target.value })}
                                        className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="text-sm text-gray-600">Hasta:</label>
                                    <input
                                        type="date"
                                        value={customDates.fin}
                                        onChange={(e) => setCustomDates({ ...customDates, fin: e.target.value })}
                                        className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
                                    />
                                </div>
                                <button
                                    onClick={fetchHistory}
                                    className="px-4 py-1.5 bg-red-700 text-white rounded-lg text-sm font-medium hover:bg-red-800"
                                >
                                    Aplicar
                                </button>
                            </div>
                        )}

                        {/* Chart */}
                        <div className="p-4">
                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <RefreshCw className="animate-spin text-gray-400" size={32} />
                                </div>
                            ) : history?.historial?.length > 0 ? (
                                <div className="space-y-4">
                                    {/* Simple Bar Chart */}
                                    <div className="flex items-end gap-2 h-48">
                                        {history.historial.map((item, index) => {
                                            const height = maxImpresiones > 0
                                                ? (item.impresiones / maxImpresiones) * 100
                                                : 0;
                                            return (
                                                <div
                                                    key={index}
                                                    className="flex-1 flex flex-col items-center gap-1"
                                                >
                                                    <span className="text-xs font-medium text-gray-700">
                                                        {item.impresiones}
                                                    </span>
                                                    <div
                                                        className="w-full bg-gradient-to-t from-red-600 to-red-400 rounded-t-lg transition-all hover:from-red-700 hover:to-red-500"
                                                        style={{ height: `${Math.max(height, 4)}%` }}
                                                    />
                                                    <span className="text-xs text-gray-500 mt-1 truncate max-w-full">
                                                        {formatDate(item.fecha)}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Summary */}
                                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                                        <span className="text-sm text-gray-600">
                                            Total del período: <strong className="text-red-700">{history.total_periodo?.toLocaleString()}</strong> impresiones
                                        </span>
                                        <span className="text-sm text-gray-500">
                                            {history.periodo?.inicio} a {history.periodo?.fin}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-12 text-gray-400">
                                    <BarChart3 size={48} className="mx-auto mb-3 opacity-50" />
                                    <p>No hay datos de impresiones para este período</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

// === HELPER COMPONENTS ===

const InfoCard = ({ icon, label, value, color }) => {
    const colorClasses = {
        red: "from-red-500 to-red-600",
        blue: "from-blue-500 to-blue-600",
        purple: "from-purple-500 to-purple-600",
        green: "from-green-500 to-green-600"
    };

    return (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
                <div className={`p-2.5 bg-gradient-to-br ${colorClasses[color]} rounded-lg text-white`}>
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

const DetailItem = ({ icon, label, value }) => (
    <div className="flex items-start gap-2">
        <span className="text-gray-400 mt-0.5">{icon}</span>
        <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
            <p className="text-sm font-medium text-slate-700">{value}</p>
        </div>
    </div>
);

const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-PE", { month: "short", day: "numeric" });
};

export default PrinterDetailModal;

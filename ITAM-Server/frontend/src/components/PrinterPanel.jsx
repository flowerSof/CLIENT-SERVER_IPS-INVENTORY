import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Printer,
    RefreshCw,
    Plus,
    Search,
    Filter,
    Calendar,
    TrendingUp,
    AlertCircle,
    CheckCircle,
    XCircle,
    BarChart3,
    MapPin,
    Clock,
    FileText,
    ChevronDown,
    X,
    Edit2,
    Trash2,
    Zap
} from "lucide-react";
import PrinterDetailModal from "./PrinterDetailModal";

const API_URL = "http://localhost:8000";

const PrinterPanel = () => {
    const [printers, setPrinters] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [scanning, setScanning] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterOnline, setFilterOnline] = useState(null);
    const [selectedPrinter, setSelectedPrinter] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [dateRange, setDateRange] = useState("week");

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [printersRes, statsRes] = await Promise.all([
                fetch(`${API_URL}/api/printers`),
                fetch(`${API_URL}/api/printers/stats`)
            ]);

            if (printersRes.ok) {
                const data = await printersRes.json();
                setPrinters(data);
            }

            if (statsRes.ok) {
                const data = await statsRes.json();
                setStats(data);
            }
        } catch (error) {
            console.error("Error fetching printers:", error);
        } finally {
            setLoading(false);
        }
    };

    const scanAllPrinters = async () => {
        setScanning(true);
        try {
            const response = await fetch(`${API_URL}/api/printers/scan-all`, {
                method: "POST"
            });

            if (response.ok) {
                // Esperar un poco y refrescar
                setTimeout(fetchData, 3000);
            }
        } catch (error) {
            console.error("Error scanning printers:", error);
        } finally {
            setTimeout(() => setScanning(false), 3000);
        }
    };

    const filteredPrinters = printers.filter(printer => {
        const matchesSearch =
            printer.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            printer.ip_address.includes(searchTerm) ||
            (printer.ubicacion && printer.ubicacion.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesOnline = filterOnline === null || printer.is_online === filterOnline;

        return matchesSearch && matchesOnline;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="p-6 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-gradient-to-br from-red-600 to-red-700 rounded-xl shadow-lg">
                                <Printer className="text-white" size={28} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800">Panel de Impresoras</h2>
                                <p className="text-sm text-gray-500">Monitoreo de impresiones via SNMP</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={scanAllPrinters}
                                disabled={scanning}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${scanning
                                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                        : "bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg"
                                    }`}
                            >
                                <RefreshCw size={18} className={scanning ? "animate-spin" : ""} />
                                {scanning ? "Escaneando..." : "Escanear Todas"}
                            </button>

                            <button
                                onClick={() => setShowAddModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-red-700 text-white rounded-lg font-medium hover:bg-red-800 transition-all shadow-md hover:shadow-lg"
                            >
                                <Plus size={18} />
                                Agregar Impresora
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 bg-gray-50/50">
                        <StatCard
                            icon={<Printer size={24} />}
                            label="Total Impresoras"
                            value={stats.total_impresoras}
                            color="blue"
                        />
                        <StatCard
                            icon={<CheckCircle size={24} />}
                            label="En Línea"
                            value={stats.impresoras_online}
                            color="green"
                        />
                        <StatCard
                            icon={<FileText size={24} />}
                            label="Impresiones Hoy"
                            value={stats.impresiones_hoy?.toLocaleString() || 0}
                            color="purple"
                        />
                        <StatCard
                            icon={<TrendingUp size={24} />}
                            label="Impresiones (Período)"
                            value={stats.impresiones_periodo?.toLocaleString() || 0}
                            color="orange"
                        />
                    </div>
                )}
            </div>

            {/* Filters & Search */}
            <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex-1 min-w-[200px]">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar por nombre, IP o ubicación..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setFilterOnline(null)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterOnline === null
                                    ? "bg-slate-800 text-white"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                        >
                            Todas
                        </button>
                        <button
                            onClick={() => setFilterOnline(true)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterOnline === true
                                    ? "bg-green-600 text-white"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                        >
                            En Línea
                        </button>
                        <button
                            onClick={() => setFilterOnline(false)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterOnline === false
                                    ? "bg-red-600 text-white"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                        >
                            Fuera de Línea
                        </button>
                    </div>
                </div>
            </div>

            {/* Printers Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <RefreshCw className="animate-spin text-red-600" size={40} />
                </div>
            ) : filteredPrinters.length === 0 ? (
                <div className="bg-white rounded-xl shadow-md p-12 text-center">
                    <Printer className="mx-auto text-gray-300 mb-4" size={64} />
                    <h3 className="text-xl font-semibold text-gray-600 mb-2">
                        {printers.length === 0 ? "No hay impresoras registradas" : "No se encontraron resultados"}
                    </h3>
                    <p className="text-gray-400">
                        {printers.length === 0
                            ? "Agrega tu primera impresora para comenzar el monitoreo"
                            : "Intenta con otros términos de búsqueda"}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AnimatePresence>
                        {filteredPrinters.map((printer) => (
                            <PrinterCard
                                key={printer.id}
                                printer={printer}
                                onClick={() => setSelectedPrinter(printer)}
                            />
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Detail Modal */}
            {selectedPrinter && (
                <PrinterDetailModal
                    printer={selectedPrinter}
                    onClose={() => setSelectedPrinter(null)}
                    onUpdate={fetchData}
                />
            )}

            {/* Add Printer Modal */}
            {showAddModal && (
                <AddPrinterModal
                    onClose={() => setShowAddModal(false)}
                    onSuccess={() => {
                        setShowAddModal(false);
                        fetchData();
                    }}
                />
            )}
        </div>
    );
};

// === SUBCOMPONENTS ===

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

const PrinterCard = ({ printer, onClick }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            onClick={onClick}
            className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden hover:shadow-xl transition-all cursor-pointer group"
        >
            <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-xl ${printer.is_online
                                ? "bg-gradient-to-br from-green-500 to-green-600"
                                : "bg-gradient-to-br from-gray-400 to-gray-500"
                            }`}>
                            <Printer className="text-white" size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 group-hover:text-red-700 transition-colors">
                                {printer.nombre}
                            </h3>
                            <p className="text-sm text-gray-500">{printer.ip_address}</p>
                        </div>
                    </div>

                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${printer.is_online
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}>
                        {printer.is_online ? "En línea" : "Fuera de línea"}
                    </span>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin size={14} className="text-gray-400" />
                        <span>{printer.ubicacion || "Sin ubicación asignada"}</span>
                    </div>

                    {printer.piso_nombre && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <FileText size={14} className="text-gray-400" />
                            <span>{printer.edificio_nombre} - {printer.piso_nombre}</span>
                        </div>
                    )}

                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <BarChart3 size={14} className="text-gray-400" />
                        <span>Marca: {printer.marca}</span>
                    </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide">Impresiones Hoy</p>
                            <p className="text-2xl font-bold text-red-700">{printer.impresiones_hoy?.toLocaleString() || 0}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-500 uppercase tracking-wide">Total Acumulado</p>
                            <p className="text-lg font-semibold text-gray-700">{printer.ultimo_contador?.toLocaleString() || 0}</p>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

const AddPrinterModal = ({ onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        nombre: "",
        ip_address: "",
        marca: "Lexmark",
        modelo: "",
        ubicacion: "",
        snmp_community: "public"
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError("");

        try {
            const response = await fetch(`${API_URL}/api/printers`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                onSuccess();
            } else {
                const data = await response.json();
                setError(data.detail || "Error al guardar la impresora");
            }
        } catch (err) {
            setError("Error de conexión con el servidor");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
                <div className="p-6 bg-gradient-to-r from-red-700 to-red-800 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Plus size={24} />
                            <h2 className="text-xl font-bold">Agregar Impresora</h2>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                            <input
                                type="text"
                                value={formData.nombre}
                                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                required
                                placeholder="Ej: Impresora Piso 2"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">IP Address *</label>
                            <input
                                type="text"
                                value={formData.ip_address}
                                onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                                required
                                placeholder="192.168.1.100"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
                            <select
                                value={formData.marca}
                                onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500"
                            >
                                <option value="Lexmark">Lexmark</option>
                                <option value="Ricoh">Ricoh</option>
                                <option value="HP">HP</option>
                                <option value="Canon">Canon</option>
                                <option value="Brother">Brother</option>
                                <option value="Xerox">Xerox</option>
                                <option value="Epson">Epson</option>
                                <option value="Other">Otra</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
                            <input
                                type="text"
                                value={formData.modelo}
                                onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                                placeholder="Ej: MX-B455W"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">SNMP Community</label>
                            <input
                                type="text"
                                value={formData.snmp_community}
                                onChange={(e) => setFormData({ ...formData, snmp_community: e.target.value })}
                                placeholder="public"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500"
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
                            <input
                                type="text"
                                value={formData.ubicacion}
                                onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
                                placeholder="Ej: Oficina de Administración, 2do Piso"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition-colors disabled:opacity-50"
                        >
                            {saving ? "Guardando..." : "Guardar Impresora"}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default PrinterPanel;

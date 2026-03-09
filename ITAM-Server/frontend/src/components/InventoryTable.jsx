import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Search, Download, ChevronDown, Edit2, Circle, Upload, Check, X, Building2, Layers } from 'lucide-react';
import AssetIcon from './AssetIcon';
import Pagination from './Pagination';
import useRealTimeAssets from '../hooks/useRealTimeAssets';
import { format } from 'date-fns';
import axios from 'axios';
import AssetHistoryModal from './AssetHistoryModal';
import AssetDetailModal from './AssetDetailModal';
import { Settings, FileText, Clock } from 'lucide-react';
import { API_ENDPOINTS } from '../config';

export default function InventoryTable() {
    const { activos, loading, lastUpdate, refresh } = useRealTimeAssets();
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'hostname', direction: 'asc' });
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterDominio, setFilterDominio] = useState('all');
    const [filterArea, setFilterArea] = useState('all');
    const [filterEdificio, setFilterEdificio] = useState('all');
    const [filterPiso, setFilterPiso] = useState('all');

    // Datos de edificios y pisos
    const [edificios, setEdificios] = useState([]);
    const [pisos, setPisos] = useState([]);
    const [organosJudiciales, setOrganosJudiciales] = useState([]);

    const [historyAsset, setHistoryAsset] = useState(null);
    const [selectedAssetDetail, setSelectedAssetDetail] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    const itemsPerPage = 10;

    // Cargar edificios y pisos
    useEffect(() => {
        const loadFilters = async () => {
            try {
                const [edificiosRes, pisosRes, oojjRes] = await Promise.all([
                    axios.get(API_ENDPOINTS.BUILDINGS),
                    axios.get(API_ENDPOINTS.FLOORS),
                    axios.get(`${API_ENDPOINTS.CATALOGS}/OOJJ`)
                ]);
                setEdificios(edificiosRes.data);
                setPisos(pisosRes.data);
                setOrganosJudiciales(oojjRes.data);
            } catch (error) {
                console.error('Error loading filters:', error);
            }
        };
        loadFilters();
    }, []);

    // Filtrar pisos según edificio seleccionado
    const pisosFiltrados = filterEdificio === 'all'
        ? pisos
        : pisos.filter(p => p.edificio_id === parseInt(filterEdificio));

    // Resetear filtro de piso cuando cambia edificio
    useEffect(() => {
        setFilterPiso('all');
    }, [filterEdificio]);

    // Defensive check: Ensure activos is an array
    const safeActivos = Array.isArray(activos) ? activos : [];

    const filteredActivos = safeActivos
        .filter(pc => {
            const matchesSearch =
                pc.hostname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                pc.usuario_detectado?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                pc.ip_address?.includes(searchTerm);

            const matchesStatus =
                filterStatus === 'all' ? true :
                    filterStatus === 'online' ? pc.is_online :
                        !pc.is_online;

            const matchesDominio =
                filterDominio === 'all' ? true :
                    filterDominio === 'si' ? pc.es_dominio :
                        !pc.es_dominio;

            const matchesArea =
                filterArea === 'all' ? true :
                    pc.area === filterArea;

            // Filtro de edificio - a través del piso
            const matchesEdificio = filterEdificio === 'all' ? true :
                pisos.some(p => p.edificio_id === parseInt(filterEdificio) && p.id === pc.piso_id);

            // Filtro de piso
            const matchesPiso = filterPiso === 'all' ? true :
                pc.piso_id === parseInt(filterPiso);

            return matchesSearch && matchesStatus && matchesDominio && matchesArea && matchesEdificio && matchesPiso;
        })
        .sort((a, b) => {
            const aVal = a[sortConfig.key] || '';
            const bVal = b[sortConfig.key] || '';

            if (sortConfig.direction === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });

    const totalPages = Math.ceil(filteredActivos.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredActivos.length);
    const paginatedActivos = filteredActivos.slice(startIndex, endIndex);

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setUploading(true);
        try {
            await axios.post(`${API_ENDPOINTS.ASSETS}/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            alert('Carga masiva completada exitosamente');
            refresh();
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Error al cargar el archivo. Asegúrese de que sea un .xlsx válido.');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const exportToCSV = () => {
        window.location.href = `${API_ENDPOINTS.REPORTS}/excel`;
    };

    const exportToPDF = () => {
        window.location.href = `${API_ENDPOINTS.REPORTS}/pdf`;
    };

    // Obtener nombre de piso para mostrar en la tabla
    const getPisoNombre = (pisoId) => {
        const piso = pisos.find(p => p.id === pisoId);
        if (!piso) return '-';
        const edificio = edificios.find(e => e.id === piso.edificio_id);
        return edificio ? `${edificio.nombre} - ${piso.nombre}` : piso.nombre;
    };

    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-6 space-y-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200"
        >
            {/* Toolbar */}
            <div className="p-6 border-b border-gray-200 bg-white">
                <div className="flex flex-col gap-4">
                    {/* Primera fila: Búsqueda y Acciones */}
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                        {/* Search */}
                        <div className="relative flex-1 max-w-md w-full">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar por Hostname, Usuario..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-all text-sm"
                            />
                        </div>

                        {/* Acciones */}
                        <div className="flex flex-wrap gap-2">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                accept=".xlsx"
                                className="hidden"
                            />

                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-md hover:bg-blue-100 transition-all text-sm font-medium disabled:opacity-50"
                            >
                                {uploading ? (
                                    <span className="animate-spin h-4 w-4 border-2 border-blue-600 rounded-full border-t-transparent"></span>
                                ) : (
                                    <Upload size={16} />
                                )}
                                {uploading ? 'SUBIENDO...' : 'IMPORTAR EXCEL'}
                            </button>

                            <button
                                onClick={exportToCSV}
                                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-all text-sm font-medium"
                            >
                                <Download size={16} />
                                EXCEL
                            </button>

                            <button
                                onClick={exportToPDF}
                                className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded-md hover:bg-red-100 transition-all text-sm font-medium"
                            >
                                <FileText size={16} />
                                PDF
                            </button>
                        </div>
                    </div>

                    {/* Segunda fila: Filtros */}
                    <div className="flex flex-wrap gap-3">
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-all text-sm bg-white cursor-pointer"
                        >
                            <option value="all">TODOS LOS ESTADOS</option>
                            <option value="online">ONLINE</option>
                            <option value="offline">OFFLINE</option>
                        </select>

                        <select
                            value={filterDominio}
                            onChange={(e) => setFilterDominio(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-all text-sm bg-white cursor-pointer"
                        >
                            <option value="all">DOMINIO: TODOS</option>
                            <option value="si">EN DOMINIO</option>
                            <option value="no">FUERA DE DOMINIO</option>
                        </select>

                        <select
                            value={filterArea}
                            onChange={(e) => setFilterArea(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-all text-sm bg-white cursor-pointer max-w-[150px]"
                        >
                            <option value="all">ÁREA: TODAS</option>
                            {organosJudiciales.map(oojj => (
                                <option key={oojj.code} value={oojj.description}>{oojj.description}</option>
                            ))}
                        </select>

                        {/* Filtro de Edificio (Sede) */}
                        <select
                            value={filterEdificio}
                            onChange={(e) => setFilterEdificio(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-all text-sm bg-white cursor-pointer"
                        >
                            <option value="all">SEDE: TODAS</option>
                            {edificios.map(ed => (
                                <option key={ed.id} value={ed.id}>{ed.nombre}</option>
                            ))}
                        </select>

                        {/* Filtro de Piso */}
                        <select
                            value={filterPiso}
                            onChange={(e) => setFilterPiso(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-all text-sm bg-white cursor-pointer"
                            disabled={pisosFiltrados.length === 0}
                        >
                            <option value="all">PISO: TODOS</option>
                            {pisosFiltrados.map(piso => (
                                <option key={piso.id} value={piso.id}>{piso.nombre}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                ESTADO
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                DOMINIO
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                onClick={() => handleSort('area')}>
                                ÁREA
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                SEDE / PISO
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                onClick={() => handleSort('hostname')}>
                                HOSTNAME
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                IP / MAC
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                USUARIO
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                HARDWARE / RAM
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                S.O.
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                ACCIONES
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {paginatedActivos.map((pc, index) => (
                            <motion.tr
                                key={pc.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: index * 0.03 }}
                                onClick={() => setSelectedAssetDetail(pc)}
                                className="hover:bg-red-50 cursor-pointer transition-colors"
                            >
                                {/* Status */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                        <Circle
                                            size={10}
                                            className={pc.is_online ? 'fill-green-500 text-green-500' : 'fill-gray-400 text-gray-400'}
                                        />
                                        <span className={`text-xs font-medium ${pc.is_online ? 'text-green-700' : 'text-gray-500'}`}>
                                            {pc.is_online ? 'ONLINE' : 'OFFLINE'}
                                        </span>
                                    </div>
                                </td>

                                {/* Dominio */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {pc.es_dominio ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800 border border-green-200">
                                            <Check size={10} /> SI
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-500 border border-gray-200">
                                            <X size={10} /> NO
                                        </span>
                                    )}
                                </td>

                                {/* Area */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-700 font-medium">{pc.area || '-'}</div>
                                </td>

                                {/* Sede / Piso */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-xs text-gray-600">
                                        {getPisoNombre(pc.piso_id)}
                                    </div>
                                </td>

                                {/* Hostname */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-bold text-gray-900">{pc.hostname}</div>
                                </td>

                                {/* IP Address / MAC */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex flex-col">
                                        <code className="text-xs text-gray-700 font-mono">{pc.ip_address}</code>
                                        <code className="text-[10px] text-gray-500">{pc.mac_address || 'N/A'}</code>
                                    </div>
                                </td>

                                {/* User */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div>
                                        <div className="text-sm font-medium text-gray-900">{pc.usuario_detectado || 'N/A'}</div>
                                    </div>
                                </td>

                                {/* Hardware / RAM */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div>
                                        <div className="text-xs font-medium text-gray-700">{pc.marca || 'Generico'}</div>
                                        <div className="text-[10px] text-gray-500">{pc.procesador}</div>
                                        {pc.memoria_ram && (
                                            <div className="text-[10px] font-bold text-blue-600 mt-0.5">RAM: {pc.memoria_ram}</div>
                                        )}
                                    </div>
                                </td>

                                {/* OS */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                        {pc.sistema_operativo || 'WIN'}
                                    </span>
                                </td>

                                {/* Actions */}
                                <td className="px-6 py-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setHistoryAsset({ id: pc.id, hostname: pc.hostname });
                                        }}
                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                        title="Ver historial"
                                    >
                                        <Clock size={16} />
                                    </button>
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>

                {filteredActivos.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        No se encontraron activos
                    </div>
                )}
            </div>

            {/* Pagination */}
            {filteredActivos.length > 0 && (
                <div className="bg-white border-t border-gray-200 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-700">
                            MOSTRANDO <span className="font-medium">{startIndex + 1}</span> - <span className="font-medium">{endIndex}</span> DE <span className="font-medium">{filteredActivos.length}</span> ACTIVOS
                        </div>
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={handlePageChange}
                            totalItems={filteredActivos.length}
                            itemsPerPage={itemsPerPage}
                            startItem={startIndex + 1}
                            endItem={endIndex}
                        />
                    </div>
                </div>
            )}

            {/* Modal de Historial */}
            <AssetHistoryModal
                isOpen={!!historyAsset}
                onClose={() => setHistoryAsset(null)}
                assetId={historyAsset?.id}
                hostname={historyAsset?.hostname}
            />

            {/* Modal de Detalle Principal */}
            <AssetDetailModal
                isOpen={!!selectedAssetDetail}
                onClose={() => setSelectedAssetDetail(null)}
                asset={selectedAssetDetail}
                onOpenHistory={(asset) => setHistoryAsset({ id: asset.id, hostname: asset.hostname })}
            />
        </motion.div>
    );
}
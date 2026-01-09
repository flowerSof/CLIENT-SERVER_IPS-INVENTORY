import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Download, ChevronDown, Edit2, Circle } from 'lucide-react';
import AssetIcon from './AssetIcon';
import Pagination from './Pagination';
import useRealTimeAssets from '../hooks/useRealTimeAssets';
import { format } from 'date-fns';

export default function InventoryTable() {
    const { activos, loading, lastUpdate } = useRealTimeAssets();
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'hostname', direction: 'asc' });
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterLocation, setFilterLocation] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const locations = ['all', ...new Set(activos.map(a => a.piso_id).filter(Boolean))];

    const filteredActivos = activos
        .filter(pc => {
            const matchesSearch =
                pc.hostname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                pc.usuario_detectado?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                pc.ip_address?.includes(searchTerm);

            const matchesStatus =
                filterStatus === 'all' ? true :
                    filterStatus === 'online' ? pc.is_online :
                        !pc.is_online;

            const matchesLocation =
                filterLocation === 'all' ? true :
                    pc.piso_id === parseInt(filterLocation);

            return matchesSearch && matchesStatus && matchesLocation;
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

    const exportToCSV = () => {
        const headers = ['Status', 'Hostname', 'User/Dept', 'IP Address', 'MAC Address', 'Hardware', 'OS'];
        const rows = filteredActivos.map(pc => [
            pc.is_online ? 'Online' : 'Offline',
            pc.hostname,
            pc.usuario_detectado,
            pc.ip_address,
            pc.mac_address,
            `${pc.marca || ''} ${pc.memoria_ram || ''} - ${pc.procesador || ''}`,
            pc.sistema_operativo
        ]);

        const csv = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inventario_${format(new Date(), 'yyyy-MM-dd')}.csv`;
        a.click();
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

                    {/* Filters and Actions */}
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
                            value={filterLocation}
                            onChange={(e) => setFilterLocation(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-all text-sm bg-white cursor-pointer"
                        >
                            <option value="all">TODAS LAS SEDES</option>
                            {locations.filter(l => l !== 'all').map(loc => (
                                <option key={loc} value={loc}>Piso {loc}</option>
                            ))}
                        </select>

                        <button
                            onClick={exportToCSV}
                            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-all text-sm font-medium"
                        >
                            <Download size={16} />
                            EXPORTAR CSV
                        </button>

                        <button
                            className="flex items-center gap-2 px-4 py-2 bg-red-700 text-white rounded-md hover:bg-red-800 transition-all text-sm font-medium"
                        >
                            <span>+</span>
                            NUEVO ACTIVO
                        </button>
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
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                onClick={() => handleSort('hostname')}>
                                HOSTNAME
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                DIRECCIÓN IP
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                MAC ADDRESS
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                USUARIO
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                MARCA/MODELO
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                S.O.
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                PROCESADOR
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                RAM
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
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
                                className="hover:bg-gray-50 transition-colors"
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

                                {/* Hostname */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{pc.hostname}</div>
                                </td>

                                {/* IP Address */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <code className="text-xs text-gray-700">{pc.ip_address}</code>
                                </td>

                                {/* MAC Address */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <code className="text-xs text-gray-600">{pc.mac_address || 'N/A'}</code>
                                </td>

                                {/* User */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div>
                                        <div className="text-sm font-medium text-gray-900">{pc.usuario_detectado || 'N/A'}</div>
                                        <div className="text-xs text-gray-500 uppercase">INFORMÁTICA</div>
                                    </div>
                                </td>

                                {/* Brand/Model */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div>
                                        <div className="text-sm font-medium text-gray-900">{pc.marca || 'Dell'}</div>
                                        <div className="text-xs text-gray-500">{pc.modelo || 'Latitude 5420'}</div>
                                    </div>
                                </td>

                                {/* OS */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                        {pc.sistema_operativo || 'WIN 11 PRO'}
                                    </span>
                                </td>

                                {/* Processor */}
                                <td className="px-6 py-4">
                                    <div className="text-xs text-gray-700 max-w-[150px] truncate" title={pc.procesador}>
                                        {pc.procesador || 'i7-1185G7'}
                                    </div>
                                </td>

                                {/* RAM */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-900">{pc.memoria_ram || '16 GB'}</div>
                                </td>

                                {/* Actions */}
                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                    <button className="text-gray-400 hover:text-gray-600 transition-colors">
                                        <Edit2 size={16} />
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
        </motion.div>
    );
}
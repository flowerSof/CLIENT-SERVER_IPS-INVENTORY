import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Monitor, Server, AlertCircle, HardDrive } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export default function InventoryTable() {
    const [activos, setActivos] = useState([]);
    const [loading, setLoading] = useState(true);

    // Cargar datos del servidor
    const fetchAssets = async () => {
        try {
            // Asegúrate que tu backend esté corriendo en el puerto 8000
            const response = await axios.get('http://127.0.0.1:8000/api/assets');
            setActivos(response.data);
            setLoading(false);
        } catch (error) {
            console.error("Error cargando activos:", error);
            setLoading(false);
        }
    };

    // Refrescar automáticamente cada 10 segundos para ver si siguen Online
    useEffect(() => {
        fetchAssets();
        const interval = setInterval(fetchAssets, 10000);
        return () => clearInterval(interval);
    }, []);

    // Función para determinar si está ONLINE (Si reportó hace menos de 5 mins)
    const isOnline = (fechaReporte) => {
        const ultimo = new Date(fechaReporte);
        const ahora = new Date();
        const diferenciaMinutos = (ahora - ultimo) / 1000 / 60;
        return diferenciaMinutos < 5; // Umbral de 5 minutos
    };

    if (loading) return <div className="p-10 text-center">Cargando inventario...</div>;

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th className="px-6 py-3">Estado</th>
                            <th className="px-6 py-3">Hostname / IP</th>
                            <th className="px-6 py-3">Usuario</th>
                            <th className="px-6 py-3">Hardware (CPU/RAM)</th>
                            <th className="px-6 py-3">Sistema Operativo</th>
                            <th className="px-6 py-3">Último Reporte</th>
                        </tr>
                    </thead>
                    <tbody>
                        {activos.map((pc) => {
                            const online = isOnline(pc.ultimo_reporte);

                            return (
                                <tr key={pc.id} className="border-b hover:bg-gray-50">
                                    {/* ESTADO */}
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-3 h-3 rounded-full ${online ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                                            <span className={`font-medium ${online ? 'text-green-700' : 'text-red-700'}`}>
                                                {online ? 'Online' : 'Offline'}
                                            </span>
                                        </div>
                                    </td>

                                    {/* HOSTNAME & IP */}
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-900 flex items-center gap-2">
                                            <Monitor size={16} /> {pc.hostname}
                                        </div>
                                        <div className="text-xs text-gray-400 font-mono mt-1">{pc.ip_address}</div>
                                        <div className="text-[10px] text-gray-300 font-mono">{pc.serial_number}</div>
                                    </td>

                                    {/* USUARIO */}
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-800">{pc.usuario_detectado}</div>
                                        {/* Badge de Dominio */}
                                        {pc.es_dominio ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                Dominio OK
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                                Fuera Dominio
                                            </span>
                                        )}
                                    </td>

                                    {/* HARDWARE */}
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs font-semibold text-gray-600">{pc.marca}</span>
                                            <span className="text-xs text-gray-500 flex items-center gap-1">
                                                <HardDrive size={12} /> {pc.memoria_ram}
                                            </span>
                                            <span className="text-[10px] text-gray-400 truncate max-w-[150px]" title={pc.procesador}>
                                                {pc.procesador}
                                            </span>
                                        </div>
                                    </td>

                                    {/* OS */}
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                                            {pc.sistema_operativo.replace('Microsoft ', '')}
                                        </span>
                                    </td>

                                    {/* TIEMPO */}
                                    <td className="px-6 py-4 text-gray-400 text-xs">
                                        {formatDistanceToNow(parseISO(pc.ultimo_reporte), { addSuffix: true, locale: es })}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Activity, ShieldCheck, AlertTriangle, HardDrive } from 'lucide-react';

export default function StatsWidget() {
    const [stats, setStats] = useState({ total: 0, online: 0, offline: 0, en_dominio: 0, alertas: 0 });

    // Usamos la URL configurada o localhost
    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

    useEffect(() => {
        const fetchStats = () => {
            axios.get(`${API_URL}/api/assets/stats`)
                .then(res => setStats(res.data))
                .catch(err => console.error(err));
        };

        fetchStats();
        const interval = setInterval(fetchStats, 5000); // Actualiza cada 5s
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">

            {/* Tarjeta 1: Total y Online */}
            <div className="bg-white p-4 rounded shadow border-l-4 border-blue-500 flex items-center justify-between">
                <div>
                    <p className="text-gray-500 text-xs uppercase font-bold">Total Activos</p>
                    <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
                    <p className="text-xs text-green-600 font-semibold flex items-center gap-1">
                        <Activity size={12} /> {stats.online} Online
                    </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full text-blue-600">
                    <HardDrive size={24} />
                </div>
            </div>

            {/* Tarjeta 2: Dominio */}
            <div className="bg-white p-4 rounded shadow border-l-4 border-indigo-500 flex items-center justify-between">
                <div>
                    <p className="text-gray-500 text-xs uppercase font-bold">En Dominio</p>
                    <p className="text-2xl font-bold text-gray-800">{stats.en_dominio}</p>
                    <p className="text-xs text-gray-400">
                        {stats.total > 0 ? ((stats.en_dominio / stats.total) * 100).toFixed(0) : 0}% Cumplimiento
                    </p>
                </div>
                <div className="p-3 bg-indigo-100 rounded-full text-indigo-600">
                    <ShieldCheck size={24} />
                </div>
            </div>

            {/* Tarjeta 3: Offline (Alerta) */}
            <div className="bg-white p-4 rounded shadow border-l-4 border-red-500 flex items-center justify-between">
                <div>
                    <p className="text-gray-500 text-xs uppercase font-bold">Críticos / Offline</p>
                    <p className="text-2xl font-bold text-gray-800">{stats.offline}</p>
                    <p className="text-xs text-red-500 font-semibold">Requieren revisión</p>
                </div>
                <div className="p-3 bg-red-100 rounded-full text-red-600">
                    <Activity size={24} />
                </div>
            </div>

            {/* Tarjeta 4: Sin Usuario */}
            <div className="bg-white p-4 rounded shadow border-l-4 border-yellow-500 flex items-center justify-between">
                <div>
                    <p className="text-gray-500 text-xs uppercase font-bold">Sin Usuario</p>
                    <p className="text-2xl font-bold text-gray-800">{stats.alertas}</p>
                    <p className="text-xs text-yellow-600">Posibles vacantes</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-full text-yellow-600">
                    <AlertTriangle size={24} />
                </div>
            </div>

        </div>
    );
}
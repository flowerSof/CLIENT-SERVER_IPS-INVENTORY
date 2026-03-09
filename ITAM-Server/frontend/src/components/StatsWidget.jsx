import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { API_ENDPOINTS } from '../config';
import { Monitor, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export default function StatsWidget() {
    const [stats, setStats] = useState({
        total: 0,
        online: 0,
        offline: 0,
        en_dominio: 0,
        alertas: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchStats = async () => {
        try {
            const response = await axios.get(`${API_ENDPOINTS.ASSETS}/stats`);
            if (response.data && typeof response.data === 'object') {
                setStats(response.data);
            } else {
                console.warn('Received invalid stats data:', response.data);
            }
            setLoading(false);
        } catch (error) {
            console.error('Error fetching stats:', error);
            setLoading(false);
        }
    };

    const statCards = [
        {
            title: 'TOTAL ACTIVOS',
            value: (stats.total || 0).toLocaleString(),
            icon: Monitor,
            color: '#B91C1C',
            bgColor: '#FEE2E2',
            borderColor: '#B91C1C'
        },
        {
            title: 'OPERATIVOS',
            value: (stats.online || 0).toLocaleString(),
            icon: CheckCircle,
            color: '#059669',
            bgColor: '#D1FAE5',
            borderColor: '#059669'
        },
        {
            title: 'NO DISPONIBLES',
            value: (stats.offline || 0).toLocaleString(),
            icon: XCircle,
            color: '#6B7280',
            bgColor: '#F3F4F6',
            borderColor: '#6B7280'
        },
        {
            title: 'ALERTAS CRÍTICAS',
            value: (stats.alertas || 0).toLocaleString(),
            icon: AlertTriangle,
            color: '#F59E0B',
            bgColor: '#FEF3C7',
            borderColor: '#F59E0B'
        }
    ];

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-32 bg-gray-100 rounded-lg animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {statCards.map((card, index) => (
                <motion.div
                    key={card.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white rounded-lg shadow-sm border-l-4 overflow-hidden"
                    style={{ borderLeftColor: card.borderColor }}
                >
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                {card.title}
                            </div>
                            <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center"
                                style={{ backgroundColor: card.bgColor }}
                            >
                                <card.icon size={20} style={{ color: card.color }} />
                            </div>
                        </div>
                        <div className="text-3xl font-bold text-gray-900">
                            {card.value}
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
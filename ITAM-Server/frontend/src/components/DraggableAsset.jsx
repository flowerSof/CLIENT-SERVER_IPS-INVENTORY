import React, { useRef, useState, useEffect } from 'react';
import Draggable from 'react-draggable';
import axios from 'axios';
import AssetIcon from './AssetIcon';
import { MapPinOff, Power, RotateCcw, XCircle, X, Timer, AlertTriangle } from 'lucide-react';
import { API_ENDPOINTS } from '../config';

export default function DraggableAsset({ asset, onStop, onUnassign, disabled = false }) {
    const nodeRef = useRef(null);
    const [showMenu, setShowMenu] = useState(false);
    const [loading, setLoading] = useState(false);
    const [pendingShutdown, setPendingShutdown] = useState(false);
    const [countdown, setCountdown] = useState(0);

    // Auto-clear pendingShutdown después de 60 segundos
    useEffect(() => {
        if (!pendingShutdown) return;

        setCountdown(60);
        const interval = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    setPendingShutdown(false);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [pendingShutdown]);

    const API_ASSETS = API_ENDPOINTS.ASSETS;
    const API_REMOTE = API_ENDPOINTS.REMOTE;

    const handleClick = (e) => {
        e.stopPropagation();
        setShowMenu(!showMenu);
    };

    const closeMenu = () => {
        setShowMenu(false);
    };

    const handleUnassign = async () => {
        setLoading(true);
        try {
            await axios.delete(`${API_ASSETS}/${asset.serial_number}/position`);
            if (onUnassign) onUnassign(asset);
        } catch (error) {
            console.error('Error al quitar ubicación:', error);
            alert('Error al quitar la ubicación del activo');
        } finally {
            setLoading(false);
            closeMenu();
        }
    };

    const handleShutdown = async () => {
        if (!window.confirm(`¿Seguro que deseas APAGAR ${asset.hostname}?\n\nEl usuario tendrá 60 segundos para cancelar.`)) {
            closeMenu();
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post(`${API_REMOTE}/${asset.id}/shutdown`);
            if (response.data.success) {
                alert(`✅ ${response.data.message}\n\nEl evento fue registrado en notificaciones.`);
                setPendingShutdown(true);
            } else {
                alert(`⚠️ ${response.data.message}\n\nEl intento fue registrado en notificaciones como fallido.`);
            }
        } catch (error) {
            const msg = error.response?.data?.detail || 'Error al enviar comando';
            alert(`Error: ${msg}`);
        } finally {
            setLoading(false);
            closeMenu();
        }
    };

    const handleRestart = async () => {
        if (!window.confirm(`¿Seguro que deseas REINICIAR ${asset.hostname}?\n\nEl usuario tendrá 60 segundos para cancelar.`)) {
            closeMenu();
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post(`${API_REMOTE}/${asset.id}/restart`);
            if (response.data.success) {
                alert(`✅ ${response.data.message}\n\nEl evento fue registrado en notificaciones.`);
                setPendingShutdown(true);
            } else {
                alert(`⚠️ ${response.data.message}\n\nEl intento fue registrado en notificaciones como fallido.`);
            }
        } catch (error) {
            const msg = error.response?.data?.detail || 'Error al enviar comando';
            alert(`Error: ${msg}`);
        } finally {
            setLoading(false);
            closeMenu();
        }
    };

    const handleCancelShutdown = async () => {
        setLoading(true);
        try {
            const response = await axios.post(`${API_REMOTE}/${asset.id}/cancel`);
            if (response.data.success) {
                alert(`✅ ${response.data.message}`);
                setPendingShutdown(false);
                setCountdown(0);
            } else {
                alert(`⚠️ ${response.data.message}`);
            }
        } catch (error) {
            const msg = error.response?.data?.detail || 'Error al cancelar';
            alert(`Error: ${msg}`);
        } finally {
            setLoading(false);
            closeMenu();
        }
    };

    // Determinar si este activo tiene alerta crítica
    const hasAlert = asset.has_alert;

    return (
        <>
            <Draggable
                nodeRef={nodeRef}
                bounds="parent"
                disabled={disabled}
                onStop={(e, data) => onStop && onStop(e, data, asset)}
            >
                <div
                    ref={nodeRef}
                    className={`draggable-asset absolute cursor-pointer flex flex-col items-center group z-20 hover:z-30`}
                    style={{
                        left: `${asset.pos_x}%`,
                        top: `${asset.pos_y}%`,
                        transform: 'translate(-50%, -50%)'
                    }}
                    onClick={handleClick}
                >
                    <div className={`p-1.5 rounded-full shadow-md border-2 transition-all hover:scale-110 ${showMenu ? 'scale-125 ring-4 ring-blue-400' : ''
                        } ${hasAlert
                            ? 'bg-yellow-50 border-yellow-400 text-yellow-600 ring-2 ring-yellow-300/50'
                            : asset.is_online
                                ? 'bg-white border-green-500 text-green-600'
                                : 'bg-white border-red-500 text-red-600'
                        } ${asset.es_dominio && !hasAlert ? 'ring-2 ring-blue-100' : ''} ${pendingShutdown ? 'animate-pulse border-orange-500 text-orange-600' : ''}`}
                        style={hasAlert && !pendingShutdown ? { boxShadow: '0 0 8px 2px rgba(251, 191, 36, 0.45)' } : {}}
                    >
                        <AssetIcon tipo={asset.icono_tipo} size={20} isOnline={asset.is_online} />
                    </div>

                    {/* Alert badge */}
                    {hasAlert && !pendingShutdown && (
                        <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 rounded-full w-5 h-5 flex items-center justify-center" title="Alerta crítica">
                            <AlertTriangle size={11} />
                        </div>
                    )}

                    {/* Countdown badge */}
                    {pendingShutdown && (
                        <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-[9px] font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                            {countdown}
                        </div>
                    )}

                    {/* Tooltip Label */}
                    <div className="absolute top-full mt-1 px-2 py-0.5 bg-gray-900/90 text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        {asset.hostname} {pendingShutdown ? `• Apagando en ${countdown}s` : hasAlert ? '• ⚠ Alerta crítica' : '• Click para opciones'}
                    </div>

                    {/* Menu desplegable al seleccionar */}
                    {showMenu && (
                        <div
                            className="absolute top-full mt-2 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[180px] z-50"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="px-3 py-2 border-b border-gray-100 flex justify-between items-center">
                                <div>
                                    <div className="font-semibold text-gray-900 text-sm truncate">{asset.hostname}</div>
                                    <div className="text-xs text-gray-500">{asset.ip_address}</div>
                                </div>
                                <button
                                    onClick={closeMenu}
                                    className="p-1 hover:bg-gray-100 rounded text-gray-400"
                                >
                                    <X size={14} />
                                </button>
                            </div>

                            {/* Globo de alerta crítica */}
                            {hasAlert && asset.alert_reasons?.length > 0 && (
                                <div className="mx-3 my-2 p-2.5 bg-yellow-50 border border-yellow-300 rounded-lg">
                                    <div className="flex items-center gap-1.5 text-yellow-700 text-xs font-bold mb-1">
                                        <AlertTriangle size={12} />
                                        ALERTA CRÍTICA
                                    </div>
                                    {asset.alert_reasons.map((reason, i) => (
                                        <div key={i} className="text-xs text-yellow-600 pl-4">• {reason}</div>
                                    ))}
                                </div>
                            )}

                            <div className="py-1">
                                {/* Quitar del mapa */}
                                <button
                                    onClick={handleUnassign}
                                    disabled={loading}
                                    className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-50 text-gray-700 disabled:opacity-50"
                                >
                                    <MapPinOff size={16} className="text-orange-500" />
                                    Quitar del mapa
                                </button>

                                <div className="h-px bg-gray-100 my-1" />

                                {/* Comandos remotos - solo si está online */}
                                {asset.is_online ? (
                                    <>
                                        <button
                                            onClick={handleShutdown}
                                            disabled={loading || pendingShutdown}
                                            className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-red-50 text-red-600 disabled:opacity-50"
                                        >
                                            <Power size={16} />
                                            Apagar PC
                                        </button>
                                        <button
                                            onClick={handleRestart}
                                            disabled={loading || pendingShutdown}
                                            className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-blue-50 text-blue-600 disabled:opacity-50"
                                        >
                                            <RotateCcw size={16} />
                                            Reiniciar PC
                                        </button>

                                        {/* Cancelar SOLO si hay un shutdown/restart pendiente */}
                                        {pendingShutdown && (
                                            <button
                                                onClick={handleCancelShutdown}
                                                disabled={loading}
                                                className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-green-50 text-green-600 disabled:opacity-50 border-t border-gray-100"
                                            >
                                                <XCircle size={16} />
                                                Cancelar apagado ({countdown}s)
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <div className="px-3 py-2 text-xs text-gray-400 italic">
                                        PC offline - comandos no disponibles
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </Draggable>

            {/* Overlay para cerrar el menú al hacer click fuera */}
            {showMenu && (
                <div
                    className="fixed inset-0 z-10"
                    onClick={closeMenu}
                />
            )}
        </>
    );
}

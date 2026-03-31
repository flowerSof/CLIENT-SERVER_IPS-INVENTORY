import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { API_ENDPOINTS } from '../config';
import DraggableAsset from './DraggableAsset';
import {
    ZoomIn, ZoomOut, Maximize2, Grid3x3, Plus, Settings, Upload, Save, Search
} from 'lucide-react';
import AssetIcon from './AssetIcon';
import useRealTimeAssets from '../hooks/useRealTimeAssets';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function MapView({ readOnly = false }) {
    const { activos, loading: assetsLoading } = useRealTimeAssets();
    const location = useLocation();
    const navigate = useNavigate();
    const { filterBuildingsByPermission, filterFloorsByPermission } = useAuth();
    const [edificios, setEdificios] = useState([]);
    const [pisos, setPisos] = useState([]);
    const [selectedEdificio, setSelectedEdificio] = useState(() => {
        // Prioritize navigation state (coming from Inventory 'Ver en mapa')
        if (window.history.state?.usr?.edificioId) {
            return window.history.state.usr.edificioId;
        }
        const saved = localStorage.getItem('map_selectedEdificio');
        return saved ? parseInt(saved) : null;
    });
    const [selectedPiso, setSelectedPiso] = useState(() => {
        // Prioritize navigation state
        if (window.history.state?.usr?.pisoId) {
            return window.history.state.usr.pisoId;
        }
        const saved = localStorage.getItem('map_selectedPiso');
        return saved ? parseInt(saved) : null;
    });
    const [pisoImage, setPisoImage] = useState(null);
    const [zoom, setZoom] = useState(1);
    const [showGrid, setShowGrid] = useState(false);
    const [loadingImage, setLoadingImage] = useState(false);
    const [sidebarSearch, setSidebarSearch] = useState(''); // search in unplaced PC list

    // Referencia al contenedor del mapa para cálculos de coordenadas
    const mapContainerRef = useRef(null);

    const API_BUILDINGS = API_ENDPOINTS.BUILDINGS;
    const API_FLOORS = API_ENDPOINTS.FLOORS;
    const API_ASSETS = API_ENDPOINTS.ASSETS;

    useEffect(() => {
        loadBuildings();
    }, []);

    useEffect(() => {
        if (selectedEdificio) {
            localStorage.setItem('map_selectedEdificio', selectedEdificio);
            loadFloorsByBuilding(selectedEdificio);
        }
    }, [selectedEdificio]);

    useEffect(() => {
        if (selectedPiso) {
            localStorage.setItem('map_selectedPiso', selectedPiso);
            loadFloorImage(selectedPiso);
        }
    }, [selectedPiso]);

    const loadBuildings = async () => {
        try {
            const response = await axios.get(API_BUILDINGS);
            const filtered = filterBuildingsByPermission(response.data);
            setEdificios(filtered);

            // Si venimos de otra vista con un edificio específico
            if (location.state?.edificioId) {
                setSelectedEdificio(location.state.edificioId);
            } else if (!selectedEdificio && filtered.length > 0) {
                setSelectedEdificio(filtered[0].id);
            } else if (selectedEdificio && !filtered.some(e => e.id === selectedEdificio) && filtered.length > 0) {
                setSelectedEdificio(filtered[0].id);
            }
        } catch (error) {
            console.error('Error loading buildings:', error);
        }
    };

    const loadFloorsByBuilding = async (edificioId) => {
        try {
            const response = await axios.get(`${API_BUILDINGS}/${edificioId}/floors`);
            const filtered = filterFloorsByPermission(response.data, edificioId);
            setPisos(filtered);

            // Si venimos de otra vista con un piso específico y pertenece al edificio seleccionado
            if (location.state?.pisoId && location.state?.edificioId === edificioId) {
                setSelectedPiso(location.state.pisoId);
            } else if (selectedPiso && filtered.some(p => p.id === selectedPiso)) {
                loadFloorImage(selectedPiso);
            } else if (filtered.length > 0) {
                setSelectedPiso(filtered[0].id);
            } else {
                setSelectedPiso(null);
                setPisoImage(null);
            }
        } catch (error) {
            console.error('Error loading floors:', error);
            setPisos([]);
        }
    };

    const loadFloorImage = async (pisoId) => {
        setLoadingImage(true);
        try {
            const response = await axios.get(`${API_FLOORS}/${pisoId}/image`);
            setPisoImage(response.data.mapa_imagen);
        } catch (error) {
            console.error('Error loading floor image:', error);
            setPisoImage('/default_floor_plan.png');
        } finally {
            setLoadingImage(false);
        }
    };

    // --- MANEJO DE DRAG & DROP ---

    // 1. Guardar posición al soltar (desde la lista o moviendo en el mapa)
    const savePosition = async (serial, x, y, pisoId) => {
        try {
            await axios.put(`${API_ASSETS}/${serial}/position`, {
                pos_x: x,
                pos_y: y,
                piso_id: pisoId
            });
            console.log(`Posición guardada para ${serial}: ${x}%, ${y}%`);
            // Nota: useRealTimeAssets actualizará la posición visualmente en el próximo polling
        } catch (error) {
            console.error('Error guardando posición:', error);
            alert('Error al guardar la posición del activo');
        }
    };

    // 2. Manejador para soltar un activo NUEVO (desde la lista)
    const handleDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (readOnly) return;

        // Obtener datos del activo arrastrado
        const assetData = e.dataTransfer.getData('asset');
        if (!assetData) return;

        const asset = JSON.parse(assetData);

        // Calcular coordenadas relativas al contenedor del mapa (imagen)
        if (mapContainerRef.current) {
            const rect = mapContainerRef.current.getBoundingClientRect();

            // X e Y relativos al rect del mapa
            // Restamos el offset del zoom para obtener la posición "real" base
            const x = (e.clientX - rect.left) / zoom;
            const y = (e.clientY - rect.top) / zoom;

            // Convertir a porcentaje (0-100%) para persistencia responsive
            // Usamos width y height NATURALES del contenedor sin zoom
            const width = rect.width / zoom;
            const height = rect.height / zoom;

            const xPercent = (x / width) * 100;
            const yPercent = (y / height) * 100;

            // Validar límites
            if (xPercent >= 0 && xPercent <= 100 && yPercent >= 0 && yPercent <= 100) {
                await savePosition(asset.serial_number, xPercent, yPercent, selectedPiso);
            }
        }
    };

    // 3. Configurar datos al iniciar arrastre desde la lista
    const handleDragStart = (e, asset) => {
        if (readOnly) {
            e.preventDefault();
            return;
        }
        try {
            e.dataTransfer.setData('asset', JSON.stringify(asset));
            e.dataTransfer.effectAllowed = 'move';
        } catch (error) {
            console.error("Error setting drag data", error);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault(); // Necesario para permitir el drop
        if (readOnly) {
            e.dataTransfer.dropEffect = 'none';
            return;
        }
        e.dataTransfer.dropEffect = 'move';
    };

    // 4. Manejador para mover activo EXISTENTE en el mapa
    const handleStopDrag = async (e, data, asset) => {
        // data.x y data.y son pixeles relativos al padre
        if (mapContainerRef.current) {
            const rect = mapContainerRef.current.getBoundingClientRect();
            const width = rect.width / zoom;
            const height = rect.height / zoom;

            // Obtener posición actual en porcentaje
            // React-Draggable usa transform translate, necesitamos calcular la nueva posición base
            // Pero como estamos usando posición absoluta en % para renderizar, 
            // necesitamos calcular el NUEVO porcentaje sumando el delta del arrastre

            // Simplificación: Usamos las coordenadas del evento del mouse al soltar para recalcular todo
            // Es más robusto que sumar deltas acumulativos

            // NOTA: React-Draggable 'data' nos da x, y del elemento.
            // Si el elemento está posicionado con left: X%, top: Y%, 
            // data.x y data.y son el DESPLAZAMIENTO desde esa posición original.

            // Vamos a calcular la nueva posición absoluta basada en el elemento DOM final
            // O usar el cálculo inverso de pixeles a porcentaje

            const target = e.target.closest('.draggable-asset');
            if (target) {
                // Esta lógica puede ser compleja con zooms.
                // Alternativa: Calcular porcentaje basado en la posición visual final
                const parentRect = mapContainerRef.current.getBoundingClientRect();
                const elementRect = target.getBoundingClientRect();

                // Centro del elemento
                const elementCenterX = elementRect.left + elementRect.width / 2;
                const elementCenterY = elementRect.top + elementRect.height / 2;

                const relativeX = (elementCenterX - parentRect.left) / zoom;
                const relativeY = (elementCenterY - parentRect.top) / zoom;

                const xPercent = (relativeX / width) * 100;
                const yPercent = (relativeY / height) * 100;

                await savePosition(asset.serial_number, xPercent, yPercent, selectedPiso);
            }
        }
    };

    // ---------------------------

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 3));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5));
    const handleResetZoom = () => setZoom(1);

    const activosEnPiso = activos.filter(pc => pc.piso_id === selectedPiso);

    // Filter unplaced assets by sidebar search term
    const activosSinAsignarBase = activos.filter(pc => !pc.piso_id);
    const activosSinAsignar = sidebarSearch.trim()
        ? activosSinAsignarBase.filter(pc =>
            pc.hostname?.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
            pc.usuario_detectado?.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
            pc.ip_address?.includes(sidebarSearch) ||
            pc.area?.toLowerCase().includes(sidebarSearch.toLowerCase())
          )
        : activosSinAsignarBase;

    const onlineCount = activosEnPiso.filter(a => a.is_online).length;
    const offlineCount = activosEnPiso.filter(a => !a.is_online).length;
    const totalEquipos = activosEnPiso.length;

    if (assetsLoading) {
        return (
            <div className="h-[600px] bg-white rounded-lg shadow flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-700 mx-auto mb-4" />
                    <p className="text-gray-600">Cargando mapa...</p>
                </div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-6 h-[calc(100vh-140px)]"
        >
            {/* Left Sidebar */}
            <div className="w-[280px] flex-shrink-0 space-y-4 flex flex-col h-full overflow-hidden">
                {/* Floor Selection Card */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3 flex items-center gap-2">
                        <Settings size={14} className="text-red-700" />
                        CONFIGURACIÓN
                    </h3>

                    <div className="space-y-3">
                        <div>
                            <select
                                value={selectedEdificio || ''}
                                onChange={(e) => setSelectedEdificio(parseInt(e.target.value))}
                                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs bg-gray-50 focus:ring-1 focus:ring-red-500"
                            >
                                <option value="">Seleccionar edificio...</option>
                                {edificios.map(edificio => (
                                    <option key={edificio.id} value={edificio.id}>
                                        {edificio.nombre}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <select
                                value={selectedPiso || ''}
                                onChange={(e) => setSelectedPiso(parseInt(e.target.value))}
                                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs bg-gray-50 focus:ring-1 focus:ring-red-500"
                                disabled={!selectedEdificio || pisos.length === 0}
                            >
                                <option value="">Seleccionar piso...</option>
                                {pisos.map(piso => (
                                    <option key={piso.id} value={piso.id}>
                                        {piso.nombre}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button
                            onClick={() => navigate('/floors')}
                            className="w-full py-1.5 bg-white border border-gray-300 rounded text-xs hover:bg-gray-50 text-gray-600"
                        >
                            Gestionar Pisos
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 grid grid-cols-2 gap-2 text-center">
                    <div className="bg-green-50 p-2 rounded border border-green-100">
                        <div className="text-lg font-bold text-green-700 leading-none">{onlineCount}</div>
                        <div className="text-[10px] text-green-600 font-bold mt-1">ONLINE</div>
                    </div>
                    <div className="bg-red-50 p-2 rounded border border-red-100">
                        <div className="text-lg font-bold text-red-700 leading-none">{offlineCount}</div>
                        <div className="text-[10px] text-red-600 font-bold mt-1">OFFLINE</div>
                    </div>
                </div>

                {/* Unassigned Assets List - DRAGGABLE SOURCE */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 flex flex-col min-h-0">
                    <div className="p-3 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-lg">
                        <h3 className="text-xs font-bold text-gray-700 uppercase">
                            SIN UBICAR ({activosSinAsignar.length}/{activosSinAsignarBase.length})
                        </h3>
                    </div>

                    {/* Search box */}
                    <div className="px-2 pt-2 flex-shrink-0">
                        <div className="relative">
                            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar hostname, usuario, IP..."
                                value={sidebarSearch}
                                onChange={(e) => setSidebarSearch(e.target.value)}
                                className="w-full pl-6 pr-2 py-1.5 text-[11px] border border-gray-200 rounded focus:ring-1 focus:ring-red-400 focus:border-red-400 bg-white"
                            />
                        </div>
                    </div>

                    <div className="p-2 overflow-y-auto flex-1 space-y-2 custom-scrollbar">
                        {activosSinAsignar.length === 0 && (
                            <div className="text-center py-8 text-gray-400 text-xs italic">
                                Todos los equipos están ubicados.
                            </div>
                        )}
                        {activosSinAsignar.map((asset) => (
                            <div
                                key={asset.id}
                                className={`flex items-center gap-2 p-2 rounded border cursor-grab active:cursor-grabbing transition-all group ${
                                    asset.has_alert
                                        ? 'bg-yellow-50 border-yellow-300 hover:border-yellow-400 hover:shadow-sm'
                                        : 'bg-white border-gray-200 hover:border-red-300 hover:shadow-sm'
                                }`}
                                draggable={!readOnly}
                                onDragStart={(e) => !readOnly && handleDragStart(e, asset)}
                                title={asset.has_alert ? `⚠ ${asset.alert_reasons?.join(', ')}` : ''}
                            >
                                <div className={`p-1.5 rounded transition-colors ${
                                    asset.has_alert
                                        ? 'bg-yellow-100 text-yellow-600 group-hover:bg-yellow-200'
                                        : 'bg-gray-50 text-gray-500 group-hover:bg-red-50 group-hover:text-red-600'
                                }`}>
                                    <AssetIcon tipo={asset.icono_tipo} isOnline={asset.is_online} size={16} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-bold text-gray-800 truncate flex items-center gap-1">
                                        {asset.hostname}
                                        {asset.has_alert && <span className="text-yellow-500 text-[10px]">⚠</span>}
                                    </div>
                                    <div className="text-[10px] text-gray-500 truncate flex items-center gap-1">
                                        <span className={`w-1.5 h-1.5 rounded-full ${asset.is_online ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                        {asset.serial_number}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Map Area - DROP TARGET */}
            <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col overflow-hidden relative">

                {/* Map Toolbar */}
                <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 bg-white p-1 rounded-lg shadow-md border border-gray-100">
                    <button onClick={handleZoomIn} className="p-2 hover:bg-gray-100 rounded text-gray-600 hover:text-red-700" title="Acercar">
                        <ZoomIn size={18} />
                    </button>
                    <button onClick={handleZoomOut} className="p-2 hover:bg-gray-100 rounded text-gray-600 hover:text-red-700" title="Alejar">
                        <ZoomOut size={18} />
                    </button>
                    <button onClick={handleResetZoom} className="p-2 hover:bg-gray-100 rounded text-gray-600 hover:text-red-700" title="Restaurar">
                        <Maximize2 size={18} />
                    </button>
                    <div className="h-px bg-gray-200 my-1"></div>
                    <button
                        onClick={() => setShowGrid(!showGrid)}
                        className={`p-2 rounded text-gray-600 hover:text-red-700 ${showGrid ? 'bg-red-50 text-red-700 border border-red-200' : 'hover:bg-gray-100'}`}
                        title="Cuadricula"
                    >
                        <Grid3x3 size={18} />
                    </button>
                </div>

                {/* Map Viewport */}
                <div className="flex-1 overflow-hidden relative bg-slate-50 flex items-center justify-center">
                    {loadingImage ? (
                        <div className="flex flex-col items-center">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-700 mb-2" />
                            <span className="text-xs text-gray-500">Cargando plano...</span>
                        </div>
                    ) : (
                        <div
                            className="relative shadow-xl overflow-hidden bg-white transition-transform duration-200 ease-out"
                            style={{
                                transform: `scale(${zoom})`,
                                width: '100%',
                                height: '100%',
                            }}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                            ref={mapContainerRef}
                        >
                            {pisoImage ? (
                                <>
                                    <img
                                        src={pisoImage}
                                        alt="Floor Plan"
                                        className="pointer-events-none select-none block w-full h-full object-contain"
                                        style={{ userDrag: 'none' }}
                                    />

                                    {/* Grid Overlay */}
                                    {showGrid && (
                                        <div
                                            className="absolute inset-0 pointer-events-none opacity-20"
                                            style={{
                                                backgroundImage: `linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)`,
                                                backgroundSize: '40px 40px'
                                            }}
                                        ></div>
                                    )}

                                    {/* PLACED ASSETS */}
                                    {/* PLACED ASSETS */}
                                    {activosEnPiso.map((asset) => (
                                        <DraggableAsset
                                            key={asset.id}
                                            asset={asset}
                                            onStop={readOnly ? undefined : handleStopDrag}
                                            disabled={readOnly}
                                        />
                                    ))}
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-[500px] w-[800px] border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                                    <Upload size={48} className="text-gray-300 mb-4" />
                                    <p className="text-gray-500 font-medium">Seleccione un piso con plano cargado</p>
                                    <button
                                        onClick={() => navigate('/floors')}
                                        className="mt-4 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm font-medium shadow-sm"
                                    >
                                        Subir Plano
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
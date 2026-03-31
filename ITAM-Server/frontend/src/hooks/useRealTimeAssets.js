import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_ENDPOINTS } from '../config';
import { useAuth } from '../AuthContext';

/**
 * Custom hook for real-time asset monitoring
 * Polls the API every 30 seconds to get updated asset data
 * Filters assets based on user building/floor permissions
 */
export default function useRealTimeAssets(refreshInterval = 30000) {
    const [activos, setActivos] = useState([]);
    const [allActivos, setAllActivos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [pisosData, setPisosData] = useState([]);

    const { user } = useAuth();

    const API_URL = API_ENDPOINTS.ASSETS;

    // Fetch pisos once for hostname-to-floor mapping
    useEffect(() => {
        const fetchPisos = async () => {
            try {
                const res = await axios.get(API_ENDPOINTS.FLOORS);
                setPisosData(res.data);
            } catch (err) {
                console.error('Error fetching pisos for filtering:', err);
            }
        };
        fetchPisos();
    }, []);

    // Filter assets based on user permissions
    const filterByPermissions = useCallback((assets) => {
        if (!user) return [];
        if (user.es_superadmin) return assets;

        // Get allowed piso IDs from user permisos
        const allowedPisoIds = new Set();
        const allowedEdificioIds = new Set();

        (user.permisos || []).forEach(p => {
            allowedEdificioIds.add(p.edificio_id);
            if (p.piso_id) {
                allowedPisoIds.add(p.piso_id);
            } else {
                // Permiso a edificio completo → agregar todos sus pisos
                pisosData
                    .filter(piso => piso.edificio_id === p.edificio_id)
                    .forEach(piso => allowedPisoIds.add(piso.id));
            }
        });

        // Get allowed floor niveles for hostname matching
        const allowedNiveles = new Set();
        pisosData
            .filter(p => allowedPisoIds.has(p.id))
            .forEach(p => {
                // Pad nivel to 2 digits to match hostname format (e.g., 02)
                const nivelStr = String(p.nivel).padStart(2, '0');
                allowedNiveles.add(nivelStr);
            });

        return assets.filter(asset => {
            // PC has piso_id assigned → check if that piso is allowed
            if (asset.piso_id) {
                return allowedPisoIds.has(asset.piso_id);
            }

            // Unplaced domain PC → match hostname floor code (positions 4-5)
            if (asset.es_dominio && asset.hostname && asset.hostname.length >= 6) {
                const hostnameClean = asset.hostname.toUpperCase().replace(/-/g, '');
                if (hostnameClean.length >= 6) {
                    const pisoCode = hostnameClean.substring(4, 6);
                    return allowedNiveles.has(pisoCode);
                }
            }

            // Non-domain PCs without piso: show to all authenticated users
            if (!asset.es_dominio) return true;

            return false;
        });
    }, [user, pisosData]);

    const fetchAssets = async () => {
        try {
            const response = await axios.get(API_URL);
            setAllActivos(response.data);
            setLastUpdate(new Date());
            setError(null);

            if (loading) setLoading(false);
        } catch (err) {
            console.error('Error fetching assets:', err);
            setError(err.message);
            setLoading(false);
        }
    };

    // Re-filter when raw data or permissions change
    useEffect(() => {
        setActivos(filterByPermissions(allActivos));
    }, [allActivos, filterByPermissions]);

    useEffect(() => {
        // Initial fetch
        fetchAssets();

        // Set up polling
        const interval = setInterval(fetchAssets, refreshInterval);

        // Cleanup
        return () => clearInterval(interval);
    }, [refreshInterval]);

    return {
        activos,
        loading,
        error,
        lastUpdate,
        refresh: fetchAssets
    };
}

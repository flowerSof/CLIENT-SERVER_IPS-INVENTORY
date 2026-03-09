import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_ENDPOINTS } from '../config';

/**
 * Custom hook for real-time asset monitoring
 * Polls the API every 30 seconds to get updated asset data
 */
export default function useRealTimeAssets(refreshInterval = 30000) {
    const [activos, setActivos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(null);

    const API_URL = API_ENDPOINTS.ASSETS;

    const fetchAssets = async () => {
        try {
            const response = await axios.get(API_URL);
            setActivos(response.data);
            setLastUpdate(new Date());
            setError(null);

            if (loading) setLoading(false);
        } catch (err) {
            console.error('Error fetching assets:', err);
            setError(err.message);
            setLoading(false);
        }
    };

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

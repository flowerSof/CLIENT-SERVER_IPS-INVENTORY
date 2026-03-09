import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, Save, X, Edit2 } from 'lucide-react';
import { API_ENDPOINTS } from '../config';

export default function CatalogManager({ category, title }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [newItem, setNewItem] = useState({ code: '', description: '' });

    useEffect(() => {
        fetchItems();
    }, [category]);

    const fetchItems = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_ENDPOINTS.CATALOGS}/${category}`);
            setItems(res.data);
        } catch (error) {
            console.error("Error fetching catalog:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await axios.post(API_ENDPOINTS.CATALOGS, {
                category,
                code: newItem.code,
                description: newItem.description
            });
            fetchItems();
            setNewItem({ code: '', description: '' });
        } catch (error) {
            alert("Error al crear. Verifica que el código no exista.");
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("¿Estás seguro de eliminar este item?")) return;
        try {
            await axios.delete(`${API_ENDPOINTS.CATALOGS}/${id}`);
            fetchItems();
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 h-full flex flex-col">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-sm">
                    {category.substring(0, 2)}
                </span>
                {title}
            </h3>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-2 mb-4 pr-2">
                {loading ? (
                    <div className="animate-pulse space-y-2">
                        {[1, 2, 3].map(i => <div key={i} className="h-10 bg-gray-100 rounded-lg"></div>)}
                    </div>
                ) : (
                    items.map(item => (
                        <div key={item.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-xl border border-transparent hover:border-gray-200 transition-all group">
                            <div>
                                <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded text-sm mr-2">
                                    {item.code}
                                </span>
                                <span className="text-gray-700 font-medium">{item.description}</span>
                            </div>
                            <button
                                onClick={() => handleDelete(item.id)}
                                className="opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))
                )}
                {items.length === 0 && !loading && (
                    <div className="text-center py-8 text-gray-400 text-sm">
                        No hay registros
                    </div>
                )}
            </div>

            {/* Form */}
            <form onSubmit={handleCreate} className="pt-4 border-t border-gray-100">
                <div className="flex gap-2 mb-2">
                    <input
                        type="text"
                        placeholder="Código (ej: 04)"
                        className="w-1/3 px-3 py-2 border border-gray-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                        value={newItem.code}
                        onChange={e => setNewItem({ ...newItem, code: e.target.value.toUpperCase() })}
                        maxLength={4}
                        required
                    />
                    <input
                        type="text"
                        placeholder="Descripción"
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        value={newItem.description}
                        onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                        required
                    />
                </div>
                <button
                    type="submit"
                    className="w-full py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors text-sm font-bold flex items-center justify-center gap-2"
                >
                    <Plus size={16} /> Agregar
                </button>
            </form>
        </div>
    );
}

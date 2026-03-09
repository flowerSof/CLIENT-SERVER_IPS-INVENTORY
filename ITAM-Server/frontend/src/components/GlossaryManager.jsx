import React, { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";

import { API_BASE_URL } from '../config';

const API_URL = import.meta.env.VITE_API_URL || API_BASE_URL;

const GlossaryManager = () => {
    const { token } = useAuth();
    const [items, setItems] = useState([]);
    const [activeTab, setActiveTab] = useState("DISTRITO");
    const [loading, setLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({ code: "", description: "" });
    const [editingId, setEditingId] = useState(null);

    // Parser Tester State
    const [testHostname, setTestHostname] = useState("");
    const [parseResult, setParseResult] = useState(null);

    const categories = ["DISTRITO", "SEDE", "TIPO", "OOJJ"];

    useEffect(() => {
        fetchItems();
    }, [activeTab]);

    const fetchItems = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/glossary/category/${activeTab}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setItems(data);
            }
        } catch (error) {
            console.error("Error fetching glossary:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const url = editingId
            ? `${API_URL}/api/glossary/${editingId}`
            : `${API_URL}/api/glossary/`;

        const method = editingId ? "PUT" : "POST";
        const body = { ...formData, category: activeTab };

        try {
            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(body),
            });

            if (res.ok) {
                setFormData({ code: "", description: "" });
                setEditingId(null);
                fetchItems();
            } else {
                alert("Error saving item");
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("¿Eliminar este ítem?")) return;
        try {
            await fetch(`${API_URL}/api/glossary/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            fetchItems();
        } catch (error) {
            console.error(error);
        }
    };

    const handleEdit = (item) => {
        setFormData({ code: item.code, description: item.description });
        setEditingId(item.id);
    };

    const testParser = async () => {
        try {
            const res = await fetch(`${API_URL}/api/glossary/parse-hostname?hostname=${testHostname}`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            setParseResult(data);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="p-4 bg-white rounded shadow h-full flex flex-col">
            <h2 className="text-xl font-bold mb-4">Glosario de Abreviaturas</h2>

            {/* Categories Tabs */}
            <div className="flex border-b mb-4">
                {categories.map((cat) => (
                    <button
                        key={cat}
                        onClick={() => { setActiveTab(cat); setEditingId(null); setFormData({ code: "", description: "" }); }}
                        className={`px-4 py-2 ${activeTab === cat ? "border-b-2 border-blue-600 font-bold text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            <div className="flex gap-6 h-full overflow-hidden">
                {/* Left: List & Form */}
                <div className="flex-1 flex flex-col h-full overflow-hidden">
                    {/* Form */}
                    <form onSubmit={handleSubmit} className="mb-4 flex gap-2">
                        <input
                            type="text"
                            placeholder="Código (ej: 04)"
                            value={formData.code}
                            onChange={e => setFormData({ ...formData, code: e.target.value })}
                            className="border p-2 rounded w-24 uppercase"
                            required
                        />
                        <input
                            type="text"
                            placeholder="Descripción (ej: Corte de Arequipa)"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="border p-2 rounded flex-1"
                            required
                        />
                        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
                            {editingId ? "Actualizar" : "Agregar"}
                        </button>
                        {editingId && (
                            <button
                                type="button"
                                onClick={() => { setEditingId(null); setFormData({ code: "", description: "" }); }}
                                className="bg-gray-400 text-white px-4 py-2 rounded"
                            >
                                Cancelar
                            </button>
                        )}
                    </form>

                    {/* List */}
                    <div className="flex-1 overflow-auto border rounded">
                        <table className="w-full text-left">
                            <thead className="bg-gray-100 sticky top-0">
                                <tr>
                                    <th className="p-2">Código</th>
                                    <th className="p-2">Descripción</th>
                                    <th className="p-2 w-20">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map(item => (
                                    <tr key={item.id} className="border-b hover:bg-gray-50">
                                        <td className="p-2 font-mono font-bold text-blue-800">{item.code}</td>
                                        <td className="p-2">{item.description}</td>
                                        <td className="p-2 flex gap-2">
                                            <button onClick={() => handleEdit(item)} className="text-yellow-600 hover:text-yellow-800">✏️</button>
                                            <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800">🗑️</button>
                                        </td>
                                    </tr>
                                ))}
                                {items.length === 0 && !loading && (
                                    <tr><td colSpan="3" className="p-4 text-center text-gray-500">No hay registros</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right: Tester */}
                <div className="w-1/3 border-l pl-4 flex flex-col">
                    <h3 className="font-bold mb-2">Probador de Hostname</h3>
                    <div className="bg-gray-50 p-4 rounded border">
                        <p className="text-xs text-gray-500 mb-2">Simula como se interpretará un hostname.</p>
                        <div className="flex gap-2 mb-2">
                            <input
                                type="text"
                                placeholder="042502L03SCSA04"
                                value={testHostname}
                                onChange={e => setTestHostname(e.target.value)}
                                className="border p-2 rounded w-full uppercase font-mono"
                            />
                            <button onClick={testParser} className="bg-green-600 text-white px-3 rounded">Test</button>
                        </div>

                        {parseResult && (
                            <div className="text-sm mt-4">
                                <div className={`p-2 rounded mb-2 text-white text-center font-bold ${parseResult.is_domain ? "bg-green-500" : "bg-gray-500"}`}>
                                    {parseResult.is_domain ? "✅ EN DOMINIO" : "⚠️ NO DOMINIO / FORMATO INVÁLIDO"}
                                </div>

                                {parseResult.valid_format && (
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="font-bold">Distrito ({parseResult.parts.distrito_code}):</div>
                                        <div>{parseResult.decoded.distrito || <span className="text-red-500">Desconocido</span>}</div>

                                        <div className="font-bold">Sede ({parseResult.parts.sede_code}):</div>
                                        <div>{parseResult.decoded.sede || <span className="text-red-500">Desconocido</span>}</div>

                                        <div className="font-bold">Piso ({parseResult.parts.piso_val}):</div>
                                        <div>{parseResult.parts.piso_val}</div>

                                        <div className="font-bold">Tipo ({parseResult.parts.tipo_code}):</div>
                                        <div>{parseResult.decoded.tipo || <span className="text-red-500">Desconocido</span>}</div>

                                        <div className="font-bold">OOJJ ({parseResult.parts.oojj_code}):</div>
                                        <div>{parseResult.decoded.oojj || <span className="text-red-500">Desconocido</span>}</div>

                                        <div className="font-bold">Area ({parseResult.parts.area_code}):</div>
                                        <div>{parseResult.decoded.area || <span className="text-red-500">Desconocido</span>}</div>
                                    </div>
                                )}
                                {!parseResult.valid_format && (
                                    <div className="text-red-600">{parseResult.error}</div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GlossaryManager;

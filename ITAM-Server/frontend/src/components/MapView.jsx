import React, { useState, useEffect, useRef } from "react"; // Corrección de sintaxis
import axios from 'axios';
import Draggable from 'react-draggable';
import { Monitor } from 'lucide-react';

// 1. Creamos un sub-componente para manejar la referencia de CADA activo individualmente
const DraggableAsset = ({ pc, onStop }) => {
    const nodeRef = useRef(null); // Referencia única para este elemento

    return (
        <Draggable
            nodeRef={nodeRef} // <--- Vinculamos la referencia al Draggable
            defaultPosition={{ x: pc.pos_x || 0, y: pc.pos_y || 0 }}
            bounds="parent"
            onStop={(e, d) => onStop(e, d, pc.serial_number)}
        >
            {/* Vinculamos la MISMA referencia al div hijo */}
            <div ref={nodeRef} className="absolute cursor-move flex flex-col items-center w-20 group">
                <div className="p-2 bg-white rounded-full border-2 border-blue-500 shadow-lg hover:scale-110 transition-transform">
                    <Monitor size={20} className="text-gray-700" />
                </div>
                <span className="bg-black/75 text-white text-[10px] px-1 rounded mt-1 opacity-75 group-hover:opacity-100">
                    {pc.hostname}
                </span>
            </div>
        </Draggable>
    );
};

export default function MapView() {
    const [activos, setActivos] = useState([]);
    const API = "http://localhost:8000/api/assets";

    useEffect(() => {
        axios.get(API).then(res => setActivos(res.data));
    }, []);

    const handleStop = (e, data, serial) => {
        // Guardar posición al soltar
        axios.put(`${API}/${serial}/position`, {
            pos_x: data.x,
            pos_y: data.y,
            piso_id: 1
        });
    };

    return (
        <div className="h-[600px] border relative bg-gray-200 rounded shadow-inner overflow-hidden"
            style={{ backgroundImage: 'url("/planos/piso1.jpg")', backgroundSize: 'cover' }}>

            <div className="absolute top-2 left-2 bg-white/80 p-2 rounded text-xs z-10">
                Piso 1 - Arrastra los equipos para ubicarlos
            </div>

            {activos.map(pc => (
                // 2. Usamos el sub-componente en lugar de poner el Draggable directo
                <DraggableAsset
                    key={pc.id}
                    pc={pc}
                    onStop={handleStop}
                />
            ))}
        </div>
    );
}   
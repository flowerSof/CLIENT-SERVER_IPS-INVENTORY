import React, { useRef } from 'react';
import Draggable from 'react-draggable';
import AssetIcon from './AssetIcon';

export default function DraggableAsset({ asset, onStop }) {
    const nodeRef = useRef(null);

    return (
        <Draggable
            nodeRef={nodeRef}
            bounds="parent"
            onStop={(e, data) => onStop(e, data, asset)}
        >
            <div
                ref={nodeRef}
                className="draggable-asset absolute cursor-move flex flex-col items-center group z-20 hover:z-30"
                style={{
                    left: `${asset.pos_x}%`,
                    top: `${asset.pos_y}%`,
                    transform: 'translate(-50%, -50%)'
                }}
                title={`${asset.hostname} (${asset.ip_address})`}
            >
                <div className={`p-1.5 rounded-full shadow-md border-2 transition-transform hover:scale-110 ${asset.is_online
                        ? 'bg-white border-green-500 text-green-600'
                        : 'bg-white border-red-500 text-red-600'
                    } ${asset.es_dominio ? 'ring-2 ring-blue-100' : ''}`}>
                    <AssetIcon tipo={asset.icono_tipo} size={20} isOnline={asset.is_online} />
                </div>

                {/* Tooltip Label */}
                <div className="absolute top-full mt-1 px-2 py-0.5 bg-gray-900/90 text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    {asset.hostname}
                </div>
            </div>
        </Draggable>
    );
}

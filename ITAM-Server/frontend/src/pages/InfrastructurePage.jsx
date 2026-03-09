import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Layers, Map, Database, LayoutTemplate } from 'lucide-react';
import BuildingManager from '../components/BuildingManager';
import FloorManager from '../components/FloorManager';
import AreaManager from '../components/AreaManager';
import CatalogManager from '../components/CatalogManager';

export default function InfrastructurePage() {
    const [activeTab, setActiveTab] = useState('buildings');

    const tabs = [
        { id: 'buildings', label: 'Edificios', icon: Building2 },
        { id: 'floors', label: 'Pisos', icon: Layers },
        { id: 'catalogs', label: 'Catálogos', icon: Database },
    ];

    return (
        <div className="h-full flex flex-col bg-gray-50/50">
            {/* Header / Tabs */}
            <div className="bg-white border-b border-gray-200 px-8 py-4 sticky top-0 z-20">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Gestión de Infraestructura</h1>
                        <p className="text-gray-500 text-sm mt-1">Administra edificios, pisos y catálogos del sistema</p>
                    </div>
                </div>

                <div className="flex space-x-1">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    relative px-6 py-3 rounded-xl flex items-center gap-3 transition-all duration-300
                                    ${isActive
                                        ? 'text-blue-600 bg-blue-50 font-bold shadow-sm ring-1 ring-blue-200'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium'
                                    }
                                `}
                            >
                                <Icon size={20} className={isActive ? "stroke-[2.5px]" : "stroke-2"} />
                                {tab.label}
                                {isActive && (
                                    <motion.div
                                        layoutId="activeTabIndicator"
                                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full mx-6 mb-2"
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-8 overflow-hidden relative">
                {/* Buildings Tab */}
                <div className={`absolute inset-0 p-8 transition-opacity duration-300 ${activeTab === 'buildings' ? 'opacity-100 z-10 overflow-auto' : 'opacity-0 z-0 pointer-events-none'}`}>
                    <BuildingManager isOpen={true} onClose={() => { }} embedded={true} />
                </div>

                {/* Floors Tab */}
                <div className={`absolute inset-0 p-8 transition-opacity duration-300 ${activeTab === 'floors' ? 'opacity-100 z-10 overflow-auto' : 'opacity-0 z-0 pointer-events-none'}`}>
                    <FloorManager isOpen={true} onClose={() => { }} embedded={true} />
                </div>

                {/* Catalogs Tab */}
                <div className={`absolute inset-0 p-8 transition-opacity duration-300 ${activeTab === 'catalogs' ? 'opacity-100 z-10 overflow-auto' : 'opacity-0 z-0 pointer-events-none'}`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 h-full pb-20">
                        <CatalogManager category="DISTRITO" title="Distritos Judiciales" />
                        <CatalogManager category="SEDE" title="Sedes" />
                        <CatalogManager category="TIPO" title="Tipos de Dispositivo" />
                        <CatalogManager category="OOJJ" title="Órganos Judiciales" />
                    </div>
                </div>
            </div>
        </div>
    );
}

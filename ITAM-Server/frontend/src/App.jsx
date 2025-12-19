import React, { useState } from 'react';
import InventoryTable from './components/InventoryTable';
import MapView from './components/MapView';
import StatsWidget from './components/StatsWidget'; // <--- IMPORTANTE
import { LayoutDashboard, Map } from 'lucide-react';

function App() {
  const [vista, setVista] = useState('logica');

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen bg-gray-100 font-sans">
      <header className="mb-6 flex justify-between items-center bg-white p-4 rounded shadow">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-800">
          <LayoutDashboard className="text-blue-600" /> ITAM System
        </h1>
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setVista('logica')}
            className={`px-4 py-2 rounded flex gap-2 items-center text-sm font-medium transition-colors ${vista === 'logica' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <LayoutDashboard size={16} /> Inventario
          </button>
          <button
            onClick={() => setVista('fisica')}
            className={`px-4 py-2 rounded flex gap-2 items-center text-sm font-medium transition-colors ${vista === 'fisica' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Map size={16} /> Mapa Físico
          </button>
        </div>
      </header>

      {/* WIDGET DE ESTADÍSTICAS (Solo visible en inventario para no tapar el mapa) */}
      {vista === 'logica' && <StatsWidget />}

      <main>
        {vista === 'logica' ? <InventoryTable /> : <MapView />}
      </main>
    </div>
  );
}

export default App;
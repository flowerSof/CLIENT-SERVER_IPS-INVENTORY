import InventoryTable from './components/InventoryTable';
import { LayoutDashboard } from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen p-8 max-w-7xl mx-auto">
      {/* HEADER */}
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <LayoutDashboard className="text-blue-600" size={32} />
            Gestión de Activos TI
          </h1>
          <p className="text-gray-500 mt-1">Vista Lógica de Inventario en Tiempo Real</p>
        </div>

        {/* Aquí irán los KPI en el futuro */}
        <div className="flex gap-4">
          <div className="bg-white p-3 rounded shadow-sm border text-center min-w-[100px]">
            <div className="text-xs text-gray-400 uppercase font-bold">Total</div>
            <div className="text-xl font-bold text-blue-600">-</div>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main>
        <InventoryTable />
      </main>
    </div>
  );
}

export default App;
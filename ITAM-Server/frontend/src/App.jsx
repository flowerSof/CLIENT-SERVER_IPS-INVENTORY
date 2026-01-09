import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Building2,
  Map,
  Server,
  LayoutDashboard,
  Settings,
  Bell,
  Search,
  ChevronRight,
  User,
  LogOut
} from "lucide-react";
import InventoryTable from "./components/InventoryTable";
import StatsWidget from "./components/StatsWidget";
import FloorManager from "./components/FloorManager";
import BuildingManager from "./components/BuildingManager";
import MapView from "./components/MapView";
import { AuthProvider, useAuth } from "./AuthContext";

// Componente Header interno para acceder al contexto de Auth
const AppHeader = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  // Breadcrumbs mapping
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/': return 'Dashboard General';
      case '/inventory': return 'Inventario de Activos';
      case '/map': return 'Mapa de Ubicaciones';
      case '/floors': return 'Gestión de Pisos';
      default: return 'ITAM Platform';
    }
  };

  return (
    <header className="bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-lg z-20 sticky top-0 border-b border-red-900/30">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        {/* Logo Area */}
        <div className="flex items-center gap-4">
          <img
            src="/logo-poder-judicial.png"
            alt="PJ Logo"
            className="h-12 w-12 object-contain drop-shadow-lg bg-white/10 rounded-full p-1"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div className="hidden h-12 w-12 bg-white/10 rounded-full items-center justify-center font-bold text-white border border-white/20 shadow-inner">
            PJ
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">
              ITAM PLATFORM
            </h1>
            <p className="text-xs text-red-400 font-medium tracking-wider uppercase">Poder Judicial del Perú</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-1 bg-white/5 p-1 rounded-full border border-white/10 backdrop-blur-sm">
          <NavLink to="/" icon={<LayoutDashboard size={18} />} text="Dashboard" active={location.pathname === '/'} />
          <NavLink to="/inventory" icon={<Server size={18} />} text="Inventario" active={location.pathname === '/inventory'} />
          <NavLink to="/map" icon={<Map size={18} />} text="Mapa" active={location.pathname === '/map'} />
          <NavLink to="/floors" icon={<Building2 size={18} />} text="Edificios" active={location.pathname === '/floors'} />
        </nav>

        {/* User Area */}
        <div className="flex items-center gap-5">
          <div className="hidden md:block text-right">
            <p className="text-sm font-semibold text-gray-100">{user?.nombre_completo || 'Administrador'}</p>
            <p className="text-xs text-red-300">{user?.username || 'admin'}</p>
          </div>
          <div className="h-10 w-10 bg-gradient-to-br from-red-700 to-red-900 rounded-full flex items-center justify-center border-2 border-red-800 shadow-lg cursor-pointer hover:scale-105 transition-transform">
            <span className="font-bold text-sm">
              {(user?.username || 'A').charAt(0).toUpperCase()}
            </span>
          </div>
          <button
            onClick={logout}
            title="Cerrar Sesión"
            className="p-2 text-red-300 hover:text-white hover:bg-red-900/50 rounded-full transition-colors"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* Breadcrumbs / Sub-header */}
      <div className="bg-slate-900/50 border-t border-white/5 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-2 flex items-center text-sm text-gray-400">
          <span>Inicio</span>
          <ChevronRight size={14} className="mx-2" />
          <span className="text-white font-medium">{getPageTitle()}</span>
        </div>
      </div>
    </header>
  );
};

const NavLink = ({ to, icon, text, active }) => (
  <Link
    to={to}
    className={`
            flex items-center gap-2 px-5 py-2 rounded-full transition-all duration-300
            ${active
        ? 'bg-red-700 text-white shadow-md shadow-red-900/50 transform scale-105 font-medium'
        : 'text-gray-300 hover:bg-white/10 hover:text-white'
      }
        `}
  >
    {icon}
    <span className="text-sm">{text}</span>
  </Link>
);

const AppContent = () => {
  return (
    <div className="min-h-screen bg-[#F3F4F6] text-slate-800 font-sans selection:bg-red-200 selection:text-red-900">
      <AppHeader />

      <main className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <StatsWidget />
                <div className="mt-8">
                  <InventoryTable />
                </div>
              </motion.div>
            } />
            <Route path="/inventory" element={
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100"
              >
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Server className="text-red-700" size={24} />
                    Inventario Detallado
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">Gestión completa de activos de red registrados</p>
                </div>
                <InventoryTable />
              </motion.div>
            } />
            <Route path="/map" element={
              <motion.div>
                <MapView />
              </motion.div>
            } />
            <Route path="/floors" element={
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <BuildingManager />
                <div className="h-8" />
                <FloorManager />
              </motion.div>
            } />
          </Routes>
        </AnimatePresence>
      </main>

      <footer className="bg-white border-t border-gray-200 mt-12 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-gray-500 text-sm">
          <p className="font-semibold text-gray-700 mb-2">Poder Judicial del Perú</p>
          <p>Gerencia de Informática - Subgerencia de Soporte de Servicios de Tecnologías de Información</p>
          <p className="mt-4 text-xs opacity-70">© 2026 ITAM Platform v2.0. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
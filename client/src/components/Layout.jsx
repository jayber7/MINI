import { useState, useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
  LayoutDashboard,
  FileText,
  BookOpen,
  BarChart3,
  PieChart,
  TrendingUp,
  List,
  Settings,
  Users,
  Shield,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

const menuItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, permiso: 'reportes:read' },
  { path: '/plan-cuentas', label: 'Plan de Cuentas', icon: BookOpen, permiso: 'plan:read' },
  { path: '/comprobantes', label: 'Comprobantes', icon: FileText, permiso: 'comprobantes:read' },
  { path: '/libro-diario', label: 'Libro Diario', icon: List, permiso: 'reportes:read' },
  { path: '/libro-mayor', label: 'Libro Mayor', icon: BookOpen, permiso: 'reportes:read' },
  { path: '/balance-general', label: 'Balance General', icon: BarChart3, permiso: 'reportes:read' },
  { path: '/estado-resultados', label: 'Estado de Resultados', icon: PieChart, permiso: 'reportes:read' },
  { path: '/evolucion-patrimonio', label: 'Evol. Patrimonio', icon: TrendingUp, permiso: 'reportes:read' },
  { path: '/sumas-saldos', label: 'Sumas y Saldos', icon: FileText, permiso: 'reportes:read' },
  { path: '/configuracion', label: 'Configuración', icon: Settings, permiso: 'config:update' },
  { path: '/usuarios', label: 'Usuarios', icon: Users, permiso: 'usuarios:read' },
  { path: '/roles', label: 'Roles', icon: Shield, permiso: 'roles:read' },
];

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { usuario, logout } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-indigo-900 text-white transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-4 border-b border-indigo-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="font-bold text-lg">EICAP MINI</h1>
                <p className="text-xs text-indigo-300">Sistema Contable</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 hover:bg-indigo-800 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User info */}
          <div className="p-4 border-b border-indigo-800">
            <p className="font-medium text-sm truncate">{usuario?.nombreCompleto}</p>
            <p className="text-xs text-indigo-300 capitalize">{usuario?.rol}</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                    isActive
                      ? 'bg-indigo-700 text-white'
                      : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
                  }`}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="p-3 border-t border-indigo-800">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-indigo-200 hover:bg-indigo-800 hover:text-white w-full transition"
            >
              <LogOut className="w-5 h-5" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-3 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold text-gray-800">
            {menuItems.find((item) => item.path === location.pathname)?.label || 'EICAP MINI'}
          </h2>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

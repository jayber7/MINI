import { useState, useContext, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import {
  LayoutDashboard, FileText, BookOpen, BarChart3, PieChart, TrendingUp,
  List, Settings, Users, Shield, LogOut, Menu, X, Receipt, ShoppingCart,
  TrendingUpDown, UserCheck, Package, DollarSign, Bell,
} from 'lucide-react';

const menuItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, permiso: 'reportes:read' },
  { path: '/plan-cuentas', label: 'Plan de Cuentas', icon: BookOpen, permiso: 'plan:read' },
  { path: '/comprobantes', label: 'Comprobantes', icon: FileText, permiso: 'comprobantes:read' },
  { path: '/retenciones', label: 'Retenciones', icon: Receipt, permiso: 'comprobantes:read' },
  { path: '/compras', label: 'Compras', icon: ShoppingCart, permiso: 'comprobantes:read' },
  { path: '/ventas', label: 'Ventas', icon: TrendingUpDown, permiso: 'comprobantes:read' },
  { path: '/clientes-proveedores', label: 'Clientes/Prov.', icon: UserCheck, permiso: 'comprobantes:read' },
  { path: '/inventario', label: 'Inventario', icon: Package, permiso: 'comprobantes:read' },
  { path: '/libro-diario', label: 'Libro Diario', icon: List, permiso: 'reportes:read' },
  { path: '/libro-mayor', label: 'Libro Mayor', icon: BookOpen, permiso: 'reportes:read' },
  { path: '/balance-general', label: 'Balance General', icon: BarChart3, permiso: 'reportes:read' },
  { path: '/estado-resultados', label: 'Estado Resultados', icon: PieChart, permiso: 'reportes:read' },
  { path: '/evolucion-patrimonio', label: 'Evol. Patrimonio', icon: TrendingUp, permiso: 'reportes:read' },
  { path: '/sumas-saldos', label: 'Sumas y Saldos', icon: FileText, permiso: 'reportes:read' },
  { path: '/flujo-efectivo', label: 'Flujo Efectivo', icon: DollarSign, permiso: 'reportes:read' },
  { path: '/configuracion', label: 'Configuración', icon: Settings, permiso: 'config:update' },
  { path: '/usuarios', label: 'Usuarios', icon: Users, permiso: 'usuarios:read' },
  { path: '/roles', label: 'Roles', icon: Shield, permiso: 'roles:read' },
];

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificaciones, setNotificaciones] = useState(0);
  const { usuario, logout, empresa, empresas, cambiarEmpresa } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNotif = async () => {
      try {
        const { data } = await api.get('/comprobantes', { params: { estado: 'activo', limit: 1 } });
        setNotificaciones(data.total || 0);
      } catch (e) { /* ignore */ }
    };
    fetchNotif();
    const interval = setInterval(fetchNotif, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-indigo-900 text-white transform transition-transform duration-200 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-indigo-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="font-bold text-lg">MINI</h1>
                <p className="text-xs text-indigo-300">Sistema Contable</p>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 hover:bg-indigo-800 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                    isActive ? 'bg-indigo-700 text-white' : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
                  }`}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>


        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-2 flex items-center gap-4">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
            <Menu className="w-5 h-5" />
          </button>

          {/* Empresa selector */}
          {empresas.length > 1 && (
            <select
              value={empresa?.id || ''}
              onChange={(e) => {
                const emp = empresas.find(ep => ep.id === parseInt(e.target.value));
                if (emp) cambiarEmpresa(emp);
              }}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-gray-50 font-medium max-w-[220px]"
            >
              {empresas.map(ep => (
                <option key={ep.id} value={ep.id}>{ep.nombre}</option>
              ))}
            </select>
          )}

          <div className="flex-1" />

          {/* Date */}
          <span className="text-sm text-gray-500 hidden sm:block">
            {new Date().toLocaleDateString('es-BO', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>

          {/* Notifications */}
          <button className="relative p-2 hover:bg-gray-100 rounded-lg" title="Comprobantes sin contabilizar">
            <Bell className="w-5 h-5 text-gray-600" />
            {notificaciones > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {notificaciones > 99 ? '99+' : notificaciones}
              </span>
            )}
          </button>

          {/* User dropdown */}
          <div className="relative hidden sm:block">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-indigo-600 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition"
            >
              <span>{usuario?.nombreCompleto || ''}</span>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900 truncate">{usuario?.nombreCompleto}</p>
                    <p className="text-xs text-gray-500 capitalize">{usuario?.rol}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                  >
                    <LogOut className="w-4 h-4" />
                    Cerrar Sesión
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

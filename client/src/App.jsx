import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Usuarios from './pages/Usuarios';
import Roles from './pages/Roles';
import PlanCuentas from './pages/PlanCuentas';
import Comprobantes from './pages/Comprobantes';
import LibroDiario from './pages/LibroDiario';
import LibroMayor from './pages/LibroMayor';
import BalanceGeneral from './pages/BalanceGeneral';
import EstadoResultados from './pages/EstadoResultados';
import EvolucionPatrimonio from './pages/EvolucionPatrimonio';
import SumasSaldos from './pages/SumasSaldos';
import Configuracion from './pages/Configuracion';
import { useContext } from 'react';
import { Toaster } from 'react-hot-toast';

function AppRoutes() {
  const { usuario, cargando } = useContext(AuthContext);

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={usuario ? <Navigate to="/" replace /> : <Login />} />
      
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/plan-cuentas"
        element={
          <ProtectedRoute requierePermiso="plan:read">
            <Layout>
              <PlanCuentas />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/comprobantes"
        element={
          <ProtectedRoute requierePermiso="comprobantes:read">
            <Layout>
              <Comprobantes />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/libro-diario"
        element={
          <ProtectedRoute requierePermiso="reportes:read">
            <Layout>
              <LibroDiario />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/libro-mayor"
        element={
          <ProtectedRoute requierePermiso="reportes:read">
            <Layout>
              <LibroMayor />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/balance-general"
        element={
          <ProtectedRoute requierePermiso="reportes:read">
            <Layout>
              <BalanceGeneral />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/estado-resultados"
        element={
          <ProtectedRoute requierePermiso="reportes:read">
            <Layout>
              <EstadoResultados />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/evolucion-patrimonio"
        element={
          <ProtectedRoute requierePermiso="reportes:read">
            <Layout>
              <EvolucionPatrimonio />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/sumas-saldos"
        element={
          <ProtectedRoute requierePermiso="reportes:read">
            <Layout>
              <SumasSaldos />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/configuracion"
        element={
          <ProtectedRoute requierePermiso="config:update">
            <Layout>
              <Configuracion />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/usuarios"
        element={
          <ProtectedRoute requierePermiso="usuarios:read">
            <Layout>
              <Usuarios />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/roles"
        element={
          <ProtectedRoute requierePermiso="roles:read">
            <Layout>
              <Roles />
            </Layout>
          </ProtectedRoute>
        }
      />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </AuthProvider>
    </Router>
  );
}

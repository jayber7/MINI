import { useState, useEffect } from 'react';
import api from '../services/api';
import { FileText, TrendingUp, AlertCircle } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    comprobantes: 0,
    cuentas: 0,
    empresa: null,
  });
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const [comprobantesRes, cuentasRes, empresaRes] = await Promise.all([
        api.get('/comprobantes').catch(() => ({ data: [] })),
        api.get('/plan-cuentas').catch(() => ({ data: [] })),
        api.get('/empresa').catch(() => ({ data: {} })),
      ]);

      setStats({
        comprobantes: comprobantesRes.data.length || 0,
        cuentas: cuentasRes.data.length || 0,
        empresa: empresaRes.data || {},
      });
    } catch (error) {
      console.error('Error cargando dashboard:', error);
    } finally {
      setCargando(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bienvenido</h1>
        <p className="text-gray-500 mt-1">
          {stats.empresa?.nombre || 'EICAP MINI'} - Sistema Contable
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Comprobantes</p>
              <p className="text-2xl font-bold text-gray-900">{stats.comprobantes}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Cuentas Contables</p>
              <p className="text-2xl font-bold text-gray-900">{stats.cuentas}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Gestión Actual</p>
              <p className="text-2xl font-bold text-gray-900">2026</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Acciones Rápidas</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <a href="/comprobantes" className="p-4 bg-indigo-50 rounded-lg text-center hover:bg-indigo-100 transition">
            <FileText className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-indigo-700">Nuevo Comprobante</p>
          </a>
          <a href="/plan-cuentas" className="p-4 bg-green-50 rounded-lg text-center hover:bg-green-100 transition">
            <TrendingUp className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-green-700">Plan de Cuentas</p>
          </a>
          <a href="/libro-diario" className="p-4 bg-blue-50 rounded-lg text-center hover:bg-blue-100 transition">
            <FileText className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-blue-700">Libro Diario</p>
          </a>
          <a href="/balance-general" className="p-4 bg-purple-50 rounded-lg text-center hover:bg-purple-100 transition">
            <FileText className="w-6 h-6 text-purple-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-purple-700">Balance General</p>
          </a>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import api, { exportarArchivo } from '../services/api';
import { BookOpen, Download } from 'lucide-react';

export default function LibroMayor() {
  const [datos, setDatos] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [codigoCuenta, setCodigoCuenta] = useState('');
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    api.get('/plan-cuentas').then(({ data }) => setCuentas(data)).catch(() => {});
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const params = {};
      if (desde) params.desde = desde;
      if (hasta) params.hasta = hasta;
      if (codigoCuenta) params.codigoCuenta = codigoCuenta;

      const { data } = await api.get('/reportes/libro-mayor', { params });
      setDatos(data);
    } catch (error) {
      console.error('Error cargando Libro Mayor:', error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleExportPDF = () => {
    setExportando(true);
    const params = new URLSearchParams();
    if (desde) params.append('desde', desde);
    if (hasta) params.append('hasta', hasta);
    if (codigoCuenta) params.append('codigoCuenta', codigoCuenta);
    exportarArchivo(`/export/libro-mayor/pdf?${params}`, 'libro_mayor.pdf')
      .finally(() => setExportando(false));
  };

  const handleExportExcel = () => {
    setExportando(true);
    const params = new URLSearchParams();
    if (desde) params.append('desde', desde);
    if (hasta) params.append('hasta', hasta);
    if (codigoCuenta) params.append('codigoCuenta', codigoCuenta);
    exportarArchivo(`/export/libro-mayor/excel?${params}`, 'libro_mayor.xlsx')
      .finally(() => setExportando(false));
  };

  const formatBs = (n) => n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Libro Mayor</h1>
        <div className="flex gap-2">
          <button
            onClick={handleExportPDF}
            disabled={exportando}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            PDF
          </button>
          <button
            onClick={handleExportExcel}
            disabled={exportando}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Excel
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Desde</label>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Hasta</label>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Cuenta</label>
            <select
              value={codigoCuenta}
              onChange={(e) => setCodigoCuenta(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm min-w-[200px]"
            >
              <option value="">Todas las cuentas</option>
              {cuentas.map((c) => (
                <option key={c.id} value={c.codigo}>{c.codigo} - {c.nombre}</option>
              ))}
            </select>
          </div>
          <button
            onClick={cargarDatos}
            className="mt-5 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition text-sm"
          >
            Generar
          </button>
        </div>
      </div>

      {/* Reporte */}
      <div className="space-y-4">
        {datos.length > 0 ? datos.map((cuenta) => (
          <div key={cuenta.codigo} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-indigo-500" />
                <span className="font-semibold text-gray-800">
                  {cuenta.codigo} - {cuenta.nombre}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  cuenta.tipo === 'Activo' ? 'bg-green-100 text-green-700' :
                  cuenta.tipo === 'Pasivo' ? 'bg-red-100 text-red-700' :
                  cuenta.tipo === 'Patrimonio' ? 'bg-purple-100 text-purple-700' :
                  cuenta.tipo === 'Ingreso' ? 'bg-blue-100 text-blue-700' :
                  'bg-orange-100 text-orange-700'
                }`}>
                  {cuenta.tipo}
                </span>
              </div>
              <span className="font-mono font-bold text-indigo-700">
                Saldo: Bs. {formatBs(cuenta.saldo)}
              </span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase">
                  <th className="px-4 py-2 font-medium">Fecha</th>
                  <th className="px-4 py-2 font-medium">Nº</th>
                  <th className="px-4 py-2 font-medium">Glosa</th>
                  <th className="px-4 py-2 font-medium text-right">Debe</th>
                  <th className="px-4 py-2 font-medium text-right">Haber</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {cuenta.movimientos.map((m, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2">{m.fecha}</td>
                    <td className="px-4 py-2 font-mono text-indigo-600">{String(m.numero).padStart(4, '0')}</td>
                    <td className="px-4 py-2 text-gray-600">{m.glosa}</td>
                    <td className="px-4 py-2 text-right font-mono">
                      {m.debe > 0 ? `Bs. ${formatBs(m.debe)}` : ''}
                    </td>
                    <td className="px-4 py-2 text-right font-mono">
                      {m.haber > 0 ? `Bs. ${formatBs(m.haber)}` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold">
                  <td colSpan={3} className="px-4 py-2">Totales</td>
                  <td className="px-4 py-2 text-right font-mono text-green-700">
                    Bs. {formatBs(cuenta.totalDebe)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-blue-700">
                    Bs. {formatBs(cuenta.totalHaber)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )) : (
          <div className="bg-white rounded-xl shadow-sm p-16 text-center text-gray-500 border border-gray-100">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No hay movimientos para los filtros seleccionados</p>
          </div>
        )}
      </div>
    </div>
  );
}

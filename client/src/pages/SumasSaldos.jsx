import { useState, useEffect } from 'react';
import api, { exportarArchivo } from '../services/api';
import { FileText, Download } from 'lucide-react';

export default function SumasSaldos() {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [gestionId, setGestionId] = useState('');
  const [gestiones, setGestiones] = useState([]);
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    api.get('/gestiones').then(({ data }) => {
      setGestiones(data);
      if (data.length > 0 && !gestionId) {
        setGestionId(data[0].id);
        setDesde(data[0].fechaInicio);
        setHasta(data[0].fechaFin);
      }
    }).catch(() => {});
  }, []);

  const handleGestionChange = (id) => {
    setGestionId(id);
    const g = gestiones.find((x) => x.id === parseInt(id));
    if (g) { setDesde(g.fechaInicio); setHasta(g.fechaFin); }
  };

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const params = {};
      if (gestionId) params.gestionId = gestionId;
      if (desde) params.desde = desde;
      if (hasta) params.hasta = hasta;

      const { data } = await api.get('/reportes/sumas-saldos', { params });
      setDatos(data);
    } catch (error) {
      console.error('Error cargando Sumas y Saldos:', error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (gestionId) cargarDatos();
  }, [gestionId]);

  const handleExportPDF = () => {
    setExportando(true);
    const params = new URLSearchParams();
    if (gestionId) params.append('gestionId', gestionId);
    if (desde) params.append('desde', desde);
    if (hasta) params.append('hasta', hasta);
    exportarArchivo(`/export/sumas-saldos/pdf?${params}`, 'sumas_saldos.pdf')
      .finally(() => setExportando(false));
  };

  const handleExportExcel = () => {
    setExportando(true);
    const params = new URLSearchParams();
    if (gestionId) params.append('gestionId', gestionId);
    if (desde) params.append('desde', desde);
    if (hasta) params.append('hasta', hasta);
    exportarArchivo(`/export/sumas-saldos/excel?${params}`, 'sumas_saldos.xlsx')
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

  if (!datos) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Balance de Sumas y Saldos</h1>
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
        <div className="flex items-center gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Gestión</label>
            <select value={gestionId} onChange={(e) => handleGestionChange(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm min-w-[150px]">
              <option value="">Seleccionar</option>
              {gestiones.map((g) => (<option key={g.id} value={g.id}>{g.year} - {g.glosa}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Desde</label>
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Hasta</label>
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <button onClick={cargarDatos} className="mt-5 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition text-sm">
            Generar
          </button>
        </div>
      </div>

      {/* Reporte */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cuenta</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Suma Debe</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Suma Haber</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Saldo Deudor</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Saldo Acreedor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {datos.cuentas.map((c, i) => {
                const esPadre = c.nivel && c.nivel <= 2;
                const indent = (c.nivel || 1) * 16 + 16;
                return (
                  <tr key={i} className={`hover:bg-gray-50 ${esPadre ? 'bg-gray-50' : ''}`}>
                    <td className={`px-4 py-2 font-mono text-indigo-600 ${esPadre ? 'font-bold' : ''}`} style={{ paddingLeft: `${indent}px` }}>
                      {c.codigo}
                    </td>
                    <td className={`px-4 py-2 ${esPadre ? 'font-bold text-gray-800' : 'text-gray-600'}`} style={{ paddingLeft: `${indent}px` }}>
                      {c.nombre}
                    </td>
                    <td className={`px-4 py-2 text-right font-mono ${esPadre ? 'font-bold' : ''}`}>
                      {c.sumaDebe > 0 ? formatBs(c.sumaDebe) : ''}
                    </td>
                    <td className={`px-4 py-2 text-right font-mono ${esPadre ? 'font-bold' : ''}`}>
                      {c.sumaHaber > 0 ? formatBs(c.sumaHaber) : ''}
                    </td>
                    <td className={`px-4 py-2 text-right font-mono text-green-700 ${esPadre ? 'font-bold' : ''}`}>
                      {c.saldoDeudor > 0 ? formatBs(c.saldoDeudor) : ''}
                    </td>
                    <td className={`px-4 py-2 text-right font-mono text-red-700 ${esPadre ? 'font-bold' : ''}`}>
                      {c.saldoAcreedor > 0 ? formatBs(c.saldoAcreedor) : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 border-t-2 border-gray-300 font-bold">
                <td colSpan={2} className="px-4 py-3">TOTALES</td>
                <td className="px-4 py-3 text-right font-mono">
                  Bs. {formatBs(datos.totales.sumaDebe)}
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  Bs. {formatBs(datos.totales.sumaHaber)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-green-700">
                  Bs. {formatBs(datos.totales.saldoDeudor)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-red-700">
                  Bs. {formatBs(datos.totales.saldoAcreedor)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {datos.cuentas.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No hay movimientos para el período seleccionado</p>
          </div>
        )}
      </div>
    </div>
  );
}

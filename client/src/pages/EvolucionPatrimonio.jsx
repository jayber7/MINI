import { useState, useEffect } from 'react';
import api, { exportarArchivo } from '../services/api';
import { TrendingUp, Download } from 'lucide-react';

export default function EvolucionPatrimonio() {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [exportando, setExportando] = useState(false);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const params = {};
      if (desde) params.desde = desde;
      if (hasta) params.hasta = hasta;

      const { data } = await api.get('/reportes/evolucion-patrimonio', { params });
      setDatos(data);
    } catch (error) {
      console.error('Error cargando Evolución del Patrimonio:', error);
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
    exportarArchivo(`/export/evolucion-patrimonio/pdf?${params}`, 'evolucion_patrimonio.pdf')
      .finally(() => setExportando(false));
  };

  const handleExportExcel = () => {
    setExportando(true);
    const params = new URLSearchParams();
    if (desde) params.append('desde', desde);
    if (hasta) params.append('hasta', hasta);
    exportarArchivo(`/export/evolucion-patrimonio/excel?${params}`, 'evolucion_patrimonio.xlsx')
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
        <h1 className="text-2xl font-bold text-gray-900">Estado de Evolución del Patrimonio</h1>
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
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-purple-50 px-4 py-3 border-b border-purple-100">
          <h2 className="font-bold text-purple-800 text-lg">PATRIMONIO</h2>
        </div>

        <table className="w-full text-sm">
          <tbody className="divide-y divide-gray-50">
            {datos.detalle.map((c, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-indigo-600" style={{ paddingLeft: `${c.nivel * 20 + 16}px` }}>
                  {c.codigo}
                </td>
                <td className="px-4 py-3" style={{ paddingLeft: `${c.nivel * 20 + 16}px` }}>
                  {c.nombre}
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  Bs. {formatBs(c.saldo)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-purple-50 border-t-2 border-purple-200">
              <td colSpan={2} className="px-4 py-3 font-bold text-purple-800">Patrimonio Inicial</td>
              <td className="px-4 py-3 text-right font-bold font-mono text-purple-800">
                Bs. {formatBs(datos.patrimonioInicial)}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Utilidad del ejercicio */}
        <div className="border-t border-gray-100 px-4 py-3 bg-blue-50">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-blue-800">
              {datos.utilidad >= 0 ? '(+) Utilidad del Ejercicio' : '(-) Pérdida del Ejercicio'}
            </span>
            <span className={`font-bold font-mono ${datos.utilidad >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              Bs. {formatBs(Math.abs(datos.utilidad))}
            </span>
          </div>
        </div>

        {/* Patrimonio Final */}
        <div className="border-t-2 border-gray-300 px-4 py-4 bg-indigo-50">
          <div className="flex items-center justify-between">
            <span className="font-bold text-lg text-indigo-800">PATRIMONIO FINAL</span>
            <span className="font-bold font-mono text-xl text-indigo-800">
              Bs. {formatBs(datos.patrimonioFinal)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

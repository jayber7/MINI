import { useState, useEffect } from 'react';
import api, { exportarArchivo } from '../services/api';
import { FileText, Download } from 'lucide-react';

export default function LibroDiario() {
  const [datos, setDatos] = useState([]);
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

      const { data } = await api.get('/reportes/libro-diario', { params });
      setDatos(data);
    } catch (error) {
      console.error('Error cargando Libro Diario:', error);
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
    exportarArchivo(`/export/libro-diario/pdf?${params}`, 'libro_diario.pdf')
      .finally(() => setExportando(false));
  };

  const handleExportExcel = () => {
    setExportando(true);
    const params = new URLSearchParams();
    if (desde) params.append('desde', desde);
    if (hasta) params.append('hasta', hasta);
    exportarArchivo(`/export/libro-diario/excel?${params}`, 'libro_diario.xlsx')
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
        <h1 className="text-2xl font-bold text-gray-900">Libro Diario</h1>
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
          <button
            onClick={cargarDatos}
            className="mt-5 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition text-sm"
          >
            Generar
          </button>
        </div>
      </div>

      {/* Reporte */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {datos.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {datos.map((comp) => (
              <div key={comp.id} className="p-4">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-indigo-500" />
                    <span className="font-semibold text-gray-800">
                      Comprobante Nº {String(comp.numero).padStart(4, '0')}
                    </span>
                    <span className="text-sm text-gray-500">{comp.fecha}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      comp.tipoComprobante === 'ingreso' ? 'bg-green-100 text-green-700' :
                      comp.tipoComprobante === 'egreso' ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {comp.tipoComprobante}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">{comp.glosa}</span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 uppercase">
                      <th className="pb-2 font-medium">Cuenta</th>
                      <th className="pb-2 font-medium">Glosa</th>
                      <th className="pb-2 font-medium text-right">Debe</th>
                      <th className="pb-2 font-medium text-right">Haber</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {comp.detalles.map((d, i) => (
                      <tr key={i}>
                        <td className="py-1.5 font-mono text-indigo-600">
                          {d.cuentaCodigo} - {d.cuentaNombre}
                        </td>
                        <td className="py-1.5 text-gray-600">{d.glosa}</td>
                        <td className="py-1.5 text-right font-mono">
                          {d.debe > 0 ? `Bs. ${formatBs(d.debe)}` : ''}
                        </td>
                        <td className="py-1.5 text-right font-mono">
                          {d.haber > 0 ? `Bs. ${formatBs(d.haber)}` : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 font-semibold">
                      <td colSpan={2} className="pt-2"></td>
                      <td className="pt-2 text-right font-mono text-green-700">
                        Bs. {formatBs(comp.totalDebe)}
                      </td>
                      <td className="pt-2 text-right font-mono text-blue-700">
                        Bs. {formatBs(comp.totalHaber)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No hay comprobantes para el período seleccionado</p>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import api from '../services/api';
import { exportarArchivo } from '../services/api';

const formatBs = (n) => `Bs. ${(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

export default function EstadoResultados() {
  const [data, setData] = useState(null);
  const [gestiones, setGestiones] = useState([]);
  const [gestionId, setGestionId] = useState('');
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    api.get('/gestiones').then(({ data }) => setGestiones(data)).catch(() => {});
  }, []);

  useEffect(() => {
    const params = {};
    if (gestionId) params.gestionId = gestionId;
    api.get('/reportes/estado-resultados', { params }).then(({ data }) => setData(data)).catch(() => {});
  }, [gestionId]);

  const exportPDF = () => { setExportando(true); exportarArchivo(`/export/estado-resultados/pdf${gestionId ? `?gestionId=${gestionId}` : ''}`, 'estado_resultados.pdf').finally(() => setExportando(false)); };
  const exportExcel = () => { setExportando(true); exportarArchivo(`/export/estado-resultados/excel${gestionId ? `?gestionId=${gestionId}` : ''}`, 'estado_resultados.xlsx').finally(() => setExportando(false)); };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Estado de Resultados</h1>
        <div className="flex gap-2">
          <select value={gestionId} onChange={e => setGestionId(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option value="">Todas</option>
            {gestiones.map(g => <option key={g.id} value={g.id}>Gestión {g.year}</option>)}
          </select>
          <button onClick={exportPDF} disabled={exportando} className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">PDF</button>
          <button onClick={exportExcel} disabled={exportando} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">Excel</button>
        </div>
      </div>

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* INGRESOS */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-blue-50 px-4 py-3 border-b">
              <span className="font-bold text-blue-700">INGRESOS</span>
            </div>
            <table className="w-full">
              <tbody className="divide-y divide-gray-100">
                {data.ingresos.cuentas.filter(c => c.nivel > 1).map(c => (
                  <tr key={c.codigo} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm" style={{ paddingLeft: `${12 + (c.nivel - 2) * 16}px` }}>{c.nombre}</td>
                    <td className="px-4 py-2 text-sm text-right font-mono text-blue-600">{formatBs(c.saldo)}</td>
                  </tr>
                ))}
                <tr className="bg-blue-50 font-bold">
                  <td className="px-4 py-2 text-sm">TOTAL INGRESOS</td>
                  <td className="px-4 py-2 text-sm text-right font-mono text-blue-700">{formatBs(data.ingresos.total)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* GASTOS */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-orange-50 px-4 py-3 border-b">
              <span className="font-bold text-orange-700">GASTOS</span>
            </div>
            <table className="w-full">
              <tbody className="divide-y divide-gray-100">
                {data.gastos.cuentas.filter(c => c.nivel > 1).map(c => (
                  <tr key={c.codigo} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm" style={{ paddingLeft: `${12 + (c.nivel - 2) * 16}px` }}>{c.nombre}</td>
                    <td className="px-4 py-2 text-sm text-right font-mono text-orange-600">{formatBs(c.saldo)}</td>
                  </tr>
                ))}
                <tr className="bg-orange-50 font-bold">
                  <td className="px-4 py-2 text-sm">TOTAL GASTOS</td>
                  <td className="px-4 py-2 text-sm text-right font-mono text-orange-700">{formatBs(data.gastos.total)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* RESUMEN DERECHO */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <tbody className="divide-y divide-gray-100">
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">Total Ingresos</td>
                  <td className="px-4 py-3 text-sm text-right font-mono text-blue-600">{formatBs(data.ingresos.total)}</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">Total Gastos</td>
                  <td className="px-4 py-3 text-sm text-right font-mono text-orange-600">({formatBs(data.gastos.total)})</td>
                </tr>
                <tr className="border-t-2 border-gray-300">
                  <td className="px-4 py-3 text-sm font-bold">Utilidad antes de IUE</td>
                  <td className={`px-4 py-3 text-sm text-right font-bold font-mono ${data.utilidad >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatBs(data.utilidad)}
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">IUE (25%)</td>
                  <td className="px-4 py-3 text-sm text-right font-mono text-red-600">({formatBs(data.iue)})</td>
                </tr>
                <tr className="bg-green-50">
                  <td className="px-4 py-3 text-sm font-bold text-lg">{data.utilidadNeta >= 0 ? 'UTILIDAD NETA' : 'PÉRDIDA NETA'}</td>
                  <td className={`px-4 py-3 text-sm text-right font-bold text-lg font-mono ${data.utilidadNeta >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {formatBs(Math.abs(data.utilidadNeta))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

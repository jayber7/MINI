import { useState, useEffect } from 'react';
import api from '../services/api';
import { exportarArchivo } from '../services/api';

const formatBs = (n) => `Bs. ${(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

export default function EvolucionPatrimonio() {
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
    api.get('/reportes/evolucion-patrimonio', { params }).then(({ data }) => setData(data)).catch(() => {});
  }, [gestionId]);

  const exportPDF = () => { setExportando(true); exportarArchivo(`/export/evolucion-patrimonio/pdf${gestionId ? `?gestionId=${gestionId}` : ''}`, 'evolucion_patrimonio.pdf').finally(() => setExportando(false)); };
  const exportExcel = () => { setExportando(true); exportarArchivo(`/export/evolucion-patrimonio/excel${gestionId ? `?gestionId=${gestionId}` : ''}`, 'evolucion_patrimonio.xlsx').finally(() => setExportando(false)); };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Estado de Patrimonio</h1>
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
        <div className="space-y-4">
          {/* Items específicos del patrimonio */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-green-50 px-4 py-3 border-b">
              <span className="font-bold text-green-700">Estado de Patrimonio</span>
            </div>
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Descripción</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.items && data.items.map((item, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{item.nombre}</td>
                    <td className="px-4 py-3 text-sm text-right font-mono">{formatBs(item.saldo)}</td>
                  </tr>
                ))}
                <tr className="bg-green-50 font-bold">
                  <td className="px-4 py-3 text-sm">Total Patrimonio</td>
                  <td className="px-4 py-3 text-sm text-right font-mono text-green-700">{formatBs(data.patrimonioInicial)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Resultado del ejercicio */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b bg-gray-50">
              <span className="font-bold text-sm">Resultado del Ejercicio</span>
            </div>
            <table className="w-full">
              <tbody className="divide-y divide-gray-100">
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">Patrimonio Inicial</td>
                  <td className="px-4 py-3 text-sm text-right font-mono">{formatBs(data.patrimonioInicial)}</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">
                    {data.utilidad >= 0 ? '(+) Utilidad del Ejercicio' : '(-) Pérdida del Ejercicio'}
                  </td>
                  <td className={`px-4 py-3 text-sm text-right font-mono ${data.utilidad >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatBs(Math.abs(data.utilidad))}
                  </td>
                </tr>
                <tr className="bg-green-50">
                  <td className="px-4 py-3 text-sm font-bold">Patrimonio Final</td>
                  <td className="px-4 py-3 text-sm text-right font-bold font-mono text-green-700">{formatBs(data.patrimonioFinal)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Detalle de cuentas patrimoniales */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b bg-gray-50">
              <span className="font-bold text-sm">Detalle de Cuentas Patrimoniales</span>
            </div>
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Código</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Cuenta</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.detalle.filter(c => c.nivel > 1).map(c => (
                  <tr key={c.codigo} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm font-mono">{c.codigo}</td>
                    <td className="px-4 py-2 text-sm" style={{ paddingLeft: `${12 + (c.nivel - 2) * 16}px` }}>{c.nombre}</td>
                    <td className="px-4 py-2 text-sm text-right font-mono">{formatBs(c.saldo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import api from '../services/api';
import { exportarArchivo } from '../services/api';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

const formatBs = (n) => `Bs. ${(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

export default function BalanceGeneral() {
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
    api.get('/reportes/balance-general', { params }).then(({ data }) => setData(data)).catch(() => {});
  }, [gestionId]);

  const exportPDF = () => { setExportando(true); exportarArchivo(`/export/balance-general/pdf${gestionId ? `?gestionId=${gestionId}` : ''}`, 'balance_general.pdf').finally(() => setExportando(false)); };
  const exportExcel = () => { setExportando(true); exportarArchivo(`/export/balance-general/excel${gestionId ? `?gestionId=${gestionId}` : ''}`, 'balance_general.xlsx').finally(() => setExportando(false)); };

  const pieData = data ? {
    labels: ['Activo', 'Pasivo', 'Patrimonio'],
    datasets: [{
      data: [data.activo.total, data.pasivo.total, data.patrimonio.total],
      backgroundColor: ['#3B82F6', '#F59E0B', '#10B981'],
      borderWidth: 2,
      borderColor: '#fff',
    }],
  } : null;

  const totalGeneral = data ? data.activo.total + data.pasivo.total + data.patrimonio.total : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Balance General</h1>
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
        <>
          {/* ECUACIÓN CONTABLE */}
          <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${Math.abs(data.activo.total - (data.pasivo.total + data.patrimonio.total)) < 0.01 ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {Math.abs(data.activo.total - (data.pasivo.total + data.patrimonio.total)) < 0.01
              ? '✓ Activo = Pasivo + Patrimonio (Balance correcto)'
              : '✗ Activo ≠ Pasivo + Patrimonio (El balance no cuadra)'}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Pie Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h3 className="font-bold text-sm mb-2">Distribución</h3>
              {totalGeneral > 0 && (
                <>
                  <Pie data={pieData} options={{ plugins: { legend: { position: 'bottom' } } }} />
                  <div className="mt-3 space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-blue-600">Activo</span><span>{((data.activo.total / totalGeneral) * 100).toFixed(1)}%</span></div>
                    <div className="flex justify-between"><span className="text-amber-600">Pasivo</span><span>{((data.pasivo.total / totalGeneral) * 100).toFixed(1)}%</span></div>
                    <div className="flex justify-between"><span className="text-green-600">Patrimonio</span><span>{((data.patrimonio.total / totalGeneral) * 100).toFixed(1)}%</span></div>
                  </div>
                </>
              )}
            </div>

            {/* Columnas */}
            <div className="lg:col-span-2 space-y-4">
              {/* ACTIVO */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-blue-50 px-4 py-3 border-b flex justify-between">
                  <span className="font-bold text-blue-700">ACTIVO</span>
                  <span className="font-bold text-blue-700">{formatBs(data.activo.total)}</span>
                </div>
                <table className="w-full">
                  <tbody className="divide-y divide-gray-100">
                    {data.activo.cuentas.filter(c => c.nivel > 1).map(c => (
                      <tr key={c.codigo} className="hover:bg-gray-50">
                        <td className={`px-4 py-2 text-sm ${c.nivel === 2 ? 'font-bold' : ''}`} style={{ paddingLeft: `${12 + (c.nivel - 2) * 16}px` }}>{c.nombre}</td>
                        <td className="px-4 py-2 text-sm text-right font-mono">{formatBs(c.saldo)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* PASIVO */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-amber-50 px-4 py-3 border-b flex justify-between">
                  <span className="font-bold text-amber-700">PASIVO</span>
                  <span className="font-bold text-amber-700">{formatBs(data.pasivo.total)}</span>
                </div>
                <table className="w-full">
                  <tbody className="divide-y divide-gray-100">
                    {data.pasivo.cuentas.filter(c => c.nivel > 1).map(c => (
                      <tr key={c.codigo} className="hover:bg-gray-50">
                        <td className={`px-4 py-2 text-sm ${c.nivel === 2 ? 'font-bold' : ''}`} style={{ paddingLeft: `${12 + (c.nivel - 2) * 16}px` }}>{c.nombre}</td>
                        <td className="px-4 py-2 text-sm text-right font-mono">{formatBs(c.saldo)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* PATRIMONIO */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-green-50 px-4 py-3 border-b flex justify-between">
                  <span className="font-bold text-green-700">PATRIMONIO</span>
                  <span className="font-bold text-green-700">{formatBs(data.patrimonio.total)}</span>
                </div>
                <table className="w-full">
                  <tbody className="divide-y divide-gray-100">
                    {data.patrimonio.cuentas.filter(c => c.nivel > 1).map(c => (
                      <tr key={c.codigo} className="hover:bg-gray-50">
                        <td className={`px-4 py-2 text-sm ${c.nivel === 2 ? 'font-bold' : ''}`} style={{ paddingLeft: `${12 + (c.nivel - 2) * 16}px` }}>{c.nombre}</td>
                        <td className="px-4 py-2 text-sm text-right font-mono">{formatBs(c.saldo)}</td>
                      </tr>
                    ))}
                    <tr className="bg-green-50 font-bold">
                      <td className="px-4 py-2 text-sm">Utilidad del Ejercicio</td>
                      <td className="px-4 py-2 text-sm text-right font-mono">{formatBs(data.utilidadEjercicio)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

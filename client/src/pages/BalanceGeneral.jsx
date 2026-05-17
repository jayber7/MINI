import { useState, useEffect } from 'react';
import api, { exportarArchivo } from '../services/api';
import { BarChart3, Download, CheckCircle, AlertCircle } from 'lucide-react';

export default function BalanceGeneral() {
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

      const { data } = await api.get('/reportes/balance-general', { params });
      setDatos(data);
    } catch (error) {
      console.error('Error cargando Balance General:', error);
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
    exportarArchivo(`/export/balance-general/pdf?${params}`, 'balance_general.pdf')
      .finally(() => setExportando(false));
  };

  const handleExportExcel = () => {
    setExportando(true);
    const params = new URLSearchParams();
    if (desde) params.append('desde', desde);
    if (hasta) params.append('hasta', hasta);
    exportarArchivo(`/export/balance-general/excel?${params}`, 'balance_general.xlsx')
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

  const totalPasivoPatrimonio = datos.pasivo.total + datos.patrimonio.total;
  const balanceado = Math.abs(datos.activo.total - totalPasivoPatrimonio) < 0.01;

  const renderCuentas = (cuentas, nivel = 0) => {
    return cuentas.map((c, i) => (
      <tr key={i} className="hover:bg-gray-50">
        <td
          className="px-4 py-2 font-mono text-indigo-600"
          style={{ paddingLeft: `${nivel * 20 + 16}px` }}
        >
          {c.codigo}
        </td>
        <td
          className={`px-4 py-2 ${c.nivel <= 2 ? 'font-semibold text-gray-800' : 'text-gray-600'}`}
          style={{ paddingLeft: `${nivel * 20 + 16}px` }}
        >
          {c.nombre}
        </td>
        <td className="px-4 py-2 text-right font-mono">
          Bs. {formatBs(c.saldo)}
        </td>
      </tr>
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Balance General</h1>
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activo */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-green-50 px-4 py-3 border-b border-green-100">
            <h2 className="font-bold text-green-800 text-lg">ACTIVO</h2>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-50">
              {renderCuentas(datos.activo.cuentas)}
            </tbody>
            <tfoot>
              <tr className="bg-green-50 border-t-2 border-green-200">
                <td colSpan={2} className="px-4 py-3 font-bold text-green-800">TOTAL ACTIVO</td>
                <td className="px-4 py-3 text-right font-bold font-mono text-green-800">
                  Bs. {formatBs(datos.activo.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Pasivo + Patrimonio */}
        <div className="space-y-6">
          {/* Pasivo */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-red-50 px-4 py-3 border-b border-red-100">
              <h2 className="font-bold text-red-800 text-lg">PASIVO</h2>
            </div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-50">
                {renderCuentas(datos.pasivo.cuentas)}
              </tbody>
              <tfoot>
                <tr className="bg-red-50 border-t-2 border-red-200">
                  <td colSpan={2} className="px-4 py-3 font-bold text-red-800">TOTAL PASIVO</td>
                  <td className="px-4 py-3 text-right font-bold font-mono text-red-800">
                    Bs. {formatBs(datos.pasivo.total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Patrimonio */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-purple-50 px-4 py-3 border-b border-purple-100">
              <h2 className="font-bold text-purple-800 text-lg">PATRIMONIO</h2>
            </div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-50">
                {renderCuentas(datos.patrimonio.cuentas)}
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-indigo-600 pl-4">3.3</td>
                  <td className="px-4 py-2 font-semibold text-gray-800 pl-4">Resultado del Ejercicio</td>
                  <td className="px-4 py-2 text-right font-mono">
                    Bs. {formatBs(datos.utilidadEjercicio)}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="bg-purple-50 border-t-2 border-purple-200">
                  <td colSpan={2} className="px-4 py-3 font-bold text-purple-800">TOTAL PATRIMONIO</td>
                  <td className="px-4 py-3 text-right font-bold font-mono text-purple-800">
                    Bs. {formatBs(datos.patrimonio.total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Total Pasivo + Patrimonio */}
          <div className="bg-gray-50 rounded-xl border-2 border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-800">PASIVO + PATRIMONIO</span>
              <span className="font-bold font-mono text-xl text-gray-900">
                Bs. {formatBs(totalPasivoPatrimonio)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Verificación */}
      <div className={`rounded-xl p-4 flex items-center gap-3 ${balanceado ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
        {balanceado ? (
          <>
            <CheckCircle className="w-6 h-6 text-green-600" />
            <div>
              <p className="font-semibold text-green-800">Balance cuadrado</p>
              <p className="text-sm text-green-600">Activo (Bs. {formatBs(datos.activo.total)}) = Pasivo + Patrimonio (Bs. {formatBs(totalPasivoPatrimonio)})</p>
            </div>
          </>
        ) : (
          <>
            <AlertCircle className="w-6 h-6 text-red-600" />
            <div>
              <p className="font-semibold text-red-800">El balance NO cuadra</p>
              <p className="text-sm text-red-600">Diferencia: Bs. {formatBs(Math.abs(datos.activo.total - totalPasivoPatrimonio))}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

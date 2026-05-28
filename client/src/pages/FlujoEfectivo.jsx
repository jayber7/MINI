import { useState, useEffect, createElement } from 'react';
import api from '../services/api';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

export default function FlujoEfectivo() {
  const [data, setData] = useState(null);
  const [gestiones, setGestiones] = useState([]);
  const [gestionId, setGestionId] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    api.get('/gestiones').then(({ data }) => setGestiones(data)).catch(() => {});
  }, []);

  useEffect(() => {
    const cargar = async () => {
      setCargando(true);
      try {
        const { data } = await api.get('/reportes/flujo-efectivo', { params: { gestionId: gestionId || undefined } });
        setData(data);
      } catch (e) { /* ignore */ }
      setCargando(false);
    };
    cargar();
  }, [gestionId]);

  const seccionIcon = {
    operacion: ArrowUpRight,
    inversion: ArrowDownRight,
    financiamiento: Minus,
  };

  const seccionColor = {
    operacion: 'text-green-600',
    inversion: 'text-amber-600',
    financiamiento: 'text-blue-600',
    sinClasificar: 'text-gray-400',
  };

  const seccionLabel = {
    operacion: 'Actividades de Operación',
    inversion: 'Actividades de Inversión',
    financiamiento: 'Actividades de Financiamiento',
    sinClasificar: 'Sin Clasificar',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Flujo de Efectivo</h1>
        <select value={gestionId} onChange={e => setGestionId(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="">Todas las gestiones</option>
          {gestiones.map(g => <option key={g.id} value={g.id}>Gestión {g.year}</option>)}
        </select>
      </div>

      {cargando ? (
        <div className="text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" /></div>
      ) : !data ? (
        <div className="text-center py-12 text-gray-400">No hay datos</div>
      ) : (
        <div className="space-y-4">
          {/* Resumen */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['operacion', 'inversion', 'financiamiento'].map(key => {
              const s = data[key];
              return (
                <div key={key} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-2 rounded-lg ${key === 'operacion' ? 'bg-green-100' : key === 'inversion' ? 'bg-amber-100' : 'bg-blue-100'}`}>
                      {createElement(seccionIcon[key], { className: `w-5 h-5 ${seccionColor[key]}` })}
                    </div>
                    <span className="text-sm font-medium text-gray-600">{seccionLabel[key]}</span>
                  </div>
                  <p className={`text-2xl font-bold ${s.neto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {s.neto >= 0 ? '+' : ''}Bs. {s.neto.toFixed(2)}
                  </p>
                  <div className="flex gap-4 mt-1 text-sm text-gray-500">
                    <span>+ Bs. {s.ingresos.toFixed(2)}</span>
                    <span>- Bs. {s.egresos.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detalle por sección */}
          {['operacion', 'inversion', 'financiamiento', 'sinClasificar'].map(key => {
            const s = data[key];
            if (!s || s.items.length === 0 && s.neto === 0) return null;
            return (
              <div key={key} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className={`px-4 py-3 border-b flex items-center justify-between ${key === 'operacion' ? 'bg-green-50' : key === 'inversion' ? 'bg-amber-50' : key === 'financiamiento' ? 'bg-blue-50' : 'bg-gray-50'}`}>
                  <span className="font-bold text-sm">{seccionLabel[key]}</span>
                  <span className={`font-bold text-sm ${s.neto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {s.neto >= 0 ? '+' : ''}Bs. {s.neto.toFixed(2)}
                  </span>
                </div>
                {s.items.length > 0 && (
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Nº</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Glosa</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Cuenta</th>
                        <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {s.items.map((item, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm">{item.fecha}</td>
                          <td className="px-4 py-2 text-sm font-mono">{item.numero}</td>
                          <td className="px-4 py-2 text-sm">{item.glosa}</td>
                          <td className="px-4 py-2 text-sm text-gray-600">{item.cuenta}</td>
                          <td className={`px-4 py-2 text-sm text-right font-medium ${item.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                            {item.tipo === 'ingreso' ? '+' : '-'}Bs. {item.monto.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}

          {/* Saldo Final */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold">Saldo Final del Período</span>
              <span className={`text-2xl font-bold ${data.saldoFinal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                Bs. {data.saldoFinal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingCart, Package,
  AlertTriangle, Bell, FileText, CreditCard, BarChart3, PieChart,
  ArrowRight, Circle,
} from 'lucide-react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  ArcElement, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler);

const monthColors = {
  danger: { bg: 'bg-red-50 border-red-200', icon: 'text-red-600', text: 'text-red-800' },
  warning: { bg: 'bg-yellow-50 border-yellow-200', icon: 'text-yellow-600', text: 'text-yellow-800' },
  info: { bg: 'bg-blue-50 border-blue-200', icon: 'text-blue-600', text: 'text-blue-800' },
  success: { bg: 'bg-green-50 border-green-200', icon: 'text-green-600', text: 'text-green-800' },
};

function formatBs(n) { return 'Bs ' + (n || 0).toLocaleString('es-BO', { minimumFractionDigits: 2 }); }

function KpiCard({ icon: Icon, label, value, sub, variacion, color }) {
  const pos = variacion > 0;
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition">
      <div className="flex items-start justify-between">
        <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${color === 'blue' ? 'bg-blue-100' : color === 'green' ? 'bg-green-100' : color === 'orange' ? 'bg-orange-100' : color === 'purple' ? 'bg-purple-100' : 'bg-gray-100'}`}>
          <Icon className={`w-5 h-5 ${color === 'blue' ? 'text-blue-600' : color === 'green' ? 'text-green-600' : color === 'orange' ? 'text-orange-600' : color === 'purple' ? 'text-purple-600' : 'text-gray-600'}`} />
        </div>
        {variacion !== undefined && (
          <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${pos ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {pos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(variacion)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 mt-3">{formatBs(value)}</p>
      <div className="flex items-center justify-between mt-1">
        <p className="text-sm text-gray-500">{label}</p>
        {sub && <span className="text-xs text-gray-400">{sub}</span>}
      </div>
    </div>
  );
}

function AlertCard({ alerta }) {
  const c = monthColors[alerta.tipo] || monthColors.info;
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${c.bg} ${c.border}`}>
      <AlertTriangle className={`w-5 h-5 ${c.icon} flex-shrink-0 mt-0.5`} />
      <p className={`text-sm ${c.text}`}>{alerta.mensaje}</p>
    </div>
  );
}

export default function Dashboard() {
  const { usuario } = useContext(AuthContext);
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: d } = await api.get('/dashboard');
        setData(d);
      } catch (e) {
        console.error(e);
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-12 text-gray-500">Error al cargar datos del dashboard</div>;
  }

  const k = data.kpis;

  const evolLine = {
    labels: data.evolucion.map(e => e.mes),
    datasets: [
      {
        label: 'Ventas',
        data: data.evolucion.map(e => e.ventas),
        borderColor: '#4f46e5',
        backgroundColor: 'rgba(79,70,229,0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
      },
      {
        label: 'Compras',
        data: data.evolucion.map(e => e.compras),
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245,158,11,0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
      },
    ],
  };

  const donutData = {
    labels: data.ventasPorCategoria.map(c => c.categoria),
    datasets: [{
      data: data.ventasPorCategoria.map(c => c.total),
      backgroundColor: ['#4f46e5', '#06b6d4', '#f59e0b', '#10b981', '#ef4444'],
      borderWidth: 0,
    }],
  };

  const donutOptions = {
    cutout: '70%',
    plugins: {
      legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16, font: { size: 11 } } },
    },
  };

  return (
    <div className="space-y-6">

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard icon={DollarSign} label="Ventas del Día" value={k.ventasDia.total} sub={`${k.ventasDia.transacciones} transacciones`} color="blue" />
        <KpiCard icon={TrendingUp} label="Ventas del Mes" value={k.ventasMes.total} variacion={k.ventasMes.variacion} color="green" />
        <KpiCard icon={ShoppingCart} label="Compras del Mes" value={k.comprasMes.total} variacion={k.comprasMes.variacion} color="orange" />
        <KpiCard icon={BarChart3} label="Utilidad del Mes" value={k.utilidadMes.total} variacion={k.utilidadMes.variacion} color="purple" />
        <KpiCard icon={CreditCard} label="Efectivo en Caja" value={k.efectivoCaja.total} color="gray" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Evolución chart */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Evolución Ventas vs Compras</h3>
          <Line data={evolLine} options={{
            responsive: true,
            scales: {
              y: { beginAtZero: true, ticks: { callback: v => 'Bs ' + (v / 1000).toFixed(0) + 'k' } },
            },
            plugins: { legend: { position: 'top', labels: { usePointStyle: true } } },
          }} />
        </div>

        {/* Donut + alerts */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Ventas por Categoría</h3>
            <Doughnut data={donutData} options={donutOptions} />
          </div>
        </div>
      </div>

      {/* Tables row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Últimas Ventas */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Últimas Ventas</h3>
            <Link to="/ventas" className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
              Ver todas <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase bg-gray-50">
                  <th className="px-5 py-3 font-medium">Fecha</th>
                  <th className="px-5 py-3 font-medium">N° Factura</th>
                  <th className="px-5 py-3 font-medium">Cliente</th>
                  <th className="px-5 py-3 font-medium text-right">Monto</th>
                  <th className="px-5 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {data.ultimasVentas.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">Sin ventas registradas</td></tr>
                ) : data.ultimasVentas.map((v, i) => (
                  <tr key={i} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3 text-gray-600">{v.fecha}</td>
                    <td className="px-5 py-3 font-medium text-gray-900">{v.numeroFactura}</td>
                    <td className="px-5 py-3 text-gray-600">{v.cliente}</td>
                    <td className="px-5 py-3 text-right font-medium">{formatBs(v.monto)}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${v.pagado === 'Pagado' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        <Circle className="w-1.5 h-1.5 fill-current" />
                        {v.pagado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Alertas */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Bell className="w-4 h-4 text-gray-400" />
              Alertas y Notificaciones
            </h3>
            <div className="space-y-2">
              {data.alertas.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Sin alertas pendientes</p>
              ) : data.alertas.map((a, i) => <AlertCard key={i} alerta={a} />)}
            </div>
          </div>

          {/* Resumen Financiero */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Resumen Financiero</h3>
            <div className="space-y-2">
              {[
                { label: 'Ventas', value: data.resumenFinanciero.ventas, color: 'text-blue-600' },
                { label: 'Compras', value: data.resumenFinanciero.compras, color: 'text-orange-600' },
                { label: 'Gastos Operativos', value: data.resumenFinanciero.gastosOperativos, color: 'text-gray-600' },
                { label: 'Utilidad Bruta', value: data.resumenFinanciero.utilidadBruta, color: 'text-green-600', bold: true },
                { label: 'Gastos Administrativos', value: data.resumenFinanciero.gastosAdministrativos, color: 'text-gray-600' },
                { label: 'Utilidad Neta', value: data.resumenFinanciero.utilidadNeta, color: 'text-green-700', bold: true, border: true },
              ].map((item, i) => (
                <div key={i} className={`flex justify-between text-sm ${item.border ? 'border-t border-gray-200 pt-2 mt-2' : ''}`}>
                  <span className="text-gray-600">{item.label}</span>
                  <span className={`font-medium ${item.bold ? 'font-bold' : ''} ${item.color}`}>{formatBs(item.value)}</span>
                </div>
              ))}
            </div>
            <Link to="/estado-resultados" className="mt-3 text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
              Ver Estado de Resultados <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Productos Más Vendidos */}
      {data.productosMasVendidos.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Package className="w-4 h-4 text-gray-400" />
              Productos Más Vendidos (Mes)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase bg-gray-50">
                  <th className="px-5 py-3 font-medium">Producto</th>
                  <th className="px-5 py-3 font-medium">Categoría</th>
                  <th className="px-5 py-3 font-medium text-right">Cantidad</th>
                  <th className="px-5 py-3 font-medium text-right">Total Recaudado</th>
                </tr>
              </thead>
              <tbody>
                {data.productosMasVendidos.map((p, i) => (
                  <tr key={i} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">{p.nombre}</td>
                    <td className="px-5 py-3 text-gray-600">{p.categoria}</td>
                    <td className="px-5 py-3 text-right text-gray-600">{p.cantidad}</td>
                    <td className="px-5 py-3 text-right font-medium">{formatBs(p.total)}</td>
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

import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Package, AlertTriangle } from 'lucide-react';

export default function Inventario() {
  const [productos, setProductos] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [tab, setTab] = useState('productos');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showMov, setShowMov] = useState(false);
  const [kardex, setKardex] = useState([]);
  const [kardexProducto, setKardexProducto] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ codigo: '', nombre: '', categoria: '', subcategoria: '', unidadMedida: 'UNIDAD', ubicacion: '', stockActual: 0, stockMinimo: 0, stockMaximo: 999999, costoUnitario: 0, precioVenta: 0 });
  const [movForm, setMovForm] = useState({ tipo: 'entrada', cantidad: 1, costoUnitario: 0, productoId: '', documentoRef: '', motivo: '' });

  const cargar = async () => {
    const { data } = await api.get('/productos', { params: { search: search || undefined } });
    setProductos(data);
    try {
      const { data: alert } = await api.get('/productos/alertas-stock');
      setAlertas(alert);
    } catch { /* ignore */ }
  };

  useEffect(() => { cargar(); }, [search]);

  const guardar = async () => {
    try {
      if (editing) {
        await api.put(`/productos/${editing.id}`, form);
        toast.success('Producto actualizado');
      } else {
        await api.post('/productos', form);
        toast.success('Producto creado');
      }
      setShowForm(false);
      setEditing(null);
      setForm({ codigo: '', nombre: '', categoria: '', subcategoria: '', unidadMedida: 'UNIDAD', ubicacion: '', stockActual: 0, stockMinimo: 0, stockMaximo: 999999, costoUnitario: 0, precioVenta: 0 });
      cargar();
    } catch { toast.error('Error al guardar'); }
  };

  const verKardex = async (prod) => {
    try {
      const { data } = await api.get(`/productos/${prod.id}/kardex`);
      setKardex(data);
      setKardexProducto(prod);
    } catch { toast.error('Error al cargar kardex'); }
  };

  const registrarMovimiento = async () => {
    try {
      await api.post('/productos/movimiento', movForm);
      toast.success('Movimiento registrado');
      setShowMov(false);
      setMovForm({ tipo: 'entrada', cantidad: 1, costoUnitario: 0, productoId: '', documentoRef: '', motivo: '' });
      cargar();
    } catch { toast.error('Error al registrar'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Inventario</h1>
        <div className="flex gap-2">
          <button onClick={() => { setShowMov(true); setMovForm({ ...movForm, costoUnitario: 0 }); }} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium">
            + Movimiento
          </button>
          <button onClick={() => { setShowForm(true); setEditing(null); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">
            + Producto
          </button>
        </div>
      </div>

      {/* Alertas */}
      {alertas.length > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <span className="text-sm text-red-700 font-medium">{alertas.length} producto(s) con stock bajo</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {['productos', 'alertas', 'kardex'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === t ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-300'}`}>
            {t === 'productos' ? 'Productos' : t === 'alertas' ? `Alertas (${alertas.length})` : 'Kardex'}
          </button>
        ))}
      </div>

      {tab === 'productos' && (
        <>
          <div className="mb-4">
            <input type="text" placeholder="Buscar producto..." value={search} onChange={e => setSearch(e.target.value)} className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Código</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Producto</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Categoría</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Stock</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Costo U.</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Precio V.</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {productos.map(p => (
                  <tr key={p.id} className={`hover:bg-gray-50 ${p.stockActual <= p.stockMinimo ? 'bg-red-50' : ''}`}>
                    <td className="px-4 py-3 text-sm font-mono">{p.codigo}</td>
                    <td className="px-4 py-3 text-sm font-medium">{p.nombre}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{p.categoria}</td>
                    <td className={`px-4 py-3 text-sm text-right font-bold ${p.stockActual <= p.stockMinimo ? 'text-red-600' : 'text-gray-900'}`}>{p.stockActual} {p.unidadMedida}</td>
                    <td className="px-4 py-3 text-sm text-right">Bs. {p.costoUnitario.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-right">Bs. {p.precioVenta.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => { setForm(p); setEditing(p); setShowForm(true); }} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium mr-2">Editar</button>
                      <button onClick={() => { verKardex(p); setTab('kardex'); }} className="text-amber-600 hover:text-amber-800 text-sm font-medium">Kardex</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'alertas' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {alertas.map(p => (
            <div key={p.id} className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div>
                <span className="font-medium text-sm">{p.nombre}</span>
                <span className="text-gray-500 text-sm ml-2">({p.codigo})</span>
              </div>
              <div className="text-right">
                <span className="text-red-600 font-bold text-sm">{p.stockActual}</span>
                <span className="text-gray-400 text-sm mx-1">/</span>
                <span className="text-gray-600 text-sm">{p.stockMinimo} mín.</span>
              </div>
            </div>
          ))}
          {alertas.length === 0 && <p className="text-center text-gray-400 py-8 text-sm">No hay alertas de stock</p>}
        </div>
      )}

      {tab === 'kardex' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {kardexProducto && (
            <div className="px-4 py-3 border-b bg-gray-50">
              <span className="font-bold text-sm">{kardexProducto.nombre}</span>
              <span className="text-gray-500 text-sm ml-2">Stock: {kardexProducto.stockActual}</span>
            </div>
          )}
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tipo</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Cantidad</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Costo U.</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Antes</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Después</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ref.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {kardex.map(m => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{m.fecha}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${m.tipo === 'entrada' ? 'bg-green-100 text-green-800' : m.tipo === 'salida' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>{m.tipo}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium">{m.cantidad}</td>
                  <td className="px-4 py-3 text-sm text-right">Bs. {m.costoUnitario.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-right">{m.stockAnterior}</td>
                  <td className="px-4 py-3 text-sm text-right font-bold">{m.stockPosterior}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{m.documentoRef || '-'}</td>
                </tr>
              ))}
              {kardex.length === 0 && <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-400 text-sm">Seleccione un producto y vea "Kardex"</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">{editing ? 'Editar' : 'Nuevo'} Producto</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Código</label><input type="text" value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label><input type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label><input type="text" value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
                  <select value={form.unidadMedida} onChange={e => setForm({ ...form, unidadMedida: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option>UNIDAD</option><option>KG</option><option>L</option><option>M</option><option>CAJA</option><option>PAQ</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Stock Actual</label><input type="number" value={form.stockActual} onChange={e => setForm({ ...form, stockActual: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Stock Mín.</label><input type="number" value={form.stockMinimo} onChange={e => setForm({ ...form, stockMinimo: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Stock Máx.</label><input type="number" value={form.stockMaximo} onChange={e => setForm({ ...form, stockMaximo: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Costo Unitario (Bs.)</label><input type="number" step="0.01" value={form.costoUnitario} onChange={e => setForm({ ...form, costoUnitario: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Precio Venta (Bs.)</label><input type="number" step="0.01" value={form.precioVenta} onChange={e => setForm({ ...form, precioVenta: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancelar</button>
              <button onClick={guardar} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">{editing ? 'Actualizar' : 'Crear'}</button>
            </div>
          </div>
        </div>
      )}

      {showMov && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowMov(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">Registrar Movimiento</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Producto</label>
                <select value={movForm.productoId} onChange={e => {
                  const p = productos.find(x => x.id === parseInt(e.target.value));
                  setMovForm({ ...movForm, productoId: e.target.value, costoUnitario: p?.costoUnitario || 0 });
                }} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="">Seleccionar...</option>
                  {productos.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.codigo})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select value={movForm.tipo} onChange={e => setMovForm({ ...movForm, tipo: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="entrada">Entrada</option>
                    <option value="salida">Salida</option>
                    <option value="ajuste">Ajuste</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
                  <input type="number" value={movForm.cantidad} onChange={e => setMovForm({ ...movForm, cantidad: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Costo Unitario (Bs.)</label>
                <input type="number" step="0.01" value={movForm.costoUnitario} onChange={e => setMovForm({ ...movForm, costoUnitario: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Documento Ref.</label>
                <input type="text" value={movForm.documentoRef} onChange={e => setMovForm({ ...movForm, documentoRef: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
                <input type="text" value={movForm.motivo} onChange={e => setMovForm({ ...movForm, motivo: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowMov(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancelar</button>
              <button onClick={registrarMovimiento} className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700">Registrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

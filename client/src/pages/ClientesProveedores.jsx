import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';

export default function ClientesProveedores() {
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [filtro, setFiltro] = useState('');
  const [form, setForm] = useState({ tipo: 'cliente', nit: '', razonSocial: '', direccion: '', telefono: '', email: '', contacto: '' });

  const cargar = async () => {
    const { data } = await api.get('/clientes-proveedores', { params: { search: filtro || undefined } });
    setItems(data);
  };

  useEffect(() => { cargar(); }, [filtro]);

  const guardar = async () => {
    try {
      if (editing) {
        await api.put(`/clientes-proveedores/${editing.id}`, form);
        toast.success('Actualizado');
      } else {
        await api.post('/clientes-proveedores', form);
        toast.success('Creado');
      }
      setShowForm(false);
      setEditing(null);
      setForm({ tipo: 'cliente', nit: '', razonSocial: '', direccion: '', telefono: '', email: '', contacto: '' });
      cargar();
    } catch (e) {
      toast.error('Error al guardar');
    }
  };

  const editar = (item) => {
    setForm(item);
    setEditing(item);
    setShowForm(true);
  };

  const eliminar = async () => {
    try {
      await api.delete(`/clientes-proveedores/${deleteId}`);
      toast.success('Eliminado');
      setDeleteId(null);
      cargar();
    } catch (e) {
      toast.error('Error al eliminar');
    }
  };

  const tipoBadge = (tipo) => {
    const colors = { cliente: 'bg-blue-100 text-blue-800', proveedor: 'bg-orange-100 text-orange-800', ambos: 'bg-purple-100 text-purple-800' };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[tipo]}`}>{tipo}</span>;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Clientes / Proveedores</h1>
        <button onClick={() => { setShowForm(true); setEditing(null); setForm({ tipo: 'cliente', nit: '', razonSocial: '', direccion: '', telefono: '', email: '', contacto: '' }); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">
          + Nuevo
        </button>
      </div>

      <div className="mb-4">
        <input type="text" placeholder="Buscar por nombre o NIT..." value={filtro} onChange={e => setFiltro(e.target.value)} className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tipo</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">NIT</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Razón Social</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Teléfono</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Email</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map(item => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">{tipoBadge(item.tipo)}</td>
                <td className="px-4 py-3 text-sm font-mono">{item.nit}</td>
                <td className="px-4 py-3 text-sm font-medium">{item.razonSocial}</td>
                <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">{item.telefono}</td>
                <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">{item.email}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => editar(item)} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium mr-3">Editar</button>
                  <button onClick={() => setDeleteId(item.id)} className="text-red-600 hover:text-red-800 text-sm font-medium">Eliminar</button>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-400 text-sm">No hay registros</td></tr>}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">{editing ? 'Editar' : 'Nuevo'} Cliente/Proveedor</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="cliente">Cliente</option>
                  <option value="proveedor">Proveedor</option>
                  <option value="ambos">Ambos</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">NIT</label>
                  <input type="text" value={form.nit} onChange={e => setForm({ ...form, nit: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Razón Social</label>
                  <input type="text" value={form.razonSocial} onChange={e => setForm({ ...form, razonSocial: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <input type="text" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <input type="text" value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contacto</label>
                <input type="text" value={form.contacto} onChange={e => setForm({ ...form, contacto: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancelar</button>
              <button onClick={guardar} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">{editing ? 'Actualizar' : 'Crear'}</button>
            </div>
          </div>
        </div>
      )}

      {deleteId && <ConfirmModal titulo="Eliminar" mensaje="¿Eliminar este registro?" danger onConfirm={eliminar} onCancel={() => setDeleteId(null)} />}
    </div>
  );
}

import { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Edit2, Trash2, CheckCircle, FileText, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';

export default function Retenciones() {
  const [retenciones, setRetenciones] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editando, setEditando] = useState(null);
  const [modalConfirm, setModalConfirm] = useState({ isOpen: false, type: '', id: null });

  const [form, setForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    glosa: '',
    numero: '',
    tipo: 8,
    importe: 0,
    incremento: false,
    debe: '',
    haber: '',
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const [retRes, cuentasRes] = await Promise.all([
        api.get('/retenciones'),
        api.get('/plan-cuentas'),
      ]);
      setRetenciones(retRes.data.retenciones || (Array.isArray(retRes.data) ? retRes.data : []));
      setCuentas(cuentasRes.data);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setCargando(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const datos = { ...form, importe: parseFloat(form.importe) };
      if (editando) {
        await api.put(`/retenciones/${editando.id}`, datos);
        toast.success('Retención actualizada correctamente');
      } else {
        await api.post('/retenciones', datos);
        toast.success('Retención creada correctamente');
      }
      resetForm();
      cargarDatos();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al guardar retención');
    }
  };

  const handleContabilizar = async (id) => {
    try {
      await api.post(`/retenciones/${id}/contabilizar`);
      toast.success('Retención contabilizada correctamente');
      cargarDatos();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al contabilizar');
    }
  };

  const handleEdit = (ret) => {
    setEditando(ret);
    setForm({
      fecha: ret.fecha,
      glosa: ret.glosa || '',
      numero: ret.numero,
      tipo: ret.tipo,
      importe: parseFloat(ret.importe),
      incremento: ret.incremento,
      debe: ret.debe || '',
      haber: ret.haber || '',
    });
    setMostrarFormulario(true);
  };

  const handleDelete = (id) => {
    setModalConfirm({ isOpen: true, type: 'eliminar', id });
  };

  const handleConfirmAction = async () => {
    try {
      if (modalConfirm.type === 'eliminar') {
        await api.delete(`/retenciones/${modalConfirm.id}`);
        toast.success('Retención eliminada correctamente');
      }
      cargarDatos();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al eliminar');
    }
  };

  const resetForm = () => {
    setForm({
      fecha: new Date().toISOString().split('T')[0],
      glosa: '',
      numero: '',
      tipo: 8,
      importe: 0,
      incremento: false,
      debe: '',
      haber: '',
    });
    setEditando(null);
    setMostrarFormulario(false);
  };

  const getCuentaNombre = (codigo) => {
    const cuenta = cuentas.find((c) => c.codigo === codigo);
    return cuenta ? `${cuenta.codigo} - ${cuenta.nombre}` : codigo;
  };

  const calcularMonto = () => {
    const tasa = form.tipo === 15 ? 0.155 : 0.08;
    const importe = parseFloat(form.importe) || 0;
    if (form.incremento) {
      return (importe * tasa / (1 - tasa)).toFixed(2);
    }
    return (importe * tasa).toFixed(2);
  };

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
        <h1 className="text-2xl font-bold text-gray-900">Retenciones RC-IVA</h1>
        <button
          onClick={() => setMostrarFormulario(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
        >
          <Plus className="w-4 h-4" />
          Nueva Retención
        </button>
      </div>

      {/* Formulario */}
      {mostrarFormulario && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold mb-4">
            {editando ? 'Editar Retención' : 'Nueva Retención'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                <input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nº</label>
                <input type="number" value={form.numero} onChange={(e) => setForm({ ...form, numero: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo RC-IVA</label>
                <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  <option value={8}>RC-IVA 8%</option>
                  <option value={15}>RC-IVA 15.5%</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Importe Base</label>
                <input type="number" step="0.01" value={form.importe} onChange={(e) => setForm({ ...form, importe: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Glosa</label>
                <input type="text" value={form.glosa} onChange={(e) => setForm({ ...form, glosa: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Descripción" />
              </div>
              <div className="flex items-center gap-3 mt-6">
                <input type="checkbox" checked={form.incremento} onChange={(e) => setForm({ ...form, incremento: e.target.checked })} className="w-4 h-4" />
                <label className="text-sm text-gray-700">Importe es incremental</label>
              </div>
              <div className="mt-6 p-2 bg-indigo-50 rounded-lg text-center">
                <span className="text-xs text-indigo-600">Monto calculado:</span>
                <p className="text-lg font-bold text-indigo-800">Bs. {calcularMonto()}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cuenta Debe (código)</label>
                <select value={form.debe} onChange={(e) => setForm({ ...form, debe: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required>
                  <option value="">Seleccionar cuenta</option>
                  {cuentas.map((c) => (<option key={c.id} value={c.codigo}>{c.codigo} - {c.nombre}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cuenta Haber (código)</label>
                <select value={form.haber} onChange={(e) => setForm({ ...form, haber: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required>
                  <option value="">Seleccionar cuenta</option>
                  {cuentas.map((c) => (<option key={c.id} value={c.codigo}>{c.codigo} - {c.nombre}</option>))}
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition">
                {editando ? 'Actualizar' : 'Guardar'}
              </button>
              <button type="button" onClick={resetForm} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nº</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Importe Base</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto RC-IVA</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {retenciones.map((r) => {
              const tasa = r.tipo === 15 ? 0.155 : 0.08;
              const monto = r.incremento
                ? parseFloat(r.importe) * tasa / (1 - tasa)
                : parseFloat(r.importe) * tasa;
              return (
                <tr key={r.id} className={`hover:bg-gray-50 ${r.contabilizado ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3 font-mono text-sm">{r.numero}</td>
                  <td className="px-4 py-3 text-sm">{r.fecha}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-700">
                      RC-IVA {r.tipo === 15 ? '15.5' : '8'}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm">Bs. {parseFloat(r.importe).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-mono text-sm font-semibold">Bs. {monto.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    {r.contabilizado ? (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 flex items-center gap-1 w-fit">
                        <CheckCircle className="w-3 h-3" /> Contabilizado
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                        Pendiente
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {!r.contabilizado && (
                        <button onClick={() => handleContabilizar(r.id)} className="p-1.5 text-gray-500 hover:text-green-600 transition" title="Contabilizar">
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      {!r.contabilizado && (
                        <button onClick={() => handleEdit(r)} className="p-1.5 text-gray-500 hover:text-indigo-600 transition" title="Editar">
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {!r.contabilizado && (
                        <button onClick={() => handleDelete(r.id)} className="p-1.5 text-gray-500 hover:text-red-600 transition" title="Eliminar">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {retenciones.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No hay retenciones registradas</p>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={modalConfirm.isOpen}
        onClose={() => setModalConfirm({ isOpen: false, type: '', id: null })}
        onConfirm={handleConfirmAction}
        title="Eliminar Retención"
        message="¿Está seguro de eliminar esta retención?"
        confirmText="Eliminar"
        variant="danger"
      />
    </div>
  );
}

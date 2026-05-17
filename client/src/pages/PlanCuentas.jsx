import { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Edit2, Trash2, ChevronRight, ChevronDown, FolderOpen, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';

export default function PlanCuentas() {
  const [cuentas, setCuentas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editando, setEditando] = useState(null);
  const [expandidas, setExpandidas] = useState({});
  const [modalConfirm, setModalConfirm] = useState({ isOpen: false, id: null });
  const [busqueda, setBusqueda] = useState('');
  const [form, setForm] = useState({
    codigo: '',
    nombre: '',
    nivel: 1,
    padreId: null,
    tipo: 'Activo',
    clase: 'Real',
    codigoSiat: '',
    cuentaSiat: '',
  });

  useEffect(() => {
    cargarCuentas();
  }, []);

  const cargarCuentas = async () => {
    try {
      const { data } = await api.get('/plan-cuentas');
      setCuentas(data);
    } catch (error) {
      console.error('Error cargando plan de cuentas:', error);
    } finally {
      setCargando(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editando) {
        await api.put(`/plan-cuentas/${editando.id}`, form);
        toast.success('Cuenta actualizada correctamente');
      } else {
        await api.post('/plan-cuentas', form);
        toast.success('Cuenta creada correctamente');
      }
      resetForm();
      cargarCuentas();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al guardar cuenta');
    }
  };

  const handleEdit = (cuenta) => {
    setEditando(cuenta);
    setForm({
      codigo: cuenta.codigo,
      nombre: cuenta.nombre,
      nivel: cuenta.nivel,
      padreId: cuenta.padreId,
      tipo: cuenta.tipo,
      clase: cuenta.clase || 'Real',
      codigoSiat: cuenta.codigoSiat || '',
      cuentaSiat: cuenta.cuentaSiat || '',
    });
    setMostrarFormulario(true);
  };

  const handleDelete = (id) => {
    setModalConfirm({ isOpen: true, id });
  };

  const handleConfirmDelete = async () => {
    try {
      await api.delete(`/plan-cuentas/${modalConfirm.id}`);
      toast.success('Cuenta eliminada correctamente');
      cargarCuentas();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al eliminar cuenta');
    }
  };

  const toggleExpandir = (id) => {
    setExpandidas((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const resetForm = () => {
    setForm({ codigo: '', nombre: '', nivel: 1, padreId: null, tipo: 'Activo', clase: 'Real', codigoSiat: '', cuentaSiat: '' });
    setEditando(null);
    setMostrarFormulario(false);
  };

  const construirArbol = (cuentas) => {
    const mapa = {};
    const raices = [];

    cuentas.forEach((c) => {
      mapa[c.id] = { ...c, hijos: [] };
    });

    cuentas.forEach((c) => {
      if (c.padreId && mapa[c.padreId]) {
        mapa[c.padreId].hijos.push(mapa[c.id]);
      } else {
        raices.push(mapa[c.id]);
      }
    });

    return raices;
  };

  const renderArbol = (nodos, nivel = 0) => {
    return nodos.map((nodo) => {
      const tieneHijos = nodo.hijos && nodo.hijos.length > 0;
      const expandida = expandidas[nodo.id];

      return (
        <div key={nodo.id}>
          <div
            className={`flex items-center justify-between py-2 px-3 hover:bg-gray-50 border-b border-gray-50 ${
              nivel > 0 ? 'pl-' + (nivel * 6 + 3) : ''
            }`}
            style={{ paddingLeft: `${nivel * 24 + 12}px` }}
          >
            <div className="flex items-center gap-2 flex-1">
              {tieneHijos ? (
                <button
                  onClick={() => toggleExpandir(nodo.id)}
                  className="p-0.5 hover:bg-gray-200 rounded transition"
                >
                  {expandida ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                </button>
              ) : (
                <span className="w-5" />
              )}
              {tieneHijos ? (
                <FolderOpen className="w-4 h-4 text-indigo-500" />
              ) : (
                <FileText className="w-4 h-4 text-gray-400" />
              )}
              <span className="font-mono text-sm text-indigo-600 font-medium min-w-[80px]">
                {nodo.codigo}
              </span>
              <span className="text-sm text-gray-700">{nodo.nombre}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                nodo.tipo === 'Activo' ? 'bg-green-100 text-green-700' :
                nodo.tipo === 'Pasivo' ? 'bg-red-100 text-red-700' :
                nodo.tipo === 'Patrimonio' ? 'bg-purple-100 text-purple-700' :
                nodo.tipo === 'Ingreso' ? 'bg-blue-100 text-blue-700' :
                nodo.tipo === 'Gasto' ? 'bg-orange-100 text-orange-700' :
                nodo.tipo === 'Orden' ? 'bg-teal-100 text-teal-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                {nodo.tipo}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleEdit(nodo)}
                className="p-1 text-gray-400 hover:text-indigo-600 transition"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDelete(nodo.id)}
                className="p-1 text-gray-400 hover:text-red-600 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          {tieneHijos && expandida && renderArbol(nodo.hijos, nivel + 1)}
        </div>
      );
    });
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const cuentasFiltradas = busqueda
    ? cuentas.filter(c =>
        c.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.nombre.toLowerCase().includes(busqueda.toLowerCase())
      )
    : cuentas;

  const arbol = construirArbol(cuentasFiltradas);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plan de Cuentas</h1>
          <p className="text-sm text-gray-500 mt-1">
            {busqueda ? `${cuentasFiltradas.length} de ${cuentas.length} cuentas` : `${cuentas.length} cuentas registradas`}
          </p>
        </div>
        <button
          onClick={() => setMostrarFormulario(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
        >
          <Plus className="w-4 h-4" />
          Nueva Cuenta
        </button>
      </div>

      {/* Búsqueda */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
        <div className="relative max-w-md">
          <input
            type="text"
            placeholder="Buscar por código o nombre..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Formulario */}
      {mostrarFormulario && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold mb-4">
            {editando ? 'Editar Cuenta' : 'Nueva Cuenta'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
              <input
                type="text"
                value={form.codigo}
                onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="Activo">Activo</option>
                <option value="Pasivo">Pasivo</option>
                <option value="Patrimonio">Patrimonio</option>
                <option value="Ingreso">Ingreso</option>
                <option value="Gasto">Gasto</option>
                <option value="Orden">Orden</option>
                <option value="Contingentes">Contingentes</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Clase</label>
              <select
                value={form.clase}
                onChange={(e) => setForm({ ...form, clase: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="Real">Real</option>
                <option value="Nominal">Nominal</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nivel</label>
              <input
                type="number"
                value={form.nivel}
                onChange={(e) => setForm({ ...form, nivel: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                min="1"
                max="5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código SIAT</label>
              <input
                type="text"
                value={form.codigoSiat}
                onChange={(e) => setForm({ ...form, codigoSiat: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cuenta SIAT</label>
              <input
                type="text"
                value={form.cuentaSiat}
                onChange={(e) => setForm({ ...form, cuentaSiat: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="md:col-span-3 flex gap-3">
              <button
                type="submit"
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
              >
                {editando ? 'Actualizar' : 'Crear'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Árbol de cuentas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">Estructura de Cuentas</span>
          <div className="flex gap-3 text-xs">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400"></span>Activo</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400"></span>Pasivo</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-400"></span>Patrimonio</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400"></span>Ingreso</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400"></span>Gasto</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-teal-400"></span>Orden</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400"></span>Contingentes</span>
          </div>
        </div>
        <div className="max-h-[600px] overflow-y-auto">
          {arbol.length > 0 ? renderArbol(arbol) : (
            <div className="text-center py-8 text-gray-500">No hay cuentas registradas</div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={modalConfirm.isOpen}
        onClose={() => setModalConfirm({ isOpen: false, id: null })}
        onConfirm={handleConfirmDelete}
        title="Eliminar Cuenta"
        message="¿Está seguro de eliminar esta cuenta? No se puede eliminar si tiene cuentas hijas."
        confirmText="Eliminar"
        variant="danger"
      />
    </div>
  );
}

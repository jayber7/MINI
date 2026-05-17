import { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Edit2, Trash2, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';

export default function Roles() {
  const [roles, setRoles] = useState([]);
  const [permisos, setPermisos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ nombre: '', descripcion: '' });
  const [permisosSeleccionados, setPermisosSeleccionados] = useState([]);
  const [modalConfirm, setModalConfirm] = useState({ isOpen: false, id: null });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const [rolesRes, permisosRes] = await Promise.all([
        api.get('/roles'),
        api.get('/roles/permisos'),
      ]);
      setRoles(rolesRes.data);
      setPermisos(permisosRes.data);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setCargando(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editando) {
        await api.put(`/roles/${editando.id}`, form);
        toast.success('Rol actualizado correctamente');
      } else {
        await api.post('/roles', form);
        toast.success('Rol creado correctamente');
      }
      resetForm();
      cargarDatos();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al guardar rol');
    }
  };

  const handleEdit = (rol) => {
    setEditando(rol);
    setForm({ nombre: rol.nombre, descripcion: rol.descripcion || '' });
    setPermisosSeleccionados(rol.Permisos?.map((p) => p.id) || []);
    setMostrarFormulario(true);
  };

  const handleDelete = (id) => {
    setModalConfirm({ isOpen: true, id });
  };

  const handleConfirmDelete = async () => {
    try {
      await api.delete(`/roles/${modalConfirm.id}`);
      toast.success('Rol eliminado correctamente');
      cargarDatos();
    } catch (error) {
      toast.error('Error al eliminar rol');
    }
  };

  const handleGuardarPermisos = async (rol) => {
    try {
      await api.put(`/roles/${rol.id}/permisos`, { permisosIds: permisosSeleccionados });
      toast.success('Permisos actualizados correctamente');
      cargarDatos();
    } catch (error) {
      toast.error('Error al guardar permisos');
    }
  };

  const togglePermiso = (permisoId) => {
    setPermisosSeleccionados((prev) =>
      prev.includes(permisoId)
        ? prev.filter((id) => id !== permisoId)
        : [...prev, permisoId]
    );
  };

  const resetForm = () => {
    setForm({ nombre: '', descripcion: '' });
    setEditando(null);
    setPermisosSeleccionados([]);
    setMostrarFormulario(false);
  };

  const permisosPorModulo = permisos.reduce((acc, p) => {
    if (!acc[p.modulo]) acc[p.modulo] = [];
    acc[p.modulo].push(p);
    return acc;
  }, {});

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
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Roles</h1>
        <button
          onClick={() => setMostrarFormulario(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
        >
          <Plus className="w-4 h-4" />
          Nuevo Rol
        </button>
      </div>

      {/* Formulario */}
      {mostrarFormulario && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold mb-4">
            {editando ? 'Editar Rol' : 'Nuevo Rol'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <input
                  type="text"
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
            <div className="flex gap-3">
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

      {/* Lista de roles */}
      <div className="grid gap-6">
        {roles.map((rol) => (
          <div key={rol.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 capitalize">{rol.nombre}</h3>
                  <p className="text-sm text-gray-500">{rol.descripcion || 'Sin descripción'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(rol)}
                  className="p-2 text-gray-500 hover:text-indigo-600 transition"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(rol.id)}
                  className="p-2 text-gray-500 hover:text-red-600 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Permisos del rol */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-700">Permisos asignados</h4>
                <button
                  onClick={() => handleGuardarPermisos(rol)}
                  className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-lg hover:bg-indigo-200 transition"
                >
                  Guardar permisos
                </button>
              </div>
              <div className="space-y-3">
                {Object.entries(permisosPorModulo).map(([modulo, permisosModulo]) => (
                  <div key={modulo}>
                    <p className="text-xs font-medium text-gray-500 uppercase mb-1">{modulo}</p>
                    <div className="flex flex-wrap gap-2">
                      {permisosModulo.map((p) => {
                        const seleccionado = rol.Permisos?.some((rp) => rp.id === p.id);
                        return (
                          <button
                            key={p.id}
                            onClick={() => togglePermiso(p.id)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                              seleccionado
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {p.nombre}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {roles.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500 border border-gray-100">
          No hay roles registrados
        </div>
      )}

      <ConfirmModal
        isOpen={modalConfirm.isOpen}
        onClose={() => setModalConfirm({ isOpen: false, id: null })}
        onConfirm={handleConfirmDelete}
        title="Eliminar Rol"
        message="¿Está seguro de eliminar este rol?"
        confirmText="Eliminar"
        variant="danger"
      />
    </div>
  );
}

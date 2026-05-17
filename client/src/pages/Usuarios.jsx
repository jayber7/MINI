import { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Edit2, Trash2, UserCheck, UserX } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editando, setEditando] = useState(null);
  const [modalConfirm, setModalConfirm] = useState({ isOpen: false, id: null });
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    nombreCompleto: '',
    rolId: '',
    activo: true,
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const [usuariosRes, rolesRes] = await Promise.all([
        api.get('/usuarios'),
        api.get('/roles'),
      ]);
      setUsuarios(usuariosRes.data);
      setRoles(rolesRes.data);
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
        await api.put(`/usuarios/${editando.id}`, form);
        toast.success('Usuario actualizado correctamente');
      } else {
        await api.post('/usuarios', form);
        toast.success('Usuario creado correctamente');
      }
      resetForm();
      cargarDatos();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al guardar usuario');
    }
  };

  const handleEdit = (usuario) => {
    setEditando(usuario);
    setForm({
      username: usuario.username,
      email: usuario.email,
      password: '',
      nombreCompleto: usuario.nombreCompleto,
      rolId: usuario.rolId || '',
      activo: usuario.activo,
    });
    setMostrarFormulario(true);
  };

  const handleDelete = (id) => {
    setModalConfirm({ isOpen: true, id });
  };

  const handleConfirmDelete = async () => {
    try {
      await api.delete(`/usuarios/${modalConfirm.id}`);
      toast.success('Usuario eliminado correctamente');
      cargarDatos();
    } catch (error) {
      toast.error('Error al eliminar usuario');
    }
  };

  const handleToggleActivo = async (usuario) => {
    try {
      await api.put(`/usuarios/${usuario.id}`, { activo: !usuario.activo });
      toast.success(`Usuario ${usuario.activo ? 'desactivado' : 'activado'}`);
      cargarDatos();
    } catch (error) {
      toast.error('Error al cambiar estado');
    }
  };

  const resetForm = () => {
    setForm({ username: '', email: '', password: '', nombreCompleto: '', rolId: '', activo: true });
    setEditando(null);
    setMostrarFormulario(false);
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
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
        <button
          onClick={() => setMostrarFormulario(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
        >
          <Plus className="w-4 h-4" />
          Nuevo Usuario
        </button>
      </div>

      {/* Formulario */}
      {mostrarFormulario && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold mb-4">
            {editando ? 'Editar Usuario' : 'Nuevo Usuario'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña {editando && '(dejar vacío para no cambiar)'}
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                required={!editando}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
              <input
                type="text"
                value={form.nombreCompleto}
                onChange={(e) => setForm({ ...form, nombreCompleto: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
              <select
                value={form.rolId}
                onChange={(e) => setForm({ ...form, rolId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">Seleccionar rol</option>
                {roles.map((rol) => (
                  <option key={rol.id} value={rol.id}>
                    {rol.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.activo}
                  onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span className="text-sm text-gray-700">Activo</span>
              </label>
            </div>
            <div className="md:col-span-2 flex gap-3">
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

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {usuarios.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{u.username}</td>
                <td className="px-4 py-3 text-gray-600">{u.email}</td>
                <td className="px-4 py-3 text-gray-600">{u.nombreCompleto}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                    {u.Rol?.nombre || 'Sin rol'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleToggleActivo(u)}
                    className={`flex items-center gap-1 text-xs font-medium ${
                      u.activo ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {u.activo ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleEdit(u)}
                      className="p-1 text-gray-500 hover:text-indigo-600 transition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="p-1 text-gray-500 hover:text-red-600 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {usuarios.length === 0 && (
          <div className="text-center py-8 text-gray-500">No hay usuarios registrados</div>
        )}
      </div>

      <ConfirmModal
        isOpen={modalConfirm.isOpen}
        onClose={() => setModalConfirm({ isOpen: false, id: null })}
        onConfirm={handleConfirmDelete}
        title="Eliminar Usuario"
        message="¿Está seguro de eliminar este usuario?"
        confirmText="Eliminar"
        variant="danger"
      />
    </div>
  );
}

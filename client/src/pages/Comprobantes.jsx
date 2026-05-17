import { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Edit2, Trash2, XCircle, Eye, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';

export default function Comprobantes() {
  const [comprobantes, setComprobantes] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [gestiones, setGestiones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editando, setEditando] = useState(null);
  const [filtros, setFiltros] = useState({ desde: '', hasta: '', tipo: '', estado: '' });
  const [modalConfirm, setModalConfirm] = useState({ isOpen: false, type: '', id: null });
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const porPagina = 10;

  const [form, setForm] = useState({
    numero: '',
    tipoComprobante: 'ingreso',
    glosa: '',
    fecha: new Date().toISOString().split('T')[0],
    gestionId: '',
    detalles: [{ planCuentaId: '', glosa: '', debe: 0, haber: 0 }],
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    setPagina(1);
  }, [busqueda]);

  const cargarDatos = async () => {
    try {
      const [compRes, cuentasRes, gestionesRes] = await Promise.all([
        api.get('/comprobantes'),
        api.get('/plan-cuentas'),
        api.get('/gestiones'),
      ]);
      setComprobantes(compRes.data.comprobantes || (Array.isArray(compRes.data) ? compRes.data : []));
      setCuentas(cuentasRes.data);
      setGestiones(gestionesRes.data);

      if (gestionesRes.data.length > 0) {
        setForm((prev) => ({ ...prev, gestionId: gestionesRes.data[0].id }));
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setCargando(false);
    }
  };

  const handleFiltrar = async () => {
    setPagina(1);
    try {
      const params = {};
      if (filtros.desde) params.desde = filtros.desde;
      if (filtros.hasta) params.hasta = filtros.hasta;
      if (filtros.tipo) params.tipo = filtros.tipo;
      if (filtros.estado) params.estado = filtros.estado;

      const { data } = await api.get('/comprobantes', { params });
      setComprobantes(data.comprobantes || (Array.isArray(data) ? data : []));
    } catch (error) {
      console.error('Error filtrando:', error);
    }
  };

  const agregarDetalle = () => {
    setForm((prev) => ({
      ...prev,
      detalles: [...prev.detalles, { planCuentaId: '', glosa: '', debe: 0, haber: 0 }],
    }));
  };

  const eliminarDetalle = (index) => {
    if (form.detalles.length <= 2) return;
    setForm((prev) => ({
      ...prev,
      detalles: prev.detalles.filter((_, i) => i !== index),
    }));
  };

  const actualizarDetalle = (index, campo, valor) => {
    setForm((prev) => {
      const nuevosDetalles = [...prev.detalles];
      nuevosDetalles[index] = { ...nuevosDetalles[index], [campo]: valor };

      if (campo === 'debe' && parseFloat(valor) > 0) {
        nuevosDetalles[index].haber = 0;
      }
      if (campo === 'haber' && parseFloat(valor) > 0) {
        nuevosDetalles[index].debe = 0;
      }

      return { ...prev, detalles: nuevosDetalles };
    });
  };

  const calcularTotales = () => {
    let totalDebe = 0;
    let totalHaber = 0;
    form.detalles.forEach((d) => {
      totalDebe += parseFloat(d.debe) || 0;
      totalHaber += parseFloat(d.haber) || 0;
    });
    return { totalDebe, totalHaber, balanceado: Math.abs(totalDebe - totalHaber) < 0.01 };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { balanceado } = calcularTotales();
    if (!balanceado) {
      toast.error('El comprobante no está balanceado. La suma del DEBE debe ser igual a la suma del HABER.');
      return;
    }

    const detallesValidos = form.detalles.filter((d) => d.planCuentaId && (d.debe > 0 || d.haber > 0));
    if (detallesValidos.length === 0) {
      toast.error('El comprobante debe tener al menos una línea con cuenta y monto.');
      return;
    }

    try {
      const datos = {
        ...form,
        detalles: detallesValidos,
      };

      if (editando) {
        await api.put(`/comprobantes/${editando.id}`, datos);
        toast.success('Comprobante actualizado correctamente');
      } else {
        await api.post('/comprobantes', datos);
        toast.success('Comprobante creado correctamente');
      }
      resetForm();
      cargarDatos();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al guardar comprobante');
    }
  };

  const handleEdit = async (comp) => {
    try {
      const { data } = await api.get(`/comprobantes/${comp.id}`);
      setEditando(data);
      setForm({
        numero: data.numero,
        tipoComprobante: data.tipoComprobante,
        glosa: data.glosa,
        fecha: data.fecha,
        gestionId: data.gestionId,
        detalles: data.ComprobanteDetalles.map((d) => ({
          planCuentaId: d.planCuentaId,
          glosa: d.glosa || '',
          debe: parseFloat(d.debe),
          haber: parseFloat(d.haber),
        })),
      });
      setMostrarFormulario(true);
    } catch (error) {
      toast.error('Error al cargar comprobante');
    }
  };

  const handleAnular = (id) => {
    setModalConfirm({ isOpen: true, type: 'anular', id });
  };

  const handleDelete = (id) => {
    setModalConfirm({ isOpen: true, type: 'eliminar', id });
  };

  const handleConfirmAction = async () => {
    const { type, id } = modalConfirm;
    try {
      if (type === 'anular') {
        await api.post(`/comprobantes/${id}/anular`);
        toast.success('Comprobante anulado correctamente');
      } else if (type === 'eliminar') {
        await api.delete(`/comprobantes/${id}`);
        toast.success('Comprobante eliminado correctamente');
      }
      cargarDatos();
    } catch (error) {
      toast.error(error.response?.data?.error || `Error al ${type === 'anular' ? 'anular' : 'eliminar'} comprobante`);
    }
  };

  const resetForm = () => {
    setForm({
      numero: '',
      tipoComprobante: 'ingreso',
      glosa: '',
      fecha: new Date().toISOString().split('T')[0],
      gestionId: gestiones[0]?.id || '',
      detalles: [{ planCuentaId: '', glosa: '', debe: 0, haber: 0 }],
    });
    setEditando(null);
    setMostrarFormulario(false);
  };

  const totales = calcularTotales();

  const getCuentaNombre = (id) => {
    const cuenta = cuentas.find((c) => c.id === id);
    return cuenta ? `${cuenta.codigo} - ${cuenta.nombre}` : '';
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
        <h1 className="text-2xl font-bold text-gray-900">Comprobantes Contables</h1>
        <button
          onClick={() => setMostrarFormulario(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
        >
          <Plus className="w-4 h-4" />
          Nuevo Comprobante
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
        <div className="flex gap-3 mb-3">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Buscar por Nº, glosa o usuario..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <input
            type="date"
            value={filtros.desde}
            onChange={(e) => setFiltros({ ...filtros, desde: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            placeholder="Desde"
          />
          <input
            type="date"
            value={filtros.hasta}
            onChange={(e) => setFiltros({ ...filtros, hasta: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            placeholder="Hasta"
          />
          <select
            value={filtros.tipo}
            onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">Todos los tipos</option>
            <option value="ingreso">Ingreso</option>
            <option value="egreso">Egreso</option>
            <option value="traspaso">Traspaso</option>
          </select>
          <select
            value={filtros.estado}
            onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">Todos los estados</option>
            <option value="activo">Activo</option>
            <option value="anulado">Anulado</option>
          </select>
          <button
            onClick={handleFiltrar}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition text-sm"
          >
            Filtrar
          </button>
        </div>
      </div>

      {/* Formulario */}
      {mostrarFormulario && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold mb-4">
            {editando ? 'Editar Comprobante' : 'Nuevo Comprobante'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select
                  value={form.tipoComprobante}
                  onChange={(e) => setForm({ ...form, tipoComprobante: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                >
                  <option value="ingreso">Ingreso</option>
                  <option value="egreso">Egreso</option>
                  <option value="traspaso">Traspaso</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                <input
                  type="date"
                  value={form.fecha}
                  onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gestión</label>
                <select
                  value={form.gestionId}
                  onChange={(e) => setForm({ ...form, gestionId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  {gestiones.map((g) => (
                    <option key={g.id} value={g.id}>{g.year} - {g.glosa}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Glosa</label>
                <input
                  type="text"
                  value={form.glosa}
                  onChange={(e) => setForm({ ...form, glosa: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Descripción del comprobante"
                  required
                />
              </div>
            </div>

            {/* Detalles */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Líneas del Comprobante</label>
                <button
                  type="button"
                  onClick={agregarDetalle}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  + Agregar línea
                </button>
              </div>
              <div className="space-y-2">
                {form.detalles.map((detalle, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-4">
                      <label className="text-xs text-gray-500">Cuenta</label>
                      <select
                        value={detalle.planCuentaId}
                        onChange={(e) => actualizarDetalle(index, 'planCuentaId', parseInt(e.target.value))}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                        required
                      >
                        <option value="">Seleccionar cuenta</option>
                        {cuentas.map((c) => (
                          <option key={c.id} value={c.id}>{c.codigo} - {c.nombre}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-3">
                      <label className="text-xs text-gray-500">Glosa</label>
                      <input
                        type="text"
                        value={detalle.glosa}
                        onChange={(e) => actualizarDetalle(index, 'glosa', e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                        placeholder="Detalle"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs text-gray-500">Debe</label>
                      <input
                        type="number"
                        step="0.01"
                        value={detalle.debe || ''}
                        onChange={(e) => actualizarDetalle(index, 'debe', e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs text-gray-500">Haber</label>
                      <input
                        type="number"
                        step="0.01"
                        value={detalle.haber || ''}
                        onChange={(e) => actualizarDetalle(index, 'haber', e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="col-span-1">
                      <button
                        type="button"
                        onClick={() => eliminarDetalle(index)}
                        className="p-1.5 text-gray-400 hover:text-red-600 transition"
                        disabled={form.detalles.length <= 2}
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totales */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                <div className="flex gap-6">
                  <div>
                    <span className="text-xs text-gray-500">Total DEBE</span>
                    <p className="text-lg font-bold text-green-600">
                      Bs. {totales.totalDebe.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Total HABER</span>
                    <p className="text-lg font-bold text-blue-600">
                      Bs. {totales.totalHaber.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {totales.balanceado ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-sm font-medium text-green-600">Balanceado</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-5 h-5 text-red-500" />
                      <span className="text-sm font-medium text-red-600">
                        Diferencia: Bs. {Math.abs(totales.totalDebe - totales.totalHaber).toFixed(2)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition"
              >
                {editando ? 'Actualizar' : 'Guardar Comprobante'}
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
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nº</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Glosa</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {comprobantes
              .filter(c =>
                !busqueda ||
                String(c.numero).includes(busqueda) ||
                (c.glosa && c.glosa.toLowerCase().includes(busqueda.toLowerCase())) ||
                (c.Usuario && c.Usuario.nombreCompleto && c.Usuario.nombreCompleto.toLowerCase().includes(busqueda.toLowerCase()))
              )
              .slice((pagina - 1) * porPagina, pagina * porPagina)
              .map((c) => (
              <tr key={c.id} className={`hover:bg-gray-50 ${c.estado === 'anulado' ? 'opacity-60' : ''}`}>
                <td className="px-4 py-3 font-mono text-sm font-medium text-indigo-600">
                  {String(c.numero).padStart(4, '0')}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{c.fecha}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    c.tipoComprobante === 'ingreso' ? 'bg-green-100 text-green-700' :
                    c.tipoComprobante === 'egreso' ? 'bg-red-100 text-red-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {c.tipoComprobante.charAt(0).toUpperCase() + c.tipoComprobante.slice(1)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{c.glosa}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    c.estado === 'activo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {c.estado === 'activo' ? 'Activo' : 'Anulado'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => handleEdit(c)}
                      className="p-1.5 text-gray-500 hover:text-indigo-600 transition"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {c.estado === 'activo' && (
                      <button
                        onClick={() => handleAnular(c.id)}
                        className="p-1.5 text-gray-500 hover:text-orange-600 transition"
                        title="Anular"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                    {c.estado === 'activo' && (
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="p-1.5 text-gray-500 hover:text-red-600 transition"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {comprobantes.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No hay comprobantes registrados</p>
          </div>
        )}
      </div>

      {/* Paginación */}
      {(() => {
        const filtrados = comprobantes.filter(c =>
          !busqueda ||
          String(c.numero).includes(busqueda) ||
          (c.glosa && c.glosa.toLowerCase().includes(busqueda.toLowerCase())) ||
          (c.Usuario && c.Usuario.nombreCompleto && c.Usuario.nombreCompleto.toLowerCase().includes(busqueda.toLowerCase()))
        );
        const totalPaginas = Math.ceil(filtrados.length / porPagina);
        if (totalPaginas <= 1) return null;

        return (
          <div className="flex items-center justify-between bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <p className="text-sm text-gray-600">
              Mostrando {(pagina - 1) * porPagina + 1} - {Math.min(pagina * porPagina, filtrados.length)} de {filtrados.length}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPagina(p => Math.max(1, p - 1))}
                disabled={pagina === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPagina(p)}
                  className={`px-3 py-1 text-sm rounded-lg ${
                    p === pagina
                      ? 'bg-indigo-600 text-white'
                      : 'border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                disabled={pagina === totalPaginas}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
          </div>
        );
      })()}

      <ConfirmModal
        isOpen={modalConfirm.isOpen}
        onClose={() => setModalConfirm({ isOpen: false, type: '', id: null })}
        onConfirm={handleConfirmAction}
        title={modalConfirm.type === 'anular' ? 'Anular Comprobante' : 'Eliminar Comprobante'}
        message={
          modalConfirm.type === 'anular'
            ? '¿Está seguro de anular este comprobante? Esta acción no se puede deshacer.'
            : '¿Está seguro de eliminar este comprobante?'
        }
        confirmText={modalConfirm.type === 'anular' ? 'Anular' : 'Eliminar'}
        variant={modalConfirm.type === 'anular' ? 'warning' : 'danger'}
      />
    </div>
  );
}

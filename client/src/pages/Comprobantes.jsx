import { useState, useEffect } from 'react';
import api, { exportarArchivo } from '../services/api';
import toast from 'react-hot-toast';
import { Eye, Printer, MoreVertical, CheckCircle, XCircle, Plus, Edit2, Trash2 } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

const formatBs = (n) => `Bs. ${(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

const docLabels = {
  factura: 'Fact', nota_credito: 'NC', nota_debito: 'ND', recibo: 'Rec',
};

const tipoBadge = (tipo) => {
  const colors = { ingreso: 'bg-green-100 text-green-800', egreso: 'bg-red-100 text-red-800', traspaso: 'bg-blue-100 text-blue-800' };
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[tipo] || 'bg-gray-100'}`}>{tipo}</span>;
};

const estadoBadge = (estado) => {
  const colors = { activo: 'bg-yellow-100 text-yellow-800', contabilizado: 'bg-green-100 text-green-800', anulado: 'bg-red-100 text-red-800' };
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[estado]}`}>{estado}</span>;
};

export default function Comprobantes() {
  const [comprobantes, setComprobantes] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [selected, setSelected] = useState(null);
  const [showPanel, setShowPanel] = useState(false);
  const [kpis, setKpis] = useState(null);
  const [filtros, setFiltros] = useState({ estado: '', documentoTipo: '', search: '' });
  const [menuOpen, setMenuOpen] = useState(null);
  const [confirmAccion, setConfirmAccion] = useState(null);

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editando, setEditando] = useState(null);
  const [cuentas, setCuentas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [gestionActual, setGestionActual] = useState(null);
  const [form, setForm] = useState({
    tipoComprobante: 'ingreso',
    documentoTipo: 'factura',
    documentoNumero: '',
    fecha: new Date().toISOString().split('T')[0],
    glosa: '',
    clienteProveedorId: '',
    vendedorId: '',
    subtotal: 0,
    descuento: 0,
    iva: 0,
    cheque: '',
    pagado: false,
    fechaPago: '',
    lineas: [{ planCuentaId: '', glosa: '', debe: 0, haber: 0 }],
  });

  const cargar = async () => {
    try {
      const params = { page, limit: 10, ...filtros };
      Object.keys(params).forEach(k => !params[k] && delete params[k]);
      const { data } = await api.get('/comprobantes', { params });
      setComprobantes(data.comprobantes);
      setTotal(data.total);
      setPages(data.totalPages);
    } catch { toast.error('Error al cargar'); }
  };

  const cargarKpis = async () => {
    try {
      const { data } = await api.get('/comprobantes/kpis');
      setKpis(data);
    } catch { /* ignore */ }
  };

  const cargarReferenciales = async () => {
    try {
      const [cuentasRes, clientesRes, usuariosRes, gestionRes] = await Promise.all([
        api.get('/plan-cuentas'),
        api.get('/clientes-proveedores'),
        api.get('/usuarios'),
        api.get('/gestiones/actual'),
      ]);
      setCuentas(cuentasRes.data.planCuentas || cuentasRes.data || []);
      setClientes(clientesRes.data.clientesProveedores || clientesRes.data || []);
      setUsuarios(usuariosRes.data.usuarios || usuariosRes.data || []);
      setGestionActual(gestionRes.data);
    } catch { /* ignore */ }
  };

  useEffect(() => { cargar(); cargarKpis(); }, [page, filtros]);

  const verDetalle = async (id) => {
    try {
      const { data } = await api.get(`/comprobantes/${id}`);
      setSelected(data);
      setShowPanel(true);
    } catch { toast.error('Error al cargar detalle'); }
  };

  const accion = async (tipo, id) => {
    try {
      if (tipo === 'anular') {
        await api.post(`/comprobantes/${id}/anular`);
        toast.success('Anulado');
      } else if (tipo === 'contabilizar') {
        await api.post(`/comprobantes/${id}/contabilizar`);
        toast.success('Contabilizado');
      } else if (tipo === 'eliminar') {
        await api.delete(`/comprobantes/${id}`);
        toast.success('Eliminado');
      } else if (tipo === 'pagado') {
        await api.post(`/comprobantes/${id}/marcar-pagado`, { pagado: true });
        toast.success('Marcado como pagado');
      } else if (tipo === 'pendiente') {
        await api.post(`/comprobantes/${id}/marcar-pagado`, { pagado: false });
        toast.success('Marcado como pendiente');
      }
      setConfirmAccion(null);
      setMenuOpen(null);
      if (selected?.id === id) setShowPanel(false);
      cargar();
      cargarKpis();
    } catch { toast.error('Error en la operación'); }
  };

  const abrirFormulario = (c = null) => {
    setEditando(c);
    if (c) {
      setForm({
        tipoComprobante: c.tipoComprobante || 'ingreso',
        documentoTipo: c.documentoTipo || 'factura',
        documentoNumero: c.documentoNumero || '',
        fecha: c.fecha || new Date().toISOString().split('T')[0],
        glosa: c.glosa || '',
        clienteProveedorId: c.clienteProveedorId || '',
        vendedorId: c.vendedorId || '',
        subtotal: c.subtotal || 0,
        descuento: c.descuento || 0,
        iva: c.iva || 0,
        cheque: c.cheque || '',
        pagado: c.pagado || false,
        fechaPago: c.fechaPago || '',
        lineas: c.ComprobanteDetalles?.map(d => ({
          id: d.id,
          planCuentaId: d.planCuentaId || '',
          glosa: d.glosa || '',
          debe: d.debe || 0,
          haber: d.haber || 0,
        })) || [{ planCuentaId: '', glosa: '', debe: 0, haber: 0 }],
      });
    } else {
      resetForm();
    }
    setMostrarFormulario(true);
    cargarReferenciales();
  };

  const resetForm = () => {
    setForm({
      tipoComprobante: 'ingreso',
      documentoTipo: 'factura',
      documentoNumero: '',
      fecha: new Date().toISOString().split('T')[0],
      glosa: '',
      clienteProveedorId: '',
      vendedorId: '',
      subtotal: 0,
      descuento: 0,
      iva: 0,
      cheque: '',
      pagado: false,
      fechaPago: '',
      lineas: [{ planCuentaId: '', glosa: '', debe: 0, haber: 0 }],
    });
    setEditando(null);
    setMostrarFormulario(false);
  };

  const addLinea = () => {
    setForm({ ...form, lineas: [...form.lineas, { planCuentaId: '', glosa: '', debe: 0, haber: 0 }] });
  };

  const removeLinea = (idx) => {
    if (form.lineas.length <= 1) return;
    setForm({ ...form, lineas: form.lineas.filter((_, i) => i !== idx) });
  };

  const updateLinea = (idx, field, value) => {
    const lineas = [...form.lineas];
    lineas[idx][field] = value;
    setForm({ ...form, lineas });
  };

  const totalDebe = form.lineas.reduce((s, l) => s + (parseFloat(l.debe) || 0), 0);
  const totalHaber = form.lineas.reduce((s, l) => s + (parseFloat(l.haber) || 0), 0);
  const diferencia = Math.abs(totalDebe - totalHaber);
  const balanceado = diferencia <= 0.01;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fecha || !form.glosa) {
      toast.error('Complete fecha y glosa');
      return;
    }
    if (form.lineas.length === 0 || !form.lineas[0].planCuentaId) {
      toast.error('Agregue al menos una línea de detalle');
      return;
    }
    if (!balanceado) {
      toast.error(`El comprobante no está balanceado (diferencia: ${formatBs(diferencia)})`);
      return;
    }
    try {
      const payload = {
        ...form,
        subtotal: parseFloat(form.subtotal) || 0,
        descuento: parseFloat(form.descuento) || 0,
        iva: parseFloat(form.iva) || 0,
        clienteProveedorId: form.clienteProveedorId || null,
        vendedorId: form.vendedorId || null,
        pagado: form.pagado,
        fechaPago: form.pagado ? form.fechaPago || form.fecha : null,
        detalles: form.lineas.map(l => ({
          planCuentaId: parseInt(l.planCuentaId),
          glosa: l.glosa,
          debe: parseFloat(l.debe) || 0,
          haber: parseFloat(l.haber) || 0,
        })),
      };
      delete payload.lineas;

      if (editando) {
        await api.put(`/comprobantes/${editando.id}`, payload);
        toast.success('Comprobante actualizado');
      } else {
        await api.post('/comprobantes', payload);
        toast.success('Comprobante creado');
      }
      resetForm();
      cargar();
      cargarKpis();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al guardar');
    }
  };

  return (
    <div className="flex gap-4">
      {/* Main content */}
      <div className={`flex-1 min-w-0 ${showPanel ? 'hidden lg:block' : ''}`}>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-800">Comprobantes</h1>
          <button onClick={() => abrirFormulario()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">+ Nuevo</button>
        </div>

        {/* KPIs */}
        {kpis && (
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-xl font-bold">{kpis.total}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
              <p className="text-xs text-gray-500">Pagados</p>
              <p className="text-xl font-bold text-green-600">{kpis.pagados}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
              <p className="text-xs text-gray-500">Pendientes</p>
              <p className="text-xl font-bold text-amber-600">{kpis.pendientes}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
              <p className="text-xs text-gray-500">Total Bs.</p>
              <p className="text-xl font-bold">{formatBs(kpis.totalMonto)}</p>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <input type="text" placeholder="Buscar Nº, glosa..." value={filtros.search} onChange={e => { setFiltros({ ...filtros, search: e.target.value }); setPage(1); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm flex-1 min-w-[200px]" />
          <select value={filtros.documentoTipo} onChange={e => { setFiltros({ ...filtros, documentoTipo: e.target.value }); setPage(1); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option value="">Todo tipo</option>
            <option value="factura">Factura</option>
            <option value="nota_credito">Nota Crédito</option>
            <option value="nota_debito">Nota Débito</option>
            <option value="recibo">Recibo</option>
          </select>
          <select value={filtros.estado} onChange={e => { setFiltros({ ...filtros, estado: e.target.value }); setPage(1); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option value="">Todo estado</option>
            <option value="activo">Activo</option>
            <option value="contabilizado">Contabilizado</option>
            <option value="anulado">Anulado</option>
          </select>
        </div>

        {/* Formulario */}
        {mostrarFormulario && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-6">
            <h2 className="text-lg font-semibold mb-4">{editando ? 'Editar Comprobante' : 'Nuevo Comprobante'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Comprobante</label>
                  <select value={form.tipoComprobante} onChange={e => setForm({ ...form, tipoComprobante: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value="ingreso">Ingreso</option>
                    <option value="egreso">Egreso</option>
                    <option value="traspaso">Traspaso</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Documento</label>
                  <select value={form.documentoTipo} onChange={e => setForm({ ...form, documentoTipo: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value="factura">Factura</option>
                    <option value="nota_credito">Nota Crédito</option>
                    <option value="nota_debito">Nota Débito</option>
                    <option value="recibo">Recibo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nº Documento</label>
                  <input type="text" value={form.documentoNumero} onChange={e => setForm({ ...form, documentoNumero: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                  <input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Glosa</label>
                <input type="text" value={form.glosa} onChange={e => setForm({ ...form, glosa: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Descripción del comprobante" required />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cliente / Proveedor</label>
                  <select value={form.clienteProveedorId} onChange={e => setForm({ ...form, clienteProveedorId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value="">-- Seleccionar --</option>
                    {clientes.map(cl => (
                      <option key={cl.id} value={cl.id}>{cl.razonSocial}{cl.nit ? ` (${cl.nit})` : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vendedor</label>
                  <select value={form.vendedorId} onChange={e => setForm({ ...form, vendedorId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value="">-- Seleccionar --</option>
                    {usuarios.map(u => (
                      <option key={u.id} value={u.id}>{u.nombreCompleto || u.username}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cheque</label>
                  <input type="text" value={form.cheque} onChange={e => setForm({ ...form, cheque: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Nº cheque" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subtotal</label>
                  <input type="number" step="0.01" value={form.subtotal} onChange={e => setForm({ ...form, subtotal: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descuento</label>
                  <input type="number" step="0.01" value={form.descuento} onChange={e => setForm({ ...form, descuento: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IVA</label>
                  <input type="number" step="0.01" value={form.iva} onChange={e => setForm({ ...form, iva: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.pagado} onChange={e => setForm({ ...form, pagado: e.target.checked })} className="rounded border-gray-300" />
                  <span className="text-sm font-medium text-gray-700">Pagado</span>
                </label>
                {form.pagado && (
                  <div className="flex-1 max-w-xs">
                    <input type="date" value={form.fechaPago} onChange={e => setForm({ ...form, fechaPago: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                )}
              </div>

              {/* Líneas contables */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-700">Líneas Contables</h3>
                  <button type="button" onClick={addLinea} className="flex items-center gap-1 text-indigo-600 text-sm font-medium hover:text-indigo-800"><Plus className="w-4 h-4" /> Agregar línea</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Cuenta</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Glosa</th>
                        <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Debe</th>
                        <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Haber</th>
                        <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {form.lineas.map((l, i) => (
                        <tr key={i}>
                          <td className="px-3 py-1.5">
                            <select value={l.planCuentaId} onChange={e => updateLinea(i, 'planCuentaId', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm">
                              <option value="">-- Cuenta --</option>
                              {cuentas.map(c => (
                                <option key={c.id} value={c.id}>{c.codigo} - {c.nombre}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-1.5">
                            <input type="text" value={l.glosa} onChange={e => updateLinea(i, 'glosa', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" placeholder="Glosa línea" />
                          </td>
                          <td className="px-3 py-1.5">
                            <input type="number" step="0.01" value={l.debe} onChange={e => updateLinea(i, 'debe', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-right" />
                          </td>
                          <td className="px-3 py-1.5">
                            <input type="number" step="0.01" value={l.haber} onChange={e => updateLinea(i, 'haber', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-right" />
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            <button type="button" onClick={() => removeLinea(i)} disabled={form.lineas.length <= 1} className="p-1 text-red-500 hover:text-red-700 disabled:opacity-30"><Trash2 className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Balance indicator */}
                <div className={`mt-3 p-3 rounded-lg flex gap-6 text-sm ${balanceado ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div><span className="text-gray-500">Total Debe:</span> <span className="font-bold">{formatBs(totalDebe)}</span></div>
                  <div><span className="text-gray-500">Total Haber:</span> <span className="font-bold">{formatBs(totalHaber)}</span></div>
                  <div><span className="text-gray-500">Diferencia:</span> <span className={`font-bold ${balanceado ? 'text-green-600' : 'text-red-600'}`}>{formatBs(diferencia)}</span></div>
                  <div className="font-bold">{balanceado ? '✅ Balanceado' : '❌ No balanceado'}</div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition text-sm font-medium">{editando ? 'Actualizar' : 'Guardar'}</button>
                <button type="button" onClick={resetForm} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition text-sm">Cancelar</button>
              </div>
            </form>
          </div>
        )}

        {/* Tabla */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tipo Doc.</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Nº</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Cliente/Proveedor</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Total Bs.</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Pago</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {comprobantes.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => verDetalle(c.id)}>
                  <td className="px-4 py-3 text-sm">{c.fecha}</td>
                  <td className="px-4 py-3 text-sm font-medium">
                    {c.documentoTipo ? `${docLabels[c.documentoTipo] || c.documentoTipo}-${String(c.numero).padStart(4, '0')}` : `C-${String(c.numero).padStart(4, '0')}`}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono">{c.numero}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{c.ClienteProveedor?.razonSocial || '-'}</td>
                  <td className="px-4 py-3 text-sm text-right font-mono">{formatBs(0)}</td>
                  <td className="px-4 py-3 text-center">{estadoBadge(c.estado)}</td>
                  <td className="px-4 py-3 text-center">
                    {c.pagado
                      ? <span className="text-green-600 text-xs font-medium">Pagado</span>
                      : <span className="text-amber-600 text-xs font-medium">Pendiente</span>}
                  </td>
                  <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => verDetalle(c.id)} className="p-1 hover:bg-gray-100 rounded" title="Ver"><Eye className="w-4 h-4 text-gray-600" /></button>
                      {c.estado === 'activo' && (
                        <button onClick={() => abrirFormulario(c)} className="p-1 hover:bg-gray-100 rounded" title="Editar"><Edit2 className="w-4 h-4 text-gray-600" /></button>
                      )}
                      <button onClick={() => exportarArchivo(`/export/comprobante/${c.id}/pdf`, `comprobante_${c.numero}.pdf`)} className="p-1 hover:bg-gray-100 rounded" title="Imprimir"><Printer className="w-4 h-4 text-gray-600" /></button>
                      <div className="relative">
                        <button onClick={() => setMenuOpen(menuOpen === c.id ? null : c.id)} className="p-1 hover:bg-gray-100 rounded"><MoreVertical className="w-4 h-4 text-gray-600" /></button>
                        {menuOpen === c.id && (
                          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 w-44 py-1">
                            {c.estado === 'activo' && <>
                              <button onClick={() => { setMenuOpen(null); setConfirmAccion({ tipo: 'contabilizar', id: c.id }); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">Contabilizar</button>
                              <button onClick={() => { setMenuOpen(null); setConfirmAccion({ tipo: 'anular', id: c.id }); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-red-600">Anular</button>
                              <button onClick={() => { setMenuOpen(null); setConfirmAccion({ tipo: 'eliminar', id: c.id }); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-red-600">Eliminar</button>
                            </>}
                            {c.pagado
                              ? <button onClick={() => { setMenuOpen(null); setConfirmAccion({ tipo: 'pendiente', id: c.id }); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">Marcar Pendiente</button>
                              : <button onClick={() => { setMenuOpen(null); setConfirmAccion({ tipo: 'pagado', id: c.id }); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">Marcar Pagado</button>}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Paginación */}
          {pages > 1 && (
            <div className="px-4 py-3 border-t flex items-center justify-between">
              <span className="text-sm text-gray-500">{total} comprobantes</span>
              <div className="flex gap-1">
                <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 border rounded text-sm disabled:opacity-50">Anterior</button>
                <span className="px-3 py-1 text-sm">{page} / {pages}</span>
                <button disabled={page >= pages} onClick={() => setPage(page + 1)} className="px-3 py-1 border rounded text-sm disabled:opacity-50">Siguiente</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel */}
      {showPanel && selected && (
        <div className="w-full lg:w-[400px] bg-white rounded-xl shadow-sm border border-gray-200 overflow-y-auto max-h-[calc(100vh-120px)] sticky top-4">
          <div className="px-4 py-3 border-b flex items-center justify-between bg-gray-50">
            <span className="font-bold text-sm">Detalle</span>
            <button onClick={() => setShowPanel(false)} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
          </div>

          <div className="p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-sm font-bold">
                {selected.documentoTipo
                  ? `${docLabels[selected.documentoTipo] || ''}-${String(selected.numero).padStart(4, '0')}`
                  : `C-${String(selected.numero).padStart(4, '0')}`}
              </span>
              {estadoBadge(selected.estado)}
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Fecha Emisión</span><span>{selected.fecha}</span></div>
              {selected.ClienteProveedor && (
                <>
                  <div className="flex justify-between"><span className="text-gray-500">Cliente</span><span>{selected.ClienteProveedor.razonSocial}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">NIT</span><span>{selected.ClienteProveedor.nit}</span></div>
                </>
              )}
              <div className="flex justify-between"><span className="text-gray-500">Tipo Contable</span>{tipoBadge(selected.tipoComprobante)}</div>
              <div className="flex justify-between">
                <span className="text-gray-500">Estado Pago</span>
                {selected.pagado
                  ? <span className="text-green-600 font-medium">Pagado {selected.fechaPago ? `(${selected.fechaPago})` : ''}</span>
                  : <span className="text-amber-600 font-medium">Pendiente</span>}
              </div>
              {selected.vendedor && <div className="flex justify-between"><span className="text-gray-500">Vendedor</span><span>{selected.vendedor.nombreCompleto}</span></div>}
              {selected.cheque && <div className="flex justify-between"><span className="text-gray-500">Cheque</span><span>{selected.cheque}</span></div>}
            </div>

            {selected.glosa && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Glosa</p>
                <p className="text-sm">{selected.glosa}</p>
              </div>
            )}

            {(selected.subtotal || selected.descuento || selected.iva) && (
              <div className="space-y-1 text-sm">
                {selected.subtotal && <div className="flex justify-between"><span>Subtotal</span><span>{formatBs(selected.subtotal)}</span></div>}
                {selected.descuento > 0 && <div className="flex justify-between"><span>Descuento</span><span>-{formatBs(selected.descuento)}</span></div>}
                {selected.iva && <div className="flex justify-between"><span>IVA</span><span>{formatBs(selected.iva)}</span></div>}
              </div>
            )}

            <div className="border-t pt-3">
              <p className="text-xs text-gray-500 mb-2 font-semibold uppercase">Líneas Contables</p>
              <div className="space-y-1">
                {selected.ComprobanteDetalles?.map(d => (
                  <div key={d.id} className="flex justify-between text-sm py-1 border-b border-gray-100 last:border-0">
                    <div>
                      <span className="font-mono text-xs text-gray-500">{d.PlanCuentum?.codigo}</span>
                      <span className="ml-1">{d.PlanCuentum?.nombre}</span>
                    </div>
                    <div className="flex gap-3">
                      {d.debe > 0 && <span className="text-gray-800 font-medium">Bs. {d.debe.toFixed(2)}</span>}
                      {d.haber > 0 && <span className="text-gray-800 font-medium">Bs. {d.haber.toFixed(2)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => exportarArchivo(`/export/comprobante/${selected.id}/pdf`, `comprobante_${selected.numero}.pdf`)}
              className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
            >
              <Printer className="w-4 h-4 inline mr-1" /> Imprimir PDF
            </button>
          </div>
        </div>
      )}

      {confirmAccion && (
        <ConfirmModal
          titulo={confirmAccion.tipo === 'anular' ? 'Anular' : confirmAccion.tipo === 'eliminar' ? 'Eliminar' : confirmAccion.tipo === 'contabilizar' ? 'Contabilizar' : 'Cambiar Estado'}
          mensaje={confirmAccion.tipo === 'anular' ? '¿Anular este comprobante?' : confirmAccion.tipo === 'eliminar' ? '¿Eliminar este comprobante?' : confirmAccion.tipo === 'contabilizar' ? '¿Contabilizar este comprobante?' : '¿Cambiar estado de pago?'}
          danger={['anular', 'eliminar'].includes(confirmAccion.tipo)}
          onConfirm={() => accion(confirmAccion.tipo, confirmAccion.id)}
          onCancel={() => setConfirmAccion(null)}
        />
      )}
    </div>
  );
}

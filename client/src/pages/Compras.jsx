import { useState, useEffect, useRef } from 'react';
import api, { exportarArchivo } from '../services/api';
import { Plus, Edit2, Trash2, CheckCircle, FileText, Upload, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';

export default function Compras() {
  const [compras, setCompras] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editando, setEditando] = useState(null);
  const [modalConfirm, setModalConfirm] = useState({ isOpen: false, id: null });
  const [importando, setImportando] = useState(false);
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    nit: '',
    razonSocial: '',
    numeroCompra: '',
    numeroDui: '',
    numeroAutorizacion: '',
    importeTotal: 0,
    importeNoSujeto: 0,
    descuentos: 0,
    codigoControl: '',
    glosa: '',
  });

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    try {
      const { data } = await api.get('/compras');
      setCompras(data.compras || (Array.isArray(data) ? data : []));
    } catch (error) { console.error(error); }
    finally { setCargando(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const datos = { ...form, importeTotal: parseFloat(form.importeTotal), importeNoSujeto: parseFloat(form.importeNoSujeto) || 0, descuentos: parseFloat(form.descuentos) || 0 };
      if (editando) { await api.put(`/compras/${editando.id}`, datos); toast.success('Compra actualizada'); }
      else { await api.post('/compras', datos); toast.success('Compra creada'); }
      resetForm(); cargarDatos();
    } catch (error) { toast.error(error.response?.data?.error || 'Error al guardar'); }
  };

  const handleContabilizar = async (id) => {
    try {
      await api.post(`/compras/${id}/contabilizar`);
      toast.success('Compra contabilizada correctamente');
      cargarDatos();
    } catch (error) { toast.error(error.response?.data?.error || 'Error al contabilizar'); }
  };

  const handleEdit = (c) => {
    setEditando(c);
    setForm({ fecha: c.fecha, nit: c.nit, razonSocial: c.razonSocial, numeroCompra: c.numeroCompra, numeroDui: c.numeroDui || '', numeroAutorizacion: c.numeroAutorizacion || '', importeTotal: parseFloat(c.importeTotal), importeNoSujeto: parseFloat(c.importeNoSujeto) || 0, descuentos: parseFloat(c.descuentos) || 0, codigoControl: c.codigoControl || '', glosa: c.glosa || '' });
    setMostrarFormulario(true);
  };

  const handleDelete = (id) => setModalConfirm({ isOpen: true, id });

  const handleConfirmAction = async () => {
    try {
      await api.delete(`/compras/${modalConfirm.id}`);
      toast.success('Compra eliminada'); cargarDatos();
    } catch (error) { toast.error(error.response?.data?.error || 'Error al eliminar'); }
  };

  const handleImportar = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportando(true);
    try {
      const formData = new FormData();
      formData.append('archivo', file);
      const { data } = await api.post('/compras/importar-excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(data.mensaje);
      cargarDatos();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al importar');
    } finally {
      setImportando(false);
      e.target.value = '';
    }
  };

  const handleExportPDF = (id) => {
    exportarArchivo(`/compras/${id}/pdf`, `compra_${id}.pdf`);
  };

  const resetForm = () => {
    setForm({ fecha: new Date().toISOString().split('T')[0], nit: '', razonSocial: '', numeroCompra: '', numeroDui: '', numeroAutorizacion: '', importeTotal: 0, importeNoSujeto: 0, descuentos: 0, codigoControl: '', glosa: '' });
    setEditando(null); setMostrarFormulario(false);
  };

  const calcularCreditoFiscal = () => {
    const total = parseFloat(form.importeTotal) || 0;
    const desc = parseFloat(form.descuentos) || 0;
    const noSujeto = parseFloat(form.importeNoSujeto) || 0;
    return ((total - desc - noSujeto) * 0.13).toFixed(2);
  };

  if (cargando) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Registro de Compras</h1>
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImportar} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} disabled={importando} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition disabled:opacity-50">
            <Upload className="w-4 h-4" /> {importando ? 'Importando...' : 'Importar Excel'}
          </button>
          <button onClick={() => setMostrarFormulario(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition">
            <Plus className="w-4 h-4" /> Nueva Compra
          </button>
        </div>
      </div>

      {mostrarFormulario && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold mb-4">{editando ? 'Editar Compra' : 'Nueva Compra'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label><input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">NIT</label><input type="text" value={form.nit} onChange={(e) => setForm({ ...form, nit: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required /></div>
              <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Razón Social</label><input type="text" value={form.razonSocial} onChange={(e) => setForm({ ...form, razonSocial: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nº Compra</label><input type="text" value={form.numeroCompra} onChange={(e) => setForm({ ...form, numeroCompra: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nº DUI</label><input type="text" value={form.numeroDui} onChange={(e) => setForm({ ...form, numeroDui: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Código Control</label><input type="text" value={form.codigoControl} onChange={(e) => setForm({ ...form, codigoControl: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Importe Total</label><input type="number" step="0.01" value={form.importeTotal} onChange={(e) => setForm({ ...form, importeTotal: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Descuentos</label><input type="number" step="0.01" value={form.descuentos} onChange={(e) => setForm({ ...form, descuentos: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Importe No Sujeto</label><input type="number" step="0.01" value={form.importeNoSujeto} onChange={(e) => setForm({ ...form, importeNoSujeto: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
              <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Glosa</label><input type="text" value={form.glosa} onChange={(e) => setForm({ ...form, glosa: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Descripción" /></div>
            </div>
            <div className="p-3 bg-indigo-50 rounded-lg flex gap-6">
              <div><span className="text-xs text-indigo-600">Crédito Fiscal IVA 13%:</span><p className="text-lg font-bold text-indigo-800">Bs. {calcularCreditoFiscal()}</p></div>
              <div><span className="text-xs text-indigo-600">Neto 87%:</span><p className="text-lg font-bold text-indigo-800">Bs. {((parseFloat(form.importeTotal) || 0) - (parseFloat(form.descuentos) || 0) - (parseFloat(form.importeNoSujeto) || 0) * 0.87).toFixed(2)}</p></div>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition">{editando ? 'Actualizar' : 'Guardar'}</button>
              <button type="button" onClick={resetForm} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nº</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proveedor</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Importe Total</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Crédito Fiscal</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {compras.map((c) => {
              const total = parseFloat(c.importeTotal);
              const desc = parseFloat(c.descuentos) || 0;
              const noSujeto = parseFloat(c.importeNoSujeto) || 0;
              const cf = ((total - desc - noSujeto) * 0.13).toFixed(2);
              return (
                <tr key={c.id} className={`hover:bg-gray-50 ${c.contabilizado ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3 font-mono text-sm">{c.numeroCompra}</td>
                  <td className="px-4 py-3 text-sm">{c.fecha}</td>
                  <td className="px-4 py-3 text-sm">{c.razonSocial}<br /><span className="text-xs text-gray-400">NIT: {c.nit}</span></td>
                  <td className="px-4 py-3 text-right font-mono text-sm font-semibold">Bs. {total.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-green-700">Bs. {cf}</td>
                  <td className="px-4 py-3">{c.contabilizado ? <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 flex items-center gap-1 w-fit"><CheckCircle className="w-3 h-3" /> Contabilizado</span> : <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Pendiente</span>}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleExportPDF(c.id)} className="p-1.5 text-gray-500 hover:text-blue-600 transition" title="Imprimir PDF"><Printer className="w-4 h-4" /></button>
                        {!c.contabilizado && (<button onClick={() => handleContabilizar(c.id)} className="p-1.5 text-gray-500 hover:text-green-600 transition" title="Contabilizar"><CheckCircle className="w-4 h-4" /></button>)}
                        {!c.contabilizado && (<button onClick={() => handleEdit(c)} className="p-1.5 text-gray-500 hover:text-indigo-600 transition" title="Editar"><Edit2 className="w-4 h-4" /></button>)}
                        {!c.contabilizado && (<button onClick={() => handleDelete(c.id)} className="p-1.5 text-gray-500 hover:text-red-600 transition" title="Eliminar"><Trash2 className="w-4 h-4" /></button>)}
                      </div>
                    </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {compras.length === 0 && (<div className="text-center py-12 text-gray-500"><FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" /><p>No hay compras registradas</p></div>)}
      </div>

      <ConfirmModal isOpen={modalConfirm.isOpen} onClose={() => setModalConfirm({ isOpen: false, id: null })} onConfirm={handleConfirmAction} title="Eliminar Compra" message="¿Está seguro de eliminar esta compra?" confirmText="Eliminar" variant="danger" />
    </div>
  );
}

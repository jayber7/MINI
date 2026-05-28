import { useState, useEffect, useRef } from 'react';
import api, { exportarArchivo } from '../services/api';
import { Plus, Edit2, Trash2, CheckCircle, FileText, Upload, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';

export default function Ventas() {
  const [ventas, setVentas] = useState([]);
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
    numeroVenta: '',
    numeroAutorizacion: '',
    importeTotal: 0,
    importeExento: 0,
    descuentos: 0,
    codigoControl: '',
    glosa: '',
  });

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    try {
      const { data } = await api.get('/ventas');
      setVentas(data.ventas || (Array.isArray(data) ? data : []));
    } catch (error) { console.error(error); }
    finally { setCargando(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const datos = { ...form, importeTotal: parseFloat(form.importeTotal), importeExento: parseFloat(form.importeExento) || 0, descuentos: parseFloat(form.descuentos) || 0 };
      if (editando) { await api.put(`/ventas/${editando.id}`, datos); toast.success('Venta actualizada'); }
      else { await api.post('/ventas', datos); toast.success('Venta creada'); }
      resetForm(); cargarDatos();
    } catch (error) { toast.error(error.response?.data?.error || 'Error al guardar'); }
  };

  const handleContabilizar = async (id) => {
    try {
      await api.post(`/ventas/${id}/contabilizar`);
      toast.success('Venta contabilizada correctamente');
      cargarDatos();
    } catch (error) { toast.error(error.response?.data?.error || 'Error al contabilizar'); }
  };

  const handleEdit = (v) => {
    setEditando(v);
    setForm({ fecha: v.fecha, nit: v.nit || '', razonSocial: v.razonSocial || '', numeroVenta: v.numeroVenta, numeroAutorizacion: v.numeroAutorizacion || '', importeTotal: parseFloat(v.importeTotal), importeExento: parseFloat(v.importeExento) || 0, descuentos: parseFloat(v.descuentos) || 0, codigoControl: v.codigoControl || '', glosa: v.glosa || '' });
    setMostrarFormulario(true);
  };

  const handleDelete = (id) => setModalConfirm({ isOpen: true, id });

  const handleConfirmAction = async () => {
    try {
      await api.delete(`/ventas/${modalConfirm.id}`);
      toast.success('Venta eliminada'); cargarDatos();
    } catch (error) { toast.error(error.response?.data?.error || 'Error al eliminar'); }
  };

  const handleImportar = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportando(true);
    try {
      const formData = new FormData();
      formData.append('archivo', file);
      const { data } = await api.post('/ventas/importar-excel', formData, {
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
    exportarArchivo(`/ventas/${id}/pdf`, `venta_${id}.pdf`);
  };

  const resetForm = () => {
    setForm({ fecha: new Date().toISOString().split('T')[0], nit: '', razonSocial: '', numeroVenta: '', numeroAutorizacion: '', importeTotal: 0, importeExento: 0, descuentos: 0, codigoControl: '', glosa: '' });
    setEditando(null); setMostrarFormulario(false);
  };

  const calcularImpuestos = () => {
    const total = parseFloat(form.importeTotal) || 0;
    const desc = parseFloat(form.descuentos) || 0;
    const exento = parseFloat(form.importeExento) || 0;
    const base = total - desc - exento;
    return { debitoFiscal: (base * 0.13).toFixed(2), it: (base * 0.03).toFixed(2), neto: (base * 0.87).toFixed(2) };
  };

  if (cargando) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Registro de Ventas</h1>
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImportar} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} disabled={importando} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition disabled:opacity-50">
            <Upload className="w-4 h-4" /> {importando ? 'Importando...' : 'Importar Excel'}
          </button>
          <button onClick={() => setMostrarFormulario(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition">
            <Plus className="w-4 h-4" /> Nueva Venta
          </button>
        </div>
      </div>

      {mostrarFormulario && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold mb-4">{editando ? 'Editar Venta' : 'Nueva Venta'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label><input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">NIT</label><input type="text" value={form.nit} onChange={(e) => setForm({ ...form, nit: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
              <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Razón Social</label><input type="text" value={form.razonSocial} onChange={(e) => setForm({ ...form, razonSocial: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nº Venta</label><input type="text" value={form.numeroVenta} onChange={(e) => setForm({ ...form, numeroVenta: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Código Control</label><input type="text" value={form.codigoControl} onChange={(e) => setForm({ ...form, codigoControl: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Importe Total</label><input type="number" step="0.01" value={form.importeTotal} onChange={(e) => setForm({ ...form, importeTotal: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Descuentos</label><input type="number" step="0.01" value={form.descuentos} onChange={(e) => setForm({ ...form, descuentos: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Importe Exento</label><input type="number" step="0.01" value={form.importeExento} onChange={(e) => setForm({ ...form, importeExento: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Glosa</label><input type="text" value={form.glosa} onChange={(e) => setForm({ ...form, glosa: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Descripción" /></div>
            </div>
            {(() => { const imp = calcularImpuestos(); return (
              <div className="p-3 bg-indigo-50 rounded-lg flex gap-6">
                <div><span className="text-xs text-indigo-600">Débito Fiscal IVA 13%:</span><p className="text-lg font-bold text-indigo-800">Bs. {imp.debitoFiscal}</p></div>
                <div><span className="text-xs text-indigo-600">IT 3%:</span><p className="text-lg font-bold text-indigo-800">Bs. {imp.it}</p></div>
                <div><span className="text-xs text-indigo-600">Neto 87%:</span><p className="text-lg font-bold text-indigo-800">Bs. {imp.neto}</p></div>
              </div>
            ); })()}
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
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Importe Total</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Débito Fiscal</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {ventas.map((v) => {
              const total = parseFloat(v.importeTotal);
              const desc = parseFloat(v.descuentos) || 0;
              const exento = parseFloat(v.importeExento) || 0;
              const base = total - desc - exento;
              const df = (base * 0.13).toFixed(2);
              return (
                <tr key={v.id} className={`hover:bg-gray-50 ${v.contabilizado ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3 font-mono text-sm">{v.numeroVenta}</td>
                  <td className="px-4 py-3 text-sm">{v.fecha}</td>
                  <td className="px-4 py-3 text-sm">{v.razonSocial || '—'}{v.nit && <><br /><span className="text-xs text-gray-400">NIT: {v.nit}</span></>}</td>
                  <td className="px-4 py-3 text-right font-mono text-sm font-semibold">Bs. {total.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-red-700">Bs. {df}</td>
                  <td className="px-4 py-3">{v.contabilizado ? <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 flex items-center gap-1 w-fit"><CheckCircle className="w-3 h-3" /> Contabilizado</span> : <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Pendiente</span>}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleExportPDF(v.id)} className="p-1.5 text-gray-500 hover:text-blue-600 transition" title="Imprimir PDF"><Printer className="w-4 h-4" /></button>
                        {!v.contabilizado && (<button onClick={() => handleContabilizar(v.id)} className="p-1.5 text-gray-500 hover:text-green-600 transition" title="Contabilizar"><CheckCircle className="w-4 h-4" /></button>)}
                        {!v.contabilizado && (<button onClick={() => handleEdit(v)} className="p-1.5 text-gray-500 hover:text-indigo-600 transition" title="Editar"><Edit2 className="w-4 h-4" /></button>)}
                        {!v.contabilizado && (<button onClick={() => handleDelete(v.id)} className="p-1.5 text-gray-500 hover:text-red-600 transition" title="Eliminar"><Trash2 className="w-4 h-4" /></button>)}
                      </div>
                    </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {ventas.length === 0 && (<div className="text-center py-12 text-gray-500"><FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" /><p>No hay ventas registradas</p></div>)}
      </div>

      <ConfirmModal isOpen={modalConfirm.isOpen} onClose={() => setModalConfirm({ isOpen: false, id: null })} onConfirm={handleConfirmAction} title="Eliminar Venta" message="¿Está seguro de eliminar esta venta?" confirmText="Eliminar" variant="danger" />
    </div>
  );
}

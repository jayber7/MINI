import { useState, useEffect } from 'react';
import api from '../services/api';

export default function Configuracion() {
  const [form, setForm] = useState({
    nombre: '',
    nit: '',
    direccion: '',
    telefono: '',
    tituloContador: '',
    firmaContador: '',
    tituloPropietario: '',
    firmaPropietario: '',
    tituloRepresentanteLegal: '',
    firmaRepresentanteLegal: '',
    ivaExento: false,
    ivaExentoRm: '0',
    metodoEvaluacion: 'PEPS',
    generarPdf: false,
  });
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    cargarConfiguracion();
  }, []);

  const cargarConfiguracion = async () => {
    try {
      const { data } = await api.get('/empresa');
      if (data && data.id) {
        setForm({
          nombre: data.nombre || '',
          nit: data.nit || '',
          direccion: data.direccion || '',
          telefono: data.telefono || '',
          tituloContador: data.tituloContador || '',
          firmaContador: data.firmaContador || '',
          tituloPropietario: data.tituloPropietario || '',
          firmaPropietario: data.firmaPropietario || '',
          tituloRepresentanteLegal: data.tituloRepresentanteLegal || '',
          firmaRepresentanteLegal: data.firmaRepresentanteLegal || '',
          ivaExento: data.ivaExento || false,
          ivaExentoRm: data.ivaExentoRm || '0',
          metodoEvaluacion: data.metodoEvaluacion || 'PEPS',
          generarPdf: data.generarPdf || false,
        });
      }
    } catch (error) {
      console.error('Error cargando configuración:', error);
    } finally {
      setCargando(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setMensaje('');
    try {
      const { data } = await api.get('/empresa');
      if (data && data.id) {
        await api.put(`/empresa/${data.id}`, form);
      } else {
        await api.post('/empresa', form);
      }
      setMensaje('Configuración guardada correctamente');
    } catch (error) {
      setMensaje('Error al guardar la configuración');
    } finally {
      setGuardando(false);
    }
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
      <h1 className="text-2xl font-bold text-gray-900">Configuración de Empresa</h1>

      {mensaje && (
        <div className={`p-4 rounded-lg ${mensaje.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {mensaje}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 space-y-6">
        {/* Datos generales */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Datos Generales</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Razón Social</label>
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">NIT</label>
              <input
                type="text"
                value={form.nit}
                onChange={(e) => setForm({ ...form, nit: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
              <input
                type="text"
                value={form.direccion}
                onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input
                type="text"
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Firmas */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Firmas para Reportes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título Contador</label>
              <input
                type="text"
                value={form.tituloContador}
                onChange={(e) => setForm({ ...form, tituloContador: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Ej: Lic. en Contaduría"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Contador</label>
              <input
                type="text"
                value={form.firmaContador}
                onChange={(e) => setForm({ ...form, firmaContador: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título Propietario</label>
              <input
                type="text"
                value={form.tituloPropietario}
                onChange={(e) => setForm({ ...form, tituloPropietario: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Propietario</label>
              <input
                type="text"
                value={form.firmaPropietario}
                onChange={(e) => setForm({ ...form, firmaPropietario: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título Representante Legal</label>
              <input
                type="text"
                value={form.tituloRepresentanteLegal}
                onChange={(e) => setForm({ ...form, tituloRepresentanteLegal: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Representante Legal</label>
              <input
                type="text"
                value={form.firmaRepresentanteLegal}
                onChange={(e) => setForm({ ...form, firmaRepresentanteLegal: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Configuración Fiscal */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Configuración Fiscal</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={form.ivaExento}
                onChange={(e) => setForm({ ...form, ivaExento: e.target.checked })}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <div>
                <label className="text-sm font-medium text-gray-700">IVA Exento</label>
                <p className="text-xs text-gray-500">La empresa está exenta del pago de IVA</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nº Resolución IVA Exento</label>
              <input
                type="text"
                value={form.ivaExentoRm}
                onChange={(e) => setForm({ ...form, ivaExentoRm: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Método de Evaluación de Inventario</label>
              <select
                value={form.metodoEvaluacion}
                onChange={(e) => setForm({ ...form, metodoEvaluacion: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="PEPS">PEPS (FIFO)</option>
                <option value="UEPS">UEPS (LIFO)</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={form.generarPdf}
                onChange={(e) => setForm({ ...form, generarPdf: e.target.checked })}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <div>
                <label className="text-sm font-medium text-gray-700">Generar PDF automático</label>
                <p className="text-xs text-gray-500">Generar PDF al contabilizar comprobantes</p>
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={guardando}
          className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
        >
          {guardando ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </form>
    </div>
  );
}

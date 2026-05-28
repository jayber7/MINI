import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const empresaId = localStorage.getItem('empresaId');
  if (empresaId) {
    config.headers['x-empresa-id'] = empresaId;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const exportarArchivo = async (url, nombreArchivo) => {
  try {
    const response = await api.get(url, { responseType: 'blob' });
    const blob = new Blob([response.data], {
      type: response.headers['content-type'],
    });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = nombreArchivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
    toast.success('Archivo exportado correctamente');
  } catch (error) {
    console.error('Error exportando:', error);
    toast.error('Error al exportar el archivo');
  }
};

export default api;

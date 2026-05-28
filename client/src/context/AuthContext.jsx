import { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [empresa, setEmpresa] = useState(null);
  const [empresas, setEmpresas] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const usuarioGuardado = localStorage.getItem('usuario');
    const empresaGuardada = localStorage.getItem('empresa');
    const empresaIdGuardada = localStorage.getItem('empresaId');

    if (token && usuarioGuardado) {
      setUsuario(JSON.parse(usuarioGuardado));
      if (empresaGuardada) setEmpresa(JSON.parse(empresaGuardada));

      // Fetch empresas list
      cargarEmpresas();
    }
    setCargando(false);
  }, []);

  const cargarEmpresas = async () => {
    try {
      const { data } = await api.get('/empresa/lista');
      setEmpresas(data);
      const empresaIdGuardada = localStorage.getItem('empresaId');
      if (!empresaIdGuardada && data.length > 0) {
        const primera = data[0];
        setEmpresa(primera);
        localStorage.setItem('empresaId', primera.id);
        localStorage.setItem('empresa', JSON.stringify(primera));
      }
    } catch (e) {
      console.error('Error cargando empresas:', e);
    }
  };

  const cambiarEmpresa = (empresa) => {
    setEmpresa(empresa);
    localStorage.setItem('empresaId', empresa.id);
    localStorage.setItem('empresa', JSON.stringify(empresa));
    window.location.reload();
  };

  const login = async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('usuario', JSON.stringify(data.usuario));
    setUsuario(data.usuario);
    await cargarEmpresas();
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    localStorage.removeItem('empresa');
    localStorage.removeItem('empresaId');
    setUsuario(null);
    setEmpresa(null);
  };

  const tienePermiso = (codigo) => {
    if (!usuario || !usuario.permisos) return false;
    return usuario.permisos.includes(codigo);
  };

  const tieneRol = (...roles) => {
    if (!usuario || !usuario.rol) return false;
    return roles.includes(usuario.rol);
  };

  return (
    <AuthContext.Provider value={{
      usuario, cargando, login, logout, tienePermiso, tieneRol,
      empresa, empresas, cambiarEmpresa, cargarEmpresas,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

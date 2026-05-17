import { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const usuarioGuardado = localStorage.getItem('usuario');

    if (token && usuarioGuardado) {
      setUsuario(JSON.parse(usuarioGuardado));
    }
    setCargando(false);
  }, []);

  const login = async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('usuario', JSON.stringify(data.usuario));
    setUsuario(data.usuario);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUsuario(null);
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
    <AuthContext.Provider value={{ usuario, cargando, login, logout, tienePermiso, tieneRol }}>
      {children}
    </AuthContext.Provider>
  );
}

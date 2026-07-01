import React, { useState } from 'react';
import './LoginView.css';
import { fetchEmployeeData } from '../../utils/apiHelpers';

const LoginView = ({ onLoginSuccess, showToast, setLoading }) => {
  const [doc, setDoc] = useState('');

  const handleLogin = async () => {
    if (!doc.trim()) return showToast('Ingrese un documento válido', 'error');
    setLoading(true);
    try {
      const emp = await fetchEmployeeData(doc);
      if (!emp) {
        showToast('Usuario no encontrado', 'error');
      } else if (emp.status !== 'activo') {
        showToast('El usuario no se encuentra activo', 'error');
      } else if (emp.departamento === 'Seguridad y Salud en el Trabajo') {
        onLoginSuccess(emp, 'SST');
        showToast(`Bienvenido(a), ${emp.nombre.split(' ')[0]}`);
      } else if (emp.lider === 1) {
        onLoginSuccess(emp, 'LIDER');
        showToast(`Bienvenido(a), ${emp.nombre.split(' ')[0]}`);
      } else {
        showToast('No tiene permisos para acceder a esta plataforma', 'error');
      }
    } catch (err) {
      showToast('Error de conexión con el servidor', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="view-container active">
      <div className="login-wrapper">
        <div className="card login-card">
          <h1 className="login-title">Plataforma Seguridad y Salud en el Trabajo</h1>
          <p className="login-sub">Ingrese su número de documento para acceder</p>
          <div className="form-group" style={{ textAlign: 'left' }}>
            <label className="form-label">Documento de Identidad</label>
            <input
              type="number"
              className="form-control"
              placeholder="Ej: 10203040"
              value={doc}
              onChange={(e) => setDoc(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            />
          </div>
          <button className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} onClick={handleLogin}>
            Ingresar al Sistema
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
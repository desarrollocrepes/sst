import React, { useState } from 'react';
import { Loader2, IdCard, ShieldAlert, IdCardLanyard } from 'lucide-react';
import { obtenerEmpleadoBuk, normalizeBukUser } from '../utils/helpers';
import './Login.css';

export default function Login({ onLogin }) {
  const [doc, setDoc] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!doc) return;
    
    setLoading(true); 
    setErr('');
    
    try {
      const u = await obtenerEmpleadoBuk(doc);
      if (!u || u.status !== 'activo') throw new Error(u ? 'Usuario inactivo' : 'Documento no encontrado');

      let role = '', equipo = [];
      
      if (u.departamento === 'Seguridad y Salud en el Trabajo' && u.direction === 'Dirección Desarrollo Humano') {
        role = 'SST';
      } else if (u.lider === 1 || u.lider === '1' || u.lider === true) {
        role = 'LIDER';
        equipo = Array.isArray(u.equipo) ? u.equipo.filter(e => String(e.status).toLowerCase() === 'activo') : [];
      } else {
        throw new Error('No tienes permisos para ingresar');
      }

      const nLeader = normalizeBukUser(u);
      const nTeam = equipo.map(normalizeBukUser);
      
      onLogin(
        { 
          document: nLeader.document_number, 
          name: nLeader.nombre, 
          role, 
          area: nLeader.area_nombre, 
          equipo: nTeam, 
          cargo: nLeader.cargo, 
          foto: nLeader.foto 
        }, 
        [nLeader, ...nTeam]
      );
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDocChange = (e) => {
    setDoc(e.target.value.replace(/\D/g, ''));
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <header className="login-header">
          <IdCardLanyard size={48} className="login-icon" />
        </header>

        <form onSubmit={handleSubmit} className="login-body">
          <div className="form-group">
            <label htmlFor="documento" className="form-label">
              Ingresa tu documento para continuar
            </label>
            <div className="input-wrapper">
              <input
                id="documento"
                type="text"
                value={doc}
                placeholder="No. de documento"
                required
                onChange={handleDocChange}
                className="form-input"
                disabled={loading}
              />
            </div>
          </div>

          {err && (
            <div className="alert alert-danger" role="alert">
              <span>{err}</span>
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary btn-w-full login-submit-btn" 
            disabled={loading || !doc}
            style={{ backgroundColor: '#503629', color: '#fff', border: 'none' }}
          >
            {loading ? <Loader2 className="spin" size={18} /> : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
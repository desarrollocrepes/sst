import React, { useState } from 'react';
import { ShieldAlert, UserCircle } from 'lucide-react';
import { obtenerEmpleadoBuk, normalizeBukUser } from '../utils/helpers';

export default function Login({ onLogin }) {
  const [doc, setDoc] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!doc) return;
    setLoading(true); setErr('');
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
        throw new Error('Sin permisos.');
      }

      const nLeader = normalizeBukUser(u);
      const nTeam = equipo.map(normalizeBukUser);
      onLogin(
        { document: nLeader.document_number, name: nLeader.nombre, role, area: nLeader.area_nombre, equipo: nTeam, cargo: nLeader.cargo, foto: nLeader.foto }, 
        [nLeader, ...nTeam]
      );
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card card">
        <div className="login-header">
          <div className="login-icon"><ShieldAlert size={40} /></div>
          <h1>SST</h1><p>Ingreso</p>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Documento</label>
            <div className="input-with-icon">
              <UserCircle className="icon-left" size={20} />
              <input type="number" value={doc} onChange={e => setDoc(e.target.value)} disabled={loading} className="form-control" placeholder="Ingrese documento..." />
            </div>
          </div>
          {err && <p className="error-message">{err}</p>}
          <button disabled={loading || !doc} type="submit" className="btn btn-primary btn-block">
            {loading ? 'Verificando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
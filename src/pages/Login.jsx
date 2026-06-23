import React, { useState } from 'react';
import { Loader2, IdCardLanyard } from 'lucide-react';
import { obtenerEmpleadoBuk, normalizeBukUser } from '../utils/helpers';
import './Login.css';

// Funciones auxiliares para delegar la lógica de negocio
const determineUserRole = (user) => {
  const isSST = user.departamento === 'Seguridad y Salud en el Trabajo' && user.direction === 'Dirección Desarrollo Humano';
  const isLeader = String(user.lider) === '1' || user.lider === true;

  if (isSST) return 'SST';
  if (isLeader) return 'LIDER';
  return null;
};

const getActiveTeam = (equipo) => {
  if (!Array.isArray(equipo)) return [];
  return equipo.filter(member => String(member.status).toLowerCase() === 'activo');
};

export default function Login({ onLogin }) {
  const [documentNumber, setDocumentNumber] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!documentNumber.trim()) return;
    
    setIsLoading(true); 
    setError('');
    
    try {
      const user = await obtenerEmpleadoBuk(documentNumber);
      
      // Validaciones iniciales
      if (!user) throw new Error('Documento no encontrado');
      if (user.status !== 'activo') throw new Error('Usuario inactivo');

      // Asignación de rol
      const role = determineUserRole(user);
      if (!role) {
        throw new Error('No tienes permisos para ingresar');
      }

      // Obtención de equipo activo (Solo si es líder)
      const activeTeam = role === 'LIDER' ? getActiveTeam(user.equipo) : [];

      // Normalización de datos
      const normalizedLeader = normalizeBukUser(user);
      const normalizedTeam = activeTeam.map(normalizeBukUser);
      
      const loginData = { 
        document: normalizedLeader.document_number, 
        name: normalizedLeader.nombre, 
        role, 
        area: normalizedLeader.area_nombre, 
        equipo: normalizedTeam, 
        cargo: normalizedLeader.cargo, 
        foto: normalizedLeader.foto 
      };

      const allUsers = [normalizedLeader, ...normalizedTeam];

      // Ejecutar callback
      onLogin(loginData, allUsers);

    } catch (err) {
      setError(err.message || 'Ocurrió un error inesperado');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDocumentChange = (e) => {
    // Reemplaza cualquier carácter que no sea un dígito
    setDocumentNumber(e.target.value.replace(/\D/g, ''));
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
                value={documentNumber}
                placeholder="No. de documento"
                required
                onChange={handleDocumentChange}
                className="form-input"
                disabled={isLoading}
                aria-invalid={!!error}
              />
            </div>
          </div>

          {error && (
            <div className="alert alert-danger" role="alert">
              <span>{error}</span>
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary btn-w-full login-submit-btn" 
            disabled={isLoading || !documentNumber}
            /* Nota: Sería ideal mover estos estilos en línea a tu archivo Login.css */
            style={{ backgroundColor: '#503629', color: '#fff', border: 'none' }}
          >
            {isLoading ? <Loader2 className="spin" size={18} /> : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
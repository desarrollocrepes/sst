import React, { useState, useEffect, useMemo } from 'react';
import './app.css';
import {
  Shield, Search, AlertTriangle, X, Save, LogOut,
  Users, RefreshCw, CheckCircle, Plus,
  ClipboardPlus,
  CircleUserRound,
  FileText,
  ChevronDown,
  ChevronUp,
  Clock,
  AlertCircle
} from 'lucide-react';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

// Plugin personalizado para agregar valores y porcentajes a las barras/segmentos
const customDataLabelsPlugin = {
  id: 'customDataLabelsPlugin',
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    ctx.save();
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    chart.data.datasets.forEach((dataset, i) => {
      const meta = chart.getDatasetMeta(i);
      const total = dataset.data.reduce((a, b) => a + b, 0);

      meta.data.forEach((element, index) => {
        const val = dataset.data[index];
        if (val > 0) {
          const perc = total > 0 ? Math.round((val / total) * 100) : 0;
          const text = chart.config.type === 'doughnut' ? `${val} (${perc}%)` : `${val} (${perc}%)`;
          
          const position = element.tooltipPosition();
          if (chart.config.type === 'doughnut') {
            ctx.fillStyle = '#ffffff';
            ctx.fillText(text, position.x, position.y);
          } else if (chart.config.type === 'bar') {
             if (chart.options.indexAxis === 'y') {
                 ctx.fillStyle = '#1e293b';
                 ctx.textAlign = 'left';
                 ctx.fillText(text, position.x + 5, position.y);
             } else {
                 ctx.fillStyle = '#1e293b';
                 ctx.textAlign = 'center';
                 ctx.fillText(text, position.x, position.y - 12);
             }
          }
        }
      });
    });
    ctx.restore();
  }
};

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, customDataLabelsPlugin);

// ==================== CONFIG & API HELPERS ====================
const API_EMPLEADOS = 'https://apialohav2.crepesywaffles.com/buk/empleados3';
const API_REPORTES = 'https://macfer.crepesywaffles.com/api/sst-reportes';
const API_SEGUIMIENTOS = 'https://macfer.crepesywaffles.com/api/sst-seguimientos';

async function fetchEmployeeData(doc) {
  try {
    const res = await fetch(`${API_EMPLEADOS}?documento=${doc}`);
    const json = await res.json();
    if (json.ok && json.data && json.data.length > 0) {
      return json.data[0];
    }
  } catch (e) {
    console.error('Error fetching employee', e);
  }
  return null;
}

async function getStrapiErrorMessage(response) {
  try {
    const json = await response.json();
    if (json.error && json.error.message) return json.error.message;
  } catch (e) { }
  return `Error de servidor (HTTP ${response.status})`;
}

const getAge = (birthdate) => {
  if (!birthdate) return null;
  const hoy = new Date();
  const cumple = new Date(birthdate);
  let edad = hoy.getFullYear() - cumple.getFullYear();
  const m = hoy.getMonth() - cumple.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < cumple.getDate())) edad--;
  return isNaN(edad) ? null : edad;
};

const getTenure = (hireDate) => {
  if (!hireDate) return null;
  const hoy = new Date();
  const ingreso = new Date(hireDate);
  let years = hoy.getFullYear() - ingreso.getFullYear();
  const m = hoy.getMonth() - ingreso.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < ingreso.getDate())) years--;
  return isNaN(years) ? null : years;
};

const calcularIMC = (pesoKg, tallaM) => {
  if (!pesoKg || !tallaM) return 'No aplica';
  const imc = pesoKg / (tallaM * tallaM);
  return imc.toFixed(1);
};


// ==================== COMPONENTS ====================

// Componente para graficar el IMC de manera lineal
const BMILinearGauge = ({ imc }) => {
  const numImc = parseFloat(imc);
  if (isNaN(numImc)) return <span style={{ fontWeight: 700, color: 'var(--accent)' }}>No aplica</span>;

  let position = 0;
  let label = '';
  let color = '';

  // Calcular la posición porcentual de la flecha basándonos en los 4 segmentos
  if (numImc < 18.5) {
    position = Math.max(0, ((numImc - 10) / 8.5) * 25);
    label = 'Bajo peso';
    color = '#3b82f6'; // Azul
  } else if (numImc < 25) {
    position = 25 + ((numImc - 18.5) / 6.5) * 25;
    label = 'Normal';
    color = '#10b981'; // Verde
  } else if (numImc < 30) {
    position = 50 + ((numImc - 25) / 5) * 25;
    label = 'Sobrepeso';
    color = '#f97316'; // Naranja
  } else {
    position = 75 + Math.min(25, ((numImc - 30) / 10) * 25);
    label = 'Obesidad';
    color = '#ef4444'; // Rojo
  }

  return (
    <div style={{ width: '100%', marginTop: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
         <span className="info-label" style={{ color: 'var(--text)' }}>IMC</span>
         <span style={{ color, background: `${color}1A`, padding: '2px 8px', borderRadius: '4px' }}>
           {numImc.toFixed(1)} - {label}
         </span>
      </div>
      
      {/* Flecha indicadora superior */}
      <div style={{ position: 'relative', width: '100%', height: '8px', marginBottom: '2px' }}>
        <div style={{
          position: 'absolute',
          top: '0',
          left: `calc(${position}% - 6px)`,
          width: '0',
          height: '0',
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: '8px solid #1e293b',
          transition: 'left 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
        }}></div>
      </div>

      {/* Barra de colores dividida en 4 segmentos */}
      <div style={{ width: '100%', height: '10px', borderRadius: '6px', display: 'flex', overflow: 'hidden', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ flex: 1, background: '#3b82f6' }}></div>
        <div style={{ flex: 1, background: '#10b981' }}></div>
        <div style={{ flex: 1, background: '#f97316' }}></div>
        <div style={{ flex: 1, background: '#ef4444' }}></div>
      </div>
      
      {/* Escala numérica inferior */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--muted)', marginTop: '4px', fontWeight: 600 }}>
        <span style={{width: '25%', textAlign: 'right', paddingRight: '4px'}}>18.5</span>
        <span style={{width: '25%', textAlign: 'right', paddingRight: '4px'}}>24.9</span>
        <span style={{width: '25%', textAlign: 'right', paddingRight: '4px'}}>29.9</span>
        <span style={{width: '25%'}}></span>
      </div>
    </div>
  );
};


const ToastContainer = ({ toasts }) => (
  <div id="toast-container">
    {toasts.map((t) => (
      <div key={t.id} className={`toast ${t.type}`}>
        {t.type === 'error' ? '' : ''} {t.msg}
      </div>
    ))}
  </div>
);

const GlobalHeader = ({ user, onLogout }) => (
  <header className="app-header">
    <div className="header-brand">
      <span>Seguridad y Salud en el Trabajo</span>
    </div>
    <div className="user-info">
      <div className="user-details">
        <div className="user-name">{user.nombre}</div>
        <div className="user-role">{user.cargo}</div>
      </div>
      <img
        src={user.foto || "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2NjbSI+PHBhdGggZD0iTTEyIDJjNS41MiAwIDEwIDQuNDggMTAgMTBzLTQuNDggMTAtMTAgMTBTMiAxNy41MiAyIDEyIDYuNDggMiAxMiAyem0wIDE4YzQuNDEgMCA4LTMuNTkgOC04cy0zLjU5LTgtOC04LTggMy41OS04IDggMy41OSA4IDggOHptMC0xNGMyLjIxIDAgNCAxLjc5 NCA0cy0xLjc5IDQtNCA0LTQtMS43OS00LTQgMS43OS00IDQtNHptMCA2YzIuNjcgMCA4IDEuMzQgOCA0djJIMDR2LTJjMC0yLjY2IDUuMzMtNCA4LTR6Ii8+PC9zdmc+"}
        alt=""
        className="user-avatar"
      />
      <button className="btn btn-outline" onClick={onLogout}>
        <LogOut size={14} />
      </button>
    </div>
  </header>
);

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

const LiderView = ({ user, showToast, setLoading, empCache, setEmpCache }) => {
  const hasEquipo = user.equipo && user.equipo.length > 0;
  const [useDropdownMode, setUseDropdownMode] = useState(hasEquipo);
  const [manualDoc, setManualDoc] = useState('');
  const [selectedColaborador, setSelectedColaborador] = useState(null);
  const [history, setHistory] = useState([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [formData, setFormData] = useState({
    categoria: '', genero: '', peso: '', talla: '',
    entidad_tipo: '', entidad_nombre: '', descripcion: '', archivo: null
  });

  const loadHistory = async () => {
    try {
      const res = await fetch(`${API_REPORTES}?filters[id_lider][$eq]=${user.document_number}&populate=*&sort=createdAt:desc`);
      const json = await res.json();
      const reps = json.data || [];
      setHistory(reps);
      
      const ids = [...new Set(reps.map(r => r.attributes.id_empleado))];
      const uncachedIds = ids.filter(id => !empCache[id]);
      
      if (uncachedIds.length > 0) {
        const newEmps = {};
        await Promise.all(uncachedIds.map(async id => {
           const data = await fetchEmployeeData(id);
           if (data) newEmps[id] = data;
        }));
        setEmpCache(prev => ({ ...prev, ...newEmps }));
      }
    } catch(e) {}
  };

  useEffect(() => { loadHistory(); }, []);

  const handleSelectDropdown = (e) => {
    const cc = e.target.value;
    if (!cc) return setSelectedColaborador(null);
    const emp = user.equipo.find(eq => eq.document_number.toString() === cc);
    setSelectedColaborador(emp || null);
  };

  const handleManualSearch = async () => {
    if (!manualDoc.trim()) return showToast('Ingrese una cédula para buscar', 'error');
    setLoading(true);
    try {
      const emp = await fetchEmployeeData(manualDoc);
      if (emp) {
        setSelectedColaborador(emp);
        showToast('Colaborador encontrado!');
      } else {
        showToast('No se encontró colaborador activo', 'error');
        setSelectedColaborador(null);
      }
    } catch (e) {
      showToast('Error al buscar colaborador', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleFileChange = (e) => setFormData({ ...formData, archivo: e.target.files[0] });

  const handleSubmit = async () => {
    if (!selectedColaborador) return showToast('Debe seleccionar o buscar un colaborador', 'error');
    
    if (!formData.categoria || !formData.genero || !formData.peso || !formData.talla || !formData.entidad_tipo || !formData.entidad_nombre || !formData.descripcion) {
      return showToast('Todos los campos del formulario son obligatorios', 'error');
    }

    setLoading(true);
    try {
      const payloadData = {
        id_empleado: selectedColaborador.document_number.toString(),
        id_lider: user.document_number.toString(),
        categoria: formData.categoria,
        genero: formData.genero,
        peso_kg: parseFloat(formData.peso) || null,
        talla_m: parseFloat(formData.talla) || null,
        entidad_cargo: formData.entidad_tipo,
        nombre_entidad: formData.entidad_nombre.trim(),
        descripcion: formData.descripcion,
        estado: null, 
        publishedAt: new Date().toISOString()
      };

      const formDataPayload = new FormData();
      formDataPayload.append('data', JSON.stringify(payloadData));
      
      if (formData.archivo) {
        formDataPayload.append('files.archivo', formData.archivo);
      }

      const res = await fetch(API_REPORTES, {
        method: 'POST',
        body: formDataPayload 
      });

      if (res.ok) {
        showToast('Reporte enviado exitosamente');
        setFormData({ categoria: '', genero: '', peso: '', talla: '', entidad_tipo: '', entidad_nombre: '', descripcion: '', archivo: null });
        setSelectedColaborador(null);
        setManualDoc('');
        const fileInput = document.getElementById('file-upload');
        if(fileInput) fileInput.value = '';
        
        setIsModalOpen(false); 
        setCurrentPage(1); 
        await loadHistory(); 
      } else {
        const errorMsg = await getStrapiErrorMessage(res);
        showToast(`Error al reportar: ${errorMsg}`, 'error');
      }
    } catch (err) {
      showToast('Error de conexión', 'error');
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(history.length / itemsPerPage);
  const currentItems = history.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="view-container active container">
      

      <div 
        className="alert-banner" 
        style={{ cursor: 'pointer', border: '1px solid var(--accent)' }} 
        onClick={() => setIsModalOpen(true)}
      >
        <ClipboardPlus size={26} color="var(--accent)" />
        <div className="alert-text">
          <strong style={{ fontSize: '16px', color: 'var(--accent)' }}>Haz clic aquí para registrar una novedad de salud de algún miembro de tu equipo</strong>
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={(e) => e.target.className === 'modal-overlay' && setIsModalOpen(false)}>
          <div className="slide-over-modal" style={{ overflowY: 'auto', display: 'block', padding: '30px' }}>
            
            <button className="modal-close" onClick={() => setIsModalOpen(false)} style={{ position: 'absolute', top: '20px', right: '20px' }}>
              <X size={24} />
            </button>
            
            <h2 style={{ marginBottom: '24px', fontSize: '20px', fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              Generar reporte a Seguridad y Salud en el Trabajo
            </h2>

            <div className="report-grid">
              <div className="form-group full-width">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="form-label">{useDropdownMode ? 'Colaborador Afectado' : 'Buscar Colaborador'}</label>
                  {hasEquipo && (
                    <button type="button" className="btn btn-outline" style={{ padding: '2px 8px', fontSize: '11px' }} onClick={() => setUseDropdownMode(!useDropdownMode)}>
                      {useDropdownMode ? <>Buscar por documento</> : <>Usar lista de equipo</>}
                    </button>
                  )}
                </div>

                {useDropdownMode ? (
                  <select className="form-control" onChange={handleSelectDropdown} value={selectedColaborador?.document_number || ""}>
                    <option value="" disabled>Seleccione un colaborador...</option>
                    {user.equipo?.map(emp => (
                      <option key={emp.document_number} value={emp.document_number}>{emp.document_number} {emp.nombre} </option>
                    ))}
                  </select>
                ) : (
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input type="number" className="form-control" placeholder="Ingrese número de documento..." value={manualDoc} onChange={(e) => setManualDoc(e.target.value)} style={{ flex: 1 }} />
                    <button type="button" className="btn btn-outline" onClick={handleManualSearch}>Buscar</button>
                  </div>
                )}

                {selectedColaborador && (
                  <div style={{ marginTop: '10px', background: 'var(--surface2)', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img src={selectedColaborador.foto} alt="" className="user-avatar" style={{ width: '32px', height: '32px' }}/>
                      <span style={{ fontWeight: 700, color: 'var(--text)' }}>{selectedColaborador.nombre}</span>
                      <span style={{ fontSize: '11px', background: 'var(--accent)', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>{selectedColaborador.cargo || 'Colaborador'}</span>
                    </div>
                    <button type="button" className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--red)', borderColor: 'rgba(239,68,68,0.2)' }} onClick={() => setSelectedColaborador(null)}>
                      Remover
                    </button>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Categoría del Evento</label>
                <select name="categoria" className="form-control" value={formData.categoria} onChange={handleChange}>
                  <option value="" disabled>Seleccione Categoría...</option>
                  <option>reincorporación post incapacidad</option>
                  <option>recomendaciones medicas</option>
                  <option>recomendaciones nutricionales</option>
                  <option>incapacidades recurrentes</option>
                  <option>Otro</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Género</label>
                <select name="genero" className="form-control" value={formData.genero} onChange={handleChange}>
                  <option value="" disabled>Seleccione Género...</option>
                  <option>Mujer</option>
                  <option>Hombre</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Peso (KG)</label>
                <input type="number" name="peso" className="form-control" placeholder="Ej: 65" value={formData.peso} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Talla (Metros)</label>
                <input type="number" step="0.01" name="talla" className="form-control" placeholder="Ej: 1.65" value={formData.talla} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Tipo de Entidad</label>
                <select name="entidad_tipo" className="form-control" value={formData.entidad_tipo} onChange={handleChange}>
                  <option value="" disabled>Seleccione Entidad...</option>
                  <option>EPS</option>
                  <option>ARL</option>
                  <option>Medicina Prepagada</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Nombre de Entidad</label>
                <input type="text" name="entidad_nombre" className="form-control" placeholder="Ej: Sanitas..." value={formData.entidad_nombre} onChange={handleChange} />
              </div>
              <div className="form-group full-width">
                <label className="form-label">Descripción detallada</label>
                <textarea name="descripcion" className="form-control" rows="3" placeholder="Describa la situación..." value={formData.descripcion} onChange={handleChange}></textarea>
              </div>
              
              <div className="form-group full-width">
                <label className="form-label">Adjuntar Documento</label>
                <div style={{
                  border: '2px dashed var(--accent)',
                  borderRadius: '8px',
                  padding: '30px 20px',
                  textAlign: 'center',
                  position: 'relative',
                  background: 'var(--surface2)',
                  transition: 'background 0.3s ease'
                }}>
                  <input 
                    id="file-upload" 
                    type="file" 
                    accept="application/pdf" 
                    onChange={handleFileChange} 
                    style={{
                      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                      opacity: 0, cursor: 'pointer', zIndex: 2
                    }}
                  />
                  <FileText size={32} color="var(--accent)" style={{ marginBottom: '12px' }} />
                  <div style={{ fontSize: '15px', color: 'var(--text)', fontWeight: 600 }}>
                    {formData.archivo ? formData.archivo.name : 'Arrastra un archivo aquí o haz clic para subir'}
                  </div>
                </div>
              </div>
            </div>
            
            <div style={{ marginTop: '30px', textAlign: 'right', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
              <button className="btn btn-outline" style={{ marginRight: '10px' }} onClick={() => setIsModalOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSubmit}><Save size={16}/> Enviar Reporte a SST</button>
            </div>
          </div>
        </div>
      )}

      <div className="cases-section">
        <div className="cases-header">
          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Historial de Reportes</div>
          <button className="btn btn-outline" style={{ padding: '6px 12px' }} onClick={loadHistory}><RefreshCw size={14} /> Actualizar</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID Reporte</th>
                <th>Colaborador</th>
                <th>Estado</th>
                <th>Fecha y Hora Reporte</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>No has realizado ningún reporte aún.</td></tr>
              ) : (
                currentItems.map(r => {
                  const attr = r.attributes;
                  const empData = empCache[attr.id_empleado];
                  
                  let estadoBadge = 'alerta';
                  let estadoLabel = 'En seguimiento';
                  if (attr.estado === true) { estadoBadge = 'abierto'; estadoLabel = 'Abierto'; }
                  else if (attr.estado === false) { estadoBadge = 'cerrado'; estadoLabel = 'Cerrado'; }

                  return (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>#{r.id}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {empData?.foto ? (
                            <img src={empData.foto} alt="Avatar" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                          ) : (
                            <CircleUserRound size={36} color="var(--muted)" />
                          )}
                          <div>
                            {empData ? <b style={{color: 'var(--text)'}}>{empData.nombre}</b> : `${attr.id_empleado}`}<br />
                            <span style={{ fontSize: '11px', color: 'var(--muted)' }}>ID: {attr.id_empleado}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge ${estadoBadge}`} style={attr.estado === null ? { background: 'rgba(245, 158, 11, 0.1)', color: 'var(--amber)' } : {}}>
                          {estadoLabel}
                        </span>
                      </td>
                      <td style={{ fontSize: '13px' }}>{new Date(attr.createdAt).toLocaleString('es-CO')}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
          
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: '13px', color: 'var(--text2)' }}>
                Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, history.length)} de {history.length} reportes
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className="btn btn-outline" 
                  disabled={currentPage === 1} 
                  onClick={() => setCurrentPage(p => p - 1)}
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  Anterior
                </button>
                <span style={{ display: 'flex', alignItems: 'center', fontSize: '13px', fontWeight: 600, padding: '0 8px' }}>
                  Página {currentPage} de {totalPages}
                </span>
                <button 
                  className="btn btn-outline" 
                  disabled={currentPage === totalPages} 
                  onClick={() => setCurrentPage(p => p + 1)}
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

const SSTDashboard = ({ user, showToast, setLoading, empCache, setEmpCache }) => {
  const [reportes, setReportes] = useState([]);
  const [filter, setFilter] = useState('todos');
  const [search, setSearch] = useState('');
  const [selectedReporte, setSelectedReporte] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_REPORTES}?populate=*&publicationState=preview`);
      if (!res.ok) throw new Error('API Error');
      const json = await res.json();
      const sorted = json.data.sort((a, b) => new Date(b.attributes.createdAt) - new Date(a.attributes.createdAt));
      
      const ids = [...new Set(sorted.map(r => r.attributes.id_empleado).filter(Boolean))];
      const uncachedIds = ids.filter(id => !empCache[id]);

      if (uncachedIds.length > 0) {
        const newEmps = {};
        await Promise.all(uncachedIds.map(async id => {
           const data = await fetchEmployeeData(id);
           if (data) newEmps[id] = data;
        }));
        setEmpCache(prev => ({ ...prev, ...newEmps }));
      }
      
      setReportes([...sorted]); 
    } catch (err) {
      showToast('Error al cargar datos del servidor', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => { setCurrentPage(1); }, [filter, search]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const limitProximos = new Date(today);
  limitProximos.setDate(limitProximos.getDate() + 5);

  const stats = useMemo(() => {
    let t = reportes.length;
    let ab = 0; let cer = 0; let seg = 0;
    let ven = 0; let prox = 0;

    reportes.forEach(r => {
      const attr = r.attributes;
      if (attr.estado === true) ab++;
      else if (attr.estado === false) cer++;
      else seg++;

      if (attr.estado !== false) {
        const sgs = attr.sst_seguimientos?.data || [];
        const ultimoConTemp = sgs.slice().reverse().find(s => s.attributes.temporalidad);
        if (ultimoConTemp) {
          const tDate = new Date(`${ultimoConTemp.attributes.temporalidad}T00:00:00`);
          if (!isNaN(tDate.getTime())) {
            if (tDate < today) ven++;
            else if (tDate <= limitProximos) prox++;
          }
        }
      }
    });
    return { t, ab, cer, seg, ven, prox };
  }, [reportes, today, limitProximos]);

  const filteredReportes = useMemo(() => {
    let filtered = reportes;
    if (filter === 'Abierto') filtered = filtered.filter(r => r.attributes.estado === true);
    else if (filter === 'Cerrado') filtered = filtered.filter(r => r.attributes.estado === false);
    else if (filter === 'En seguimiento') filtered = filtered.filter(r => r.attributes.estado === null);
    else if (filter === 'Vencidos') {
      filtered = filtered.filter(r => {
        if (r.attributes.estado === false) return false;
        const sgs = r.attributes.sst_seguimientos?.data || [];
        const ultimo = sgs.slice().reverse().find(s => s.attributes.temporalidad);
        if (ultimo) {
           const tDate = new Date(`${ultimo.attributes.temporalidad}T00:00:00`);
           return !isNaN(tDate) && tDate < today;
        }
        return false;
      });
    } else if (filter === 'Proximos') {
      filtered = filtered.filter(r => {
        if (r.attributes.estado === false) return false;
        const sgs = r.attributes.sst_seguimientos?.data || [];
        const ultimo = sgs.slice().reverse().find(s => s.attributes.temporalidad);
        if (ultimo) {
           const tDate = new Date(`${ultimo.attributes.temporalidad}T00:00:00`);
           return !isNaN(tDate) && tDate >= today && tDate <= limitProximos;
        }
        return false;
      });
    }

    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(r => {
        const attr = r.attributes;
        const empName = empCache[attr.id_empleado]?.nombre || '';
        return (attr.id_empleado && attr.id_empleado.includes(s)) ||
          empName.toLowerCase().includes(s) ||
          (attr.categoria || '').toLowerCase().includes(s);
      });
    }
    return filtered;
  }, [reportes, filter, search, empCache, today, limitProximos]);

  const totalPages = Math.ceil(filteredReportes.length / itemsPerPage);
  const currentItems = filteredReportes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const PALETTE = ['#503629', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];

  const estadoData = useMemo(() => {
    const map = { 'Abierto': 0, 'Cerrado': 0, 'En seg.': 0 };
    reportes.forEach(r => {
      if (r.attributes.estado === false) map['Cerrado']++;
      else if (r.attributes.estado === true) map['Abierto']++;
      else map['En seg.']++;
    });
    return {
      labels: Object.keys(map),
      datasets: [{ data: Object.values(map), backgroundColor: ['#3b82f6', '#10b981', '#f59e0b'], borderWidth: 0 }]
    };
  }, [reportes]);

  const accData = useMemo(() => {
    const map = {};
    reportes.forEach(r => {
      const segs = r.attributes.sst_seguimientos?.data || [];
      const acc = segs.length > 0 ? (segs[segs.length - 1].attributes.accion || 'Otro') : 'Pendiente';
      map[acc] = (map[acc] || 0) + 1;
    });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
    return {
      labels: sorted.map(a => a[0]),
      datasets: [{ data: sorted.map(a => a[1]), backgroundColor: PALETTE[0], borderRadius: 4 }]
    };
  }, [reportes]);

  const sisData = useMemo(() => {
    const map = {};
    reportes.forEach(r => {
      const segs = r.attributes.sst_seguimientos?.data || [];
      const sys = segs.length > 0 ? (segs[segs.length - 1].attributes.sistema || 'Otro') : 'Sin Asignar';
      map[sys] = (map[sys] || 0) + 1;
    });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
    return {
      labels: sorted.map(a => a[0]),
      datasets: [{ data: sorted.map(a => a[1]), backgroundColor: PALETTE[4], borderRadius: 4 }]
    };
  }, [reportes]);

  const generoData = useMemo(() => {
    const map = { 'Mujer': 0, 'Hombre': 0, 'Sin Asig.': 0 };
    reportes.forEach(r => {
      const attr = r.attributes;
      const emp = empCache[attr.id_empleado];
      const g = attr.genero || (emp && emp.genero) || '';
      
      if (g.toLowerCase().startsWith('m') && g !== 'Mujer') map['Hombre']++;
      else if (g === 'Mujer' || g === 'Femenino') map['Mujer']++;
      else if (g === 'Hombre' || g === 'Masculino') map['Hombre']++;
      else map['Sin Asig.']++;
    });
    return {
      labels: Object.keys(map),
      datasets: [{ data: Object.values(map), backgroundColor: ['#ec4899', '#3b82f6', '#cbd5e1'], borderWidth: 0 }]
    };
  }, [reportes, empCache]);

  const edadData = useMemo(() => {
    const map = { '0-9': 0, '10-19': 0, '20-29': 0, '30-39': 0, '40-49': 0, '50-59': 0, '60+': 0 };
    reportes.forEach(r => {
      const emp = empCache[r.attributes.id_empleado];
      const age = emp ? getAge(emp.birthday || emp.fecha_nacimiento) : null;
      if (age !== null && !isNaN(age)) {
        if (age <= 9) map['0-9']++;
        else if (age <= 19) map['10-19']++;
        else if (age <= 29) map['20-29']++;
        else if (age <= 39) map['30-39']++;
        else if (age <= 49) map['40-49']++;
        else if (age <= 59) map['50-59']++;
        else map['60+']++;
      }
    });
    const keys = Object.keys(map).filter(k => map[k] > 0);
    return {
      labels: keys,
      datasets: [{ data: keys.map(k => map[k]), backgroundColor: PALETTE[2], borderRadius: 4 }]
    };
  }, [reportes, empCache]);

  const antiguedadData = useMemo(() => {
    const map = { '0-1 año': 0, '1-3 años': 0, '3-5 años': 0, '5+ años': 0, 'No aplica': 0 };
    reportes.forEach(r => {
      const emp = empCache[r.attributes.id_empleado];
      const t = emp ? getTenure(emp.ingreso || emp.fecha_ingreso) : null;
      if (t === null || isNaN(t)) map['No aplica']++;
      else if (t <= 1) map['0-1 año']++;
      else if (t <= 3) map['1-3 años']++;
      else if (t <= 5) map['3-5 años']++;
      else map['5+ años']++;
    });
    const keys = Object.keys(map).filter(k => map[k] > 0);
    return {
      labels: keys,
      datasets: [{ data: keys.map(k => map[k]), backgroundColor: PALETTE[5], borderRadius: 4 }]
    };
  }, [reportes, empCache]);

  const diagData = useMemo(() => {
    const map = {};
    reportes.forEach(r => { 
      const c = r.attributes.categoria || 'Sin Diagnóstico'; 
      map[c] = (map[c] || 0) + 1; 
    });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5); 
    return { 
      labels: sorted.map(a => a[0]), 
      datasets: [{ data: sorted.map(a => a[1]), backgroundColor: PALETTE[6], borderRadius: 4 }] 
    };
  }, [reportes]);

  const entidadData = useMemo(() => {
    const map = { 'EPS': 0, 'ARL': 0, 'Medicina Prepagada': 0, 'Otra': 0 };
    reportes.forEach(r => {
       const ent = r.attributes.entidad_cargo;
       if (ent === 'EPS') map['EPS']++;
       else if (ent === 'ARL') map['ARL']++;
       else if (ent === 'Medicina Prepagada') map['Medicina Prepagada']++;
       else map['Otra']++;
    });
    const keys = Object.keys(map).filter(k => map[k] > 0);
    return {
      labels: keys,
      datasets: [{ data: keys.map(k => map[k]), backgroundColor: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'], borderRadius: 4 }]
    };
  }, [reportes]);

  const barOptionsH = { responsive: true, maintainAspectRatio: false, indexAxis: 'y', layout: { padding: { right: 35 } }, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { grid: { display: false }, ticks: { font: { size: 10 } } } } };
  const barOptionsV = { responsive: true, maintainAspectRatio: false, layout: { padding: { top: 25 } }, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 11 } } }, y: { display: false } } };
  const doughnutOptions = { responsive: true, maintainAspectRatio: false, cutout: '60%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } }, tooltip: { enabled: false } } };

  return (
    <div className="view-container active container">
      
      {/* Alertas de Vencimiento */}
      {(stats.ven > 0 || stats.prox > 0) && (
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
          {stats.ven > 0 && (
            <div className="alert-banner" style={{ flex: 1, margin: 0, padding: '16px', cursor: 'pointer', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444' }} onClick={() => setFilter('Vencidos')}>
              <AlertCircle size={28} color="#ef4444" />
              <div className="alert-text">
                <strong style={{ color: '#b91c1c' }}>{stats.ven} Casos con temporalidad vencida</strong>
                <p style={{ color: '#991b1b', fontSize: '13px' }}>Haz clic aquí para filtrar los casos que ya superaron su fecha límite de seguimiento.</p>
              </div>
            </div>
          )}
          {stats.prox > 0 && (
            <div className="alert-banner" style={{ flex: 1, margin: 0, padding: '16px', cursor: 'pointer', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid #f59e0b' }} onClick={() => setFilter('Proximos')}>
              <Clock size={28} color="#f59e0b" />
              <div className="alert-text">
                <strong style={{ color: '#b45309' }}>{stats.prox} Casos próximos a vencer</strong>
                <p style={{ color: '#92400e', fontSize: '13px' }}>Haz clic aquí para revisar los casos que vencen en los próximos 5 días.</p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="kpis">
        <div className={`kpi ${filter === 'todos' ? 'active-filter' : ''}`} onClick={() => setFilter('todos')}>
          <div className="kpi-label">Total Reportes</div><div className="kpi-value">{stats.t}</div>
        </div>
        <div className={`kpi abierto ${filter === 'Abierto' ? 'active-filter' : ''}`} onClick={() => setFilter('Abierto')}>
          <div className="kpi-label">Abiertos</div><div className="kpi-value">{stats.ab}</div>
        </div>
        <div className={`kpi cerrado ${filter === 'Cerrado' ? 'active-filter' : ''}`} onClick={() => setFilter('Cerrado')}>
          <div className="kpi-label">Cerrados</div><div className="kpi-value">{stats.cer}</div>
        </div>
        <div className={`kpi alerta ${filter === 'En seguimiento' ? 'active-filter' : ''}`} onClick={() => setFilter('En seguimiento')}>
          <div className="kpi-label">En seguimiento</div><div className="kpi-value">{stats.seg}</div>
        </div>
      </div>

      <div className="charts-grid" style={{ display: 'flex', overflowX: 'auto', gap: '16px', paddingBottom: '16px', flexWrap: 'nowrap' }}>
        <div className="chart-card" style={{ flex: '0 0 auto', width: '280px' }}><div className="chart-title">Estado de Casos</div><div className="chart-wrap"><Doughnut data={estadoData} options={doughnutOptions} /></div></div>
        <div className="chart-card" style={{ flex: '0 0 auto', width: '280px' }}><div className="chart-title">Por Entidad</div><div className="chart-wrap"><Bar data={entidadData} options={barOptionsV} /></div></div>
        <div className="chart-card" style={{ flex: '0 0 auto', width: '280px' }}><div className="chart-title">Por Edad</div><div className="chart-wrap"><Bar data={edadData} options={barOptionsV} /></div></div>
        <div className="chart-card" style={{ flex: '0 0 auto', width: '280px' }}><div className="chart-title">Acción Realizada</div><div className="chart-wrap"><Bar data={accData} options={barOptionsH} /></div></div>
        <div className="chart-card" style={{ flex: '0 0 auto', width: '280px' }}><div className="chart-title">Sistema Afectado</div><div className="chart-wrap"><Bar data={sisData} options={barOptionsH} /></div></div>
        <div className="chart-card" style={{ flex: '0 0 auto', width: '280px' }}><div className="chart-title">Por Género</div><div className="chart-wrap"><Doughnut data={generoData} options={doughnutOptions} /></div></div>
        <div className="chart-card" style={{ flex: '0 0 auto', width: '280px' }}><div className="chart-title">Por Antigüedad</div><div className="chart-wrap"><Bar data={antiguedadData} options={barOptionsV} /></div></div>
        <div className="chart-card" style={{ flex: '0 0 auto', width: '280px' }}><div className="chart-title">Top Diagnósticos</div><div className="chart-wrap"><Bar data={diagData} options={barOptionsH} /></div></div>
      </div>

      <div className="cases-section">
        <div className="cases-header">
          <div style={{ fontSize: '18px', fontWeight: 700 }}>Registro de Casos y Seguimientos</div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-outline" onClick={loadData}><RefreshCw size={14} /> Actualizar</button>
            <input type="text" className="form-control search-box" placeholder="Buscar por cédula o diagnóstico..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID Reporte</th>
                <th>Colaborador</th>
                <th>Estado</th>
                <th>Fecha y Hora Reporte</th>
                <th>Seguimientos</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>No se encontraron reportes que coincidan con los filtros.</td></tr>
              ) : (
                currentItems.map(r => {
                  const attr = r.attributes;
                  const segs = attr.sst_seguimientos?.data || [];
                  const empData = empCache[attr.id_empleado];
                  
                  let estadoBadge = 'alerta';
                  let estadoLabel = 'En seguimiento';
                  if (attr.estado === true) { estadoBadge = 'abierto'; estadoLabel = 'Abierto'; }
                  else if (attr.estado === false) { estadoBadge = 'cerrado'; estadoLabel = 'Cerrado'; }

                  return (
                    <tr key={r.id} onClick={() => setSelectedReporte(r)}>
                      <td style={{ fontWeight: 600 }}>#{r.id}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {empData?.foto ? (
                            <img src={empData.foto} alt="Avatar" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                          ) : (
                            <CircleUserRound size={36} color="var(--muted)" />
                          )}
                          <div>
                            {empData ? <b style={{color: 'var(--text)'}}>{empData.nombre}</b> : `${attr.id_empleado}`}<br />
                            <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{attr.id_empleado}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge ${estadoBadge}`} style={attr.estado === null ? { background: 'rgba(245, 158, 11, 0.1)', color: 'var(--amber)' } : {}}>
                          {estadoLabel}
                        </span>
                      </td>
                      <td style={{ fontSize: '13px' }}>{new Date(attr.createdAt).toLocaleString('es-CO')}</td>
                      <td>
                        {segs.length > 0
                          ? <span style={{ color: 'var(--green)', fontSize: '12px', fontWeight: 600 }}>{segs.length} Seguimientos</span>
                          : <span style={{ color: 'var(--red)', fontSize: '12px', fontWeight: 600 }}>Sin Seguimientos</span>}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
          
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: '13px', color: 'var(--text2)' }}>
                Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredReportes.length)} de {filteredReportes.length} reportes
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className="btn btn-outline" 
                  disabled={currentPage === 1} 
                  onClick={() => setCurrentPage(p => p - 1)}
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  Anterior
                </button>
                <span style={{ display: 'flex', alignItems: 'center', fontSize: '13px', fontWeight: 600, padding: '0 8px' }}>
                  Página {currentPage} de {totalPages}
                </span>
                <button 
                  className="btn btn-outline" 
                  disabled={currentPage === totalPages} 
                  onClick={() => setCurrentPage(p => p + 1)}
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {selectedReporte && (
        <SSTModal
          reporte={selectedReporte}
          user={user}
          onClose={() => setSelectedReporte(null)}
          onRefresh={async () => {
            await loadData();
            const res = await fetch(`${API_REPORTES}/${selectedReporte.id}?populate=*`);
            if (res.ok) {
              const updatedReport = await res.json();
              setSelectedReporte(updatedReport.data);
            }
          }}
          showToast={showToast}
          setLoading={setLoading}
          empCache={empCache}
          setEmpCache={setEmpCache}
        />
      )}
    </div>
  );
};

const SSTModal = ({ reporte, user, onClose, onRefresh, showToast, setLoading, empCache, setEmpCache }) => {
  const attr = reporte.attributes;
  const [emp, setEmp] = useState(empCache[attr.id_empleado] || {});
  const [liderEmp, setLiderEmp] = useState({});
  const [, setSstUpdate] = useState(0); 
  const [isFormOpen, setIsFormOpen] = useState(false);

  const segs = attr.sst_seguimientos?.data || [];

  const [form, setForm] = useState({
    accion: '', sistema: '', temporalidad: '', descripcion: '', 
    estado: attr.estado === false ? 'Cerrado' : (attr.estado === true ? 'Abierto' : 'null')
  });

  useEffect(() => {
    const fetchDependencies = async () => {
      let currentEmp = empCache[attr.id_empleado];
      if (!currentEmp) {
         currentEmp = await fetchEmployeeData(attr.id_empleado);
         if (currentEmp) {
           setEmpCache(prev => ({...prev, [attr.id_empleado]: currentEmp}));
           setEmp(currentEmp);
         }
      } else {
         setEmp(currentEmp);
      }

      if (attr.id_lider) {
        let currentLider = empCache[attr.id_lider];
        if (!currentLider) {
           currentLider = await fetchEmployeeData(attr.id_lider);
           if (currentLider) {
             setEmpCache(prev => ({...prev, [attr.id_lider]: currentLider}));
             setLiderEmp(currentLider);
           }
        } else {
           setLiderEmp(currentLider);
        }
      }

      const sstIds = [...new Set(segs.map(s => s.attributes.id_sst).filter(Boolean))];
      const uncachedSst = sstIds.filter(id => !empCache[id]);
      if (uncachedSst.length > 0) {
        const newEmps = {};
        await Promise.all(uncachedSst.map(async id => {
           const d = await fetchEmployeeData(id);
           if (d) newEmps[id] = d;
        }));
        setEmpCache(prev => ({...prev, ...newEmps}));
      }
      setSstUpdate(prev => prev + 1); 
    };
    fetchDependencies();
  }, [attr.id_empleado, attr.id_lider, segs, empCache, setEmpCache]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // Cálculos dinámicos
  const ageVal = getAge(emp.birthday || emp.fecha_nacimiento);
  const edadCalc = ageVal !== null ? `${ageVal} años` : 'No aplica';
  
  const imcCalc = calcularIMC(attr.peso_kg, attr.talla_m);

  // Validación de Fecha Vencida en la vista de modal
  const isTemporalidadVencida = useMemo(() => {
    const ultimoSegConTemp = segs.slice().reverse().find(s => s.attributes.temporalidad);
    if (!ultimoSegConTemp) return false;
    
    const tempStr = ultimoSegConTemp.attributes.temporalidad;
    const tempDate = new Date(`${tempStr}T00:00:00`);
    
    if (!isNaN(tempDate.getTime())) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return tempDate < today ? tempStr : false;
    }
    return false;
  }, [segs]);

  const getFullUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url; 
    return `https://macfer.crepesywaffles.com${url}`;
  };

  const handleSubmit = async () => {
    if (!form.accion || !form.sistema || !form.descripcion.trim()) {
      return showToast('Acción, Sistema y Descripción son obligatorios', 'error');
    }

    setLoading(true);
    try {
      const segPayload = {
        descripcion: form.descripcion,
        accion: form.accion,
        sistema: form.sistema,
        temporalidad: form.temporalidad || null,
        id_sst: user.document_number.toString(),
        publishedAt: new Date().toISOString(),
        sst_reporte: reporte.id,
        sst_reportes: [reporte.id],
        reporte: reporte.id
      };

      const segRes = await fetch(API_SEGUIMIENTOS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: segPayload })
      });

      if (!segRes.ok) throw new Error(await getStrapiErrorMessage(segRes));
      const segJson = await segRes.json();
      const newSegId = segJson.data.id;

      const existingSegs = segs.map(s => s.id);
      existingSegs.push(newSegId);
      
      let nuevoEstadoValue = null;
      if (form.estado === 'Abierto') nuevoEstadoValue = true;
      if (form.estado === 'Cerrado') nuevoEstadoValue = false;

      await fetch(`${API_REPORTES}/${reporte.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: { estado: nuevoEstadoValue, sst_seguimientos: existingSegs }
        })
      });

      showToast('Seguimiento guardado exitosamente');
      setForm({ accion: '', sistema: '', temporalidad: '', descripcion: '', estado: form.estado });
      setIsFormOpen(false);
      await onRefresh();

    } catch (e) {
      showToast(`Error al guardar: ${e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  let estadoBadge = 'alerta'; let estadoLabel = 'En seguimiento';
  if (attr.estado === true) { estadoBadge = 'abierto'; estadoLabel = 'Abierto'; }
  else if (attr.estado === false) { estadoBadge = 'cerrado'; estadoLabel = 'Cerrado'; }

  return (
    <div className="modal-overlay" onClick={(e) => e.target.className === 'modal-overlay' && onClose()}>
      <div className="slide-over-modal">
        
        <div className="slide-panel-left" style={{ background: '#ffffff', padding: '24px' }}>
          
          <div style={{ textAlign: 'center' }}>
            {emp.foto ? (
              <img src={emp.foto} alt="foto emp" style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #f1f5f9', margin: '0 auto 16px' }} />
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                <CircleUserRound size={100} color="var(--muted)" strokeWidth={1} />
              </div>
            )}
            
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>{emp.nombre || 'Cargando...'}</div>
            <div style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 600 }}>{attr.id_empleado}</div>
            <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '14px', fontWeight: 600 }}>{attr.genero || emp.genero || 'No aplica'}</div>

            <div className="info-grid" style={{ textAlign: 'left', gridTemplateColumns: '1fr', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                <span className="info-label">Cargo</span><span className="info-value" style={{ textAlign: 'right' }}>{emp.cargo || 'No aplica'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                <span className="info-label">Área</span><span className="info-value" style={{ textAlign: 'right' }}>{emp.area_nombre || emp.area || 'No aplica'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                <span className="info-label">Departamento</span><span className="info-value" style={{ textAlign: 'right' }}>{emp.departamento || 'No aplica'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                <span className="info-label">Dirección</span><span className="info-value" style={{ textAlign: 'right' }}>{emp.direction || emp.direccion || 'No aplica'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                <span className="info-label">Nacimiento</span><span className="info-value" style={{ textAlign: 'right' }}>{emp.birthday ||'No aplica'} ({edadCalc})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                <span className="info-label">Ingreso</span><span className="info-value" style={{ textAlign: 'right' }}>{emp.ingreso || emp.fecha_ingreso || 'No aplica'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                <span className="info-label">Celular</span><span className="info-value" style={{ textAlign: 'right' }}>{emp.Celular || emp.celular || emp.telefono || 'No aplica'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                <span className="info-label">Correo</span><span className="info-value" style={{ textAlign: 'right' }}>{emp.correo || emp.email || 'No aplica'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                <span className="info-label">Peso / Talla</span><span className="info-value" style={{ textAlign: 'right' }}>{attr.peso_kg ? `${attr.peso_kg}kg` : '-'} / {attr.talla_m ? `${attr.talla_m}m` : '-'}</span>
              </div>
              {attr.peso_kg && attr.talla_m && (
                <div>
                  <BMILinearGauge imc={imcCalc} />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="slide-panel-right">
          <button className="modal-close" onClick={onClose}><X size={20} /></button>

          <div className="slide-panel-history">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 700 }}>Reporte #{reporte.id}</h2>
              <span className={`status-badge ${estadoBadge}`} style={attr.estado === null ? { background: 'rgba(245, 158, 11, 0.1)', color: 'var(--amber)' } : {}}>
                {estadoLabel}
              </span>
            </div>

            {isTemporalidadVencida && (
              <div style={{ background: '#fef2f2', border: '1px solid #ef4444', color: '#b91c1c', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertTriangle size={24} />
                <div>
                  <strong style={{ display: 'block', fontSize: '14px', marginBottom: '2px' }}>¡Alerta de seguimiento!</strong>
                  <span style={{ fontSize: '13px' }}>El compromiso con fecha límite de <strong>{isTemporalidadVencida}</strong> ya se ha cumplido y se encuentra vencido.</span>
                </div>
              </div>
            )}
            
            <div style={{ background: 'var(--surface2)', padding: '16px', borderRadius: '8px', marginBottom: '32px' }}>
              <div style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CircleUserRound size={16} color="var(--muted)"/>
                <span style={{ fontSize: '13px', color: 'var(--text2)' }}>
                  <strong>Reportado por:</strong> {liderEmp.nombre}
                </span>
              </div>
              <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text)' }}>
                Se registra un reporte en la categoría <strong>{attr.categoria || 'No aplica'}</strong>,
                asociado a la entidad <strong>{attr.entidad_cargo || 'No aplica'}: {attr.nombre_entidad || 'No aplica'}</strong>,
                con fecha de reporte inicial <strong>{new Date(attr.createdAt).toLocaleString('es-CO')}</strong>.
                De acuerdo con la información suministrada en la descripción del evento, se reporta: <strong>{attr.descripcion || 'Sin descripción inicial.'}</strong>
              </p>
              
              {attr.archivo?.data && attr.archivo.data.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <a 
                    href={getFullUrl(attr.archivo.data[0].attributes.url)} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="btn btn-outline" 
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                  >
                    <FileText size={14} /> Ver Documento Adjunto
                  </a>
                </div>
              )}
            </div>

            <div className="section-title">Historial de Seguimientos</div>
            <div className="followup-list">
              {segs.length === 0 ? (
                <div >
                  <strong>No hay seguimientos registrados aún para esta novedad</strong>
                </div>
              ) : (
                segs.slice().reverse().map(s => {
                  const sa = s.attributes;
                  const sstDetails = empCache[sa.id_sst];
                  return (
                    <div key={s.id} className="followup-item" style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '16px', borderRadius: '8px', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>
                          {new Date(sa.createdAt).toLocaleString('es-CO')}
                        </div>
                        
                        <div style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 600, background: 'var(--surface2)', padding: '2px 8px', borderRadius: '12px' }}>
                          <CircleUserRound size={16} color="var(--muted)"/><strong> Seguimiento por:</strong> {sstDetails?.nombre || sa.id_sst}
                        </div>
                      </div>
                      <p style={{ fontSize: '14px', lineHeight: '1.6', marginBottom: '8px' }}>
                        <strong>Detalle:</strong> {sa.descripcion || 'Sin descripción.'}
                      </p>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11px', background: 'var(--surface2)', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>{sa.accion || 'No aplica'}</span>
                        <span style={{ fontSize: '11px', background: 'var(--surface2)', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>{sa.sistema || 'No aplica'}</span>
                        {sa.temporalidad && (
                          <span style={{ fontSize: '11px', background: 'var(--surface2)', padding: '4px 8px', borderRadius: '4px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} color="var(--muted)" /> Vence: {sa.temporalidad}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <div className="slide-panel-form">
            <div 
              className="section-title" 
              style={{ 
                cursor: 'pointer', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                userSelect: 'none'
              }}
              onClick={() => setIsFormOpen(!isFormOpen)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                Agregar Nuevo Seguimiento
              </div>
              {isFormOpen ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
            </div>

            {isFormOpen && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Acción Realizada</label>
                  <select name="accion" className="form-control" value={form.accion} onChange={handleChange}>
                    <option value="" disabled>Seleccione Acción...</option>
                    <option>Compromiso de autocuidado</option>
                    <option>Acta de seguimiento</option>
                    <option>Autorización de Lonchera</option>
                    <option>Reincorporacion laboral</option>
                    <option>Cierre de reincorporacion</option>
                    <option>Otra</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Sistema Afectado</label>
                  <select name="sistema" className="form-control" value={form.sistema} onChange={handleChange}>
                    <option value="" disabled>Seleccione Sistema...</option>
                    <option>Cardiovascular</option>
                    <option>Dermatológica</option>
                    <option>Gastrointestinal</option>
                    <option>Genitourinaria</option>
                    <option>Inmunológica</option>
                    <option>Neurológica</option>
                    <option>Respiratoria</option>
                    <option>Alimenticio</option>
                    <option>Otro</option>
                    <option>Neoplasias</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Temporalidad</label>
                  <input type="date" name="temporalidad" className="form-control" value={form.temporalidad} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Actualizar Estado</label>
                  <select name="estado" className="form-control" value={form.estado} onChange={handleChange}>
                    <option value="null">Mantener En seguimiento</option>
                    <option value="Abierto">Cambiar a Abierto</option>
                    <option value="Cerrado">Cerrar Caso</option>
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Descripción</label><textarea name="descripcion" className="form-control" rows="2" placeholder="Detalle la gestión realizada..." value={form.descripcion} onChange={handleChange}></textarea></div>
                
                <div style={{ textAlign: 'right', marginTop: '8px', gridColumn: '1 / -1' }}>
                  <button className="btn btn-primary" onClick={handleSubmit}><Save size={16} /> Guardar Seguimiento</button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [empCache, setEmpCache] = useState({});

  const showToast = (msg, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  };

  const handleLogout = () => { setUser(null); setRole(null); setEmpCache({}); };

  return (
    <>
      <ToastContainer toasts={toasts} />

      {loading && (
        <div className="loading-overlay">
          <div className="loader loader-centered"></div>
          <p style={{ color: 'var(--text2)', fontWeight: 600, marginTop: '16px' }}>Procesando...</p>
        </div>
      )}

      {!user ? (
        <LoginView onLoginSuccess={(u, r) => { setUser(u); setRole(r); }} showToast={showToast} setLoading={setLoading} />
      ) : (
        <>
          <GlobalHeader user={user} onLogout={handleLogout} />
          {role === 'LIDER' ? (
            <LiderView user={user} showToast={showToast} setLoading={setLoading} empCache={empCache} setEmpCache={setEmpCache} />
          ) : (
            <SSTDashboard user={user} showToast={showToast} setLoading={setLoading} empCache={empCache} setEmpCache={setEmpCache} />
          )}
        </>
      )}
    </>
  );
}
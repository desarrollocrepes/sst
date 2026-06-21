import React, { useState, useEffect } from 'react';
import {
  Ticket, Search, Plus, User, CheckCircle2, Clock, AlertCircle, ShieldAlert,
  LogOut, FileText, Briefcase, MapPin, Phone, Mail, RefreshCw, ChevronRight,
  Activity, UserCircle
} from 'lucide-react';
import './App.css';

// ==========================================
// 1. CONFIGURACIÓN Y CONSTANTES
// ==========================================
const STRAPI_BASE_URL = 'https://macfer.crepesywaffles.com/api';
const BUK_API_URL = 'https://apialohav2.crepesywaffles.com/buk/empleados3';

// ==========================================
// 2. UTILIDADES (Funciones matemáticas y de formato)
// ==========================================

// Formatea una fecha para que se vea como DD/MM/AAAA
const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// Calcula la edad exacta basándose en la fecha de nacimiento
const calculateAgeFromBirthDate = (birthDate) => {
  if (!birthDate) return null;
  const parsed = new Date(birthDate);
  if (Number.isNaN(parsed.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - parsed.getFullYear();
  const m = today.getMonth() - parsed.getMonth();
  // Si aún no ha cumplido años este año, restamos 1
  return (m < 0 || (m === 0 && today.getDate() < parsed.getDate())) ? age - 1 : age;
};

// Calcula el Índice de Masa Corporal (IMC) y retorna el color/etiqueta correspondiente
const calculateBMI = (peso, talla) => {
  if (!peso || !talla) return { value: '-', label: 'N/A', cssClass: 'bmi-default' };
  const imc = (peso / (talla * talla)).toFixed(1);
  if (imc < 18.5) return { value: imc, label: 'Bajo peso', cssClass: 'bmi-low' };
  if (imc < 25) return { value: imc, label: 'Peso normal', cssClass: 'bmi-normal' };
  if (imc < 30) return { value: imc, label: 'Sobrepeso', cssClass: 'bmi-warning' };
  return { value: imc, label: 'Obesidad', cssClass: 'bmi-danger' };
};

// Estandariza los datos que vienen de la API para que siempre tengan las mismas propiedades
const normalizeBukUser = (user) => ({
  ...user,
  document_number: String(user.document_number) || '',
  nombre: user.nombre || '',
  foto: user.foto || null,
  Celular: user.Celular || '',
  correo: user.correo || '',
  ingreso: user.ingreso || '',
  area_nombre: user.area_nombre || '',
  departamento: user.departamento || '',
  direction: user.direction || '',
  cargo: user.cargo || '',
  genero: user.genero || '',
  status: user.status || '',
  birthday: user.birthday || ''
});

// ==========================================
// 3. SERVICIOS DE API (Peticiones al servidor)
// ==========================================

// ¡Aquí unificamos la consulta repetida! Esta función trae los datos del empleado
// y es usada tanto en el Login como al crear un nuevo reporte.
const obtenerEmpleadoBuk = async (documento) => {
  if (!documento) return null;
  try {
    const res = await fetch(`${BUK_API_URL}?documento=${documento}`);
    if (!res.ok) throw new Error('Error al conectar con la API de empleados');
    const json = await res.json();
    // La API a veces devuelve un arreglo y a veces un objeto directo
    const data = Array.isArray(json.data || json) ? (json.data || json)[0] : (json.data || json);
    return data ? normalizeBukUser(data) : null;
  } catch (err) {
    console.error('Error cargando empleado:', err);
    return null;
  }
};

// ==========================================
// 4. COMPONENTES UI (Piezas visuales reutilizables)
// ==========================================

const StatusBadge = ({ status }) => {
  const s = status?.toLowerCase() || '';
  const badgeClass = s.includes('abierto') ? 'badge-danger' :
    s.includes('seguimiento') ? 'badge-warning' :
      s.includes('cerrado') ? 'badge-success' : 'badge-default';
  return <span className={`badge ${badgeClass}`}>{status}</span>;
};

const DashboardStats = ({ stats }) => {
  const cards = [
    { title: 'Total Casos', val: stats.total, color: 'blue', Icon: Ticket },
    { title: 'Sin Atender (Abiertos)', val: stats.open, color: 'red', Icon: AlertCircle },
    { title: 'En Seguimiento', val: stats.inProgress, color: 'amber', Icon: Clock },
    { title: 'Casos Cerrados', val: stats.closed, color: 'emerald', Icon: CheckCircle2 }
  ];
  return (
    <div className="stats-grid">
      {cards.map(({ title, val, color, Icon }, i) => (
        <div key={i} className="stat-card">
          <div className="stat-info">
            <p className="stat-title">{title}</p>
            <p className={`stat-value ${color !== 'blue' ? `text-${color}` : ''}`}>{val}</p>
          </div>
          <div className={`stat-icon icon-${color}`}><Icon size={24} /></div>
        </div>
      ))}
    </div>
  );
};

// ==========================================
// 5. MODALES (Ventanas emergentes complejas)
// ==========================================

const NewReportModal = ({ currentUser, onClose, onRefresh }) => {
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [empDetails, setEmpDetails] = useState(null);
  const [form, setForm] = useState({ type: 'Incidente', peso: '', talla: '', gender: '', entityType: 'EPS', entityName: '', description: '' });
  const [supportFile, setSupportFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateForm = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  // Busca los datos del empleado seleccionado (primero en el equipo local, luego en la API)
  const handleSelectEmployee = async (docNum) => {
    setSelectedEmpId(docNum);
    if (!docNum) return setEmpDetails(null);

    // Buscamos si el empleado ya está en el estado de React (equipo del líder)
    const teamEmp = currentUser.equipo?.find(emp => String(emp.document_number) === String(docNum));
    const normEmp = teamEmp ? normalizeBukUser(teamEmp) : null;
    setEmpDetails(normEmp);

    // Complementamos con una llamada a la API por si faltan datos recientes usando la función centralizada
    const bukEmp = await obtenerEmpleadoBuk(docNum);
    if (bukEmp) setEmpDetails({ ...normEmp, ...bukEmp });
  };

  // Envía el reporte a Strapi
  const handleSubmit = async (e) => {
    e.preventDefault();
    const emp = empDetails || currentUser.equipo.find(e => String(e.document_number) === String(selectedEmpId));
    if (!emp || !form.description.trim()) return;

    setIsSubmitting(true);
    try {
      let archivoId = null;

      // 1. Subir archivo PDF si existe
      if (supportFile) {
        const uploadData = new FormData();
        uploadData.append('files', supportFile);
        const upRes = await fetch(`${STRAPI_BASE_URL.replace('/api', '')}/api/upload`, { method: 'POST', body: uploadData });
        if (!upRes.ok) throw new Error('Error al subir PDF.');
        const upJson = await upRes.json();
        archivoId = Array.isArray(upJson) ? upJson[0]?.id : upJson.id;
      }

      // 2. Estructurar los datos para Strapi
      const payload = {
        data: {
          id_empleado: String(emp.document_number),
          id_lider: String(currentUser.document),
          genero: form.gender || null,
          fecha_nacimiento: emp.birthday || null,
          categoria: form.type,
          entidad_cargo: form.entityType,
          nombre_entidad: form.entityName || null,
          peso_kg: form.peso ? parseFloat(form.peso) : null,
          talla_m: form.talla ? parseFloat(form.talla) : null,
          descripcion: form.description,
          estado: 'Abierto',
          archivo_pdf: archivoId || null
        }
      };

      // 3. Enviar el reporte
      const res = await fetch(`${STRAPI_BASE_URL}/sst-reportes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Error guardando reporte.");

      onRefresh(); // Recarga la tabla de datos
      onClose();   // Cierra el modal
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const emp = empDetails || normalizeBukUser(currentUser.equipo?.find(e => String(e.document_number) === selectedEmpId) || {});

  const CATEGORIAS = ['Incidente', 'Accidente Leve', 'Accidente Grave', 'Condición Insegura', 'Enfermedad Laboral', 'Reincorporación post incapacidad', 'Recomendaciones medicas', 'Recomendaciones nutricionales', 'Incapacidades recurrentes'];
  const ENTIDADES = ['EPS', 'ARL', 'Medicina prepagada'];

  return (
    <div className="modal-overlay">
      <div className="modal-window wide-modal">
        <div className="modal-header">
          <button onClick={onClose} className="btn btn-dark">Cerrar</button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit} className="form-card">

            {/* Sección: Selección de Colaborador */}
            <div className="form-section">
              <div className="form-group">
                <label>Seleccionar colaborador</label>
                <select className="form-control" value={selectedEmpId} onChange={(e) => handleSelectEmployee(e.target.value)} required>
                  <option value="" disabled>-- Seleccione --</option>
                  {currentUser.equipo?.map(e => <option key={e.document_number} value={e.document_number}>{e.document_number} - {e.nombre}</option>)}
                </select>
              </div>

              {/* Muestra los datos del colaborador si ya se seleccionó uno */}
              {selectedEmpId && emp && (
                <div className="employee-preview">
                  <div className="employee-header">
                    {emp.foto ? <img src={emp.foto} alt="Foto" className="avatar" /> : <div className="avatar placeholder">{emp.nombre?.charAt(0)}</div>}
                    <div className="employee-info">
                      <h3>{emp.nombre}</h3>
                    </div>
                  </div>
                  <div className="employee-form">
                    
                    <div className="form-column">
                      
                      <div className="form-group">
                        <label>Género</label>
                        <select value={form.gender} onChange={(e) => updateForm('gender', e.target.value)} className="form-control" required>
                          <option value="">-- Seleccione --</option><option value="HOMBRE">Hombre</option><option value="MUJER">Mujer</option><option value="OTRO">Otro</option>
                        </select>
                      </div>
                      
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sección: Detalles de la Novedad */}
            <div className="form-section">
              <h3 className="section-title"><FileText size={18} /> Detalles de la Novedad</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Categoría</label>
                  <select value={form.type} onChange={(e) => updateForm('type', e.target.value)} className="form-control">
                    {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Entidad a cargo</label>
                  <select value={form.entityType} onChange={(e) => updateForm('entityType', e.target.value)} className="form-control">
                    {ENTIDADES.map(en => <option key={en} value={en}>{en}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Nombre Entidad</label><input value={form.entityName} onChange={(e) => updateForm('entityName', e.target.value)} className="form-control" required /></div>
                <div className="form-group"><label>Peso (kg)</label><input type="number" step="0.1" required className="form-control" value={form.peso} onChange={(e) => updateForm('peso', e.target.value)} /></div>
                <div className="form-group"><label>Talla (m)</label><input type="number" step="0.01" required className="form-control" value={form.talla} onChange={(e) => updateForm('talla', e.target.value)} /></div>
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <textarea required rows="4" value={form.description} onChange={(e) => updateForm('description', e.target.value)} className="form-control" placeholder="Explique qué pasó..."></textarea>
              </div>
              <div className="form-group">
                <label>Adjuntos (PDF)</label>
                <input type="file" accept="application/pdf" onChange={(e) => setSupportFile(e.target.files?.[0] || null)} className="form-control" />
                {supportFile && <p className="text-small">Archivo: {supportFile.name}</p>}
              </div>
            </div>

            {/* Botones de acción */}
            <div className="form-actions">
              <button type="button" onClick={onClose} className="btn btn-secondary">Cancelar</button>
              <button disabled={isSubmitting || !selectedEmpId} type="submit" className="btn btn-primary">
                {isSubmitting ? 'Guardando...' : 'Enviar Reporte'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const TimelineItem = ({ h, isNewest, isOpen, toggleOpen }) => (
  <div className="drawer-timeline-item">
    <div className={`drawer-timeline-dot ${isNewest ? 'newest' : ''}`}></div>
    <div className={`drawer-timeline-card ${isOpen ? 'open' : ''}`}>
      <button 
        type="button"
        onClick={() => toggleOpen(h.id)}
        className="drawer-timeline-header-btn"
      >
        <div className="drawer-timeline-info">
          <div className="drawer-timeline-meta">
            <span className="drawer-timeline-date">{h.date}</span>
            {isNewest && <span className="drawer-timeline-badge-new">Último</span>}
          </div>
          <h4 className="drawer-timeline-title">Gestión SST</h4>
        </div>
        <div className="drawer-timeline-author-sec">
          <div className="drawer-timeline-author-info">
            <p className="drawer-timeline-author-name">ID Admin: {h.author}</p>
            <p className="drawer-timeline-author-role">Gestor</p>
          </div>
          <div className="drawer-timeline-avatar-placeholder">
            <UserCircle size={20} />
          </div>
          <div className={`drawer-timeline-chevron ${isOpen ? 'rotated' : ''}`}>
            <ChevronRight size={18} />
          </div>
        </div>
      </button>
      
      <div className={`drawer-timeline-content-wrapper ${isOpen ? 'expanded' : ''}`}>
        <div className="drawer-timeline-content">
          <p>{h.note}</p>
        </div>
      </div>
    </div>
  </div>
);

const CaseManagementModal = ({ report, currentUser, onClose, onRefresh }) => {
  const [form, setForm] = useState({
    note: '', status: report.status || 'Abierto', action: report.accion || 'Compromiso autocuidado',
    system: report.sistema_afectado || 'No Aplica', duration: report.temporalidad || 'No Aplica'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(
    // Abrir por defecto el historial más reciente si existe
    report.history.length > 0 ? { [report.history[0].id]: true } : {}
  );

  const updateForm = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const toggleHistory = (id) => setHistoryOpen(p => ({ ...p, [id]: !p[id] }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.note.trim()) return;
    setIsSubmitting(true);

    try {
      const segRes = await fetch(`${STRAPI_BASE_URL}/sst-seguimientos`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { id_admin: String(currentUser.document), descripcion: form.note, sst_reporte: report.strapiId } })
      });
      if (!segRes.ok) throw new Error('Error guardando seguimiento');

      const newSegId = (await segRes.json()).data.id;

      const repRes = await fetch(`${STRAPI_BASE_URL}/sst-reportes/${report.strapiId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            estado: form.status, accion: form.action, sistema_afectado: form.system, temporalidad: form.duration,
            sst_seguimientos: [...report.history.map(h => h.id), newSegId]
          }
        })
      });
      if (!repRes.ok) throw new Error('Error actualizando estado');

      onRefresh(); onClose();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const details = report.employeeDetails || {};
  const bmi = calculateBMI(details.peso_kg, details.talla_m);

  const ACCIONES = ['Compromiso autocuidado', 'Reincoporacion laboral', 'Acta de seguimiento', 'Autorización de lonchera', 'Cierre de reincorporación', 'Otra'];
  const SISTEMAS = ['No Aplica', 'Genitourinario', 'Dermatológico', 'Cardiovascular', 'Gastrointestinal', 'Respiratorio', 'Inmunologico', 'Alimenticio', 'Neurologico', 'Neoplasias'];
  const TEMPORALIDADES = ['No Aplica', '1 mes', '3 meses'];
  const ESTADOS = ['Abierto', 'En Seguimiento', 'Cerrado', 'Retirado'];

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-panel" onClick={e => e.stopPropagation()}>
        
        {/* --- COLUMNA IZQUIERDA: CONTEXTO --- */}
        <div className="drawer-left">
          <div className="drawer-left-header">
            <button onClick={onClose} className="drawer-close-btn"><LogOut size={20} /></button>
            <span className="drawer-id-badge"><ShieldAlert size={14} /> ID: #{report.id}</span>
            <p className="drawer-sub-title"><Clock size={14}/> Reportado el {report.date} por ID: {report.leaderDocument}</p>
          </div>

          <div className="drawer-section">
            
            <div className="drawer-profile-header">
              {details.foto ? <img src={details.foto} alt="Perfil" className="drawer-avatar" /> : <div className="drawer-avatar placeholder">{report.employeeName.charAt(0)}</div>}
              <div>
                <h2 className="drawer-profile-name">{details.employeeName}</h2>
                <p className="drawer-profile-doc">CC: {details.documento}</p>
                <span className="drawer-profile-tag">Ingreso: {details.ingreso}</span>
              </div>
            </div>

            <div className="drawer-contact-list">
              <div className="drawer-contact-item highlight">
                <Briefcase size={16} />
                <div>
                  <strong>{details.cargo}</strong>
                  <span>{details.direction}</span>
                </div>
              </div>
              <div className="drawer-contact-item"><MapPin size={16} /> <span>{details.area_nombre} - {details.departamento}</span></div>
              <div className="drawer-contact-item"><Phone size={16} /> <span>{details.Celular}</span></div>
              <div className="drawer-contact-item"><Mail size={16} /> <span>{details.correo}</span></div>
              <div className="drawer-contact-item"><UserCircle size={16} /> <span>{details.age != null ? `${details.age} años` : 'N/R'} - {details.genero || 'N/R'}</span></div>
            </div>

            <div className="drawer-biometrics">
              <div className="drawer-bio-box">
                <span className="drawer-bio-label">Peso</span>
                <strong className="drawer-bio-val">{details.peso_kg || '--'} <small>kg</small></strong>
              </div>
              <div className="drawer-bio-box">
                <span className="drawer-bio-label">Talla</span>
                <strong className="drawer-bio-val">{details.talla_m || '--'} <small>m</small></strong>
              </div>
              <div className={`drawer-bio-box bmi-box ${bmi.cssClass}`}>
                <span className="drawer-bio-label">IMC</span>
                <strong className="drawer-bio-val">{bmi.value}</strong>
                <div className="drawer-bmi-indicator"></div>
              </div>
            </div>
          </div>

          <div className="drawer-section drawer-context-section">
            <h3 className="drawer-section-title"><FileText size={16} /> Contexto del Caso</h3>
            <div className="drawer-context-card">
              <div className="drawer-context-row">
                <span className="drawer-context-label">Categoría</span>
                <strong className="drawer-context-val">{report.type}</strong>
              </div>
              <div className="drawer-context-row">
                <span className="drawer-context-label">Entidad</span>
                <span className="drawer-context-val">{report.entityCharge} - {report.entityName}</span>
              </div>
              <div className="drawer-context-row">
                <span className="drawer-context-label">Estado Actual</span>
                <StatusBadge status={report.status} />
              </div>
              <div className="drawer-context-desc">
                <span className="drawer-context-label">Descripción Original</span>
                <p>"{report.description}"</p>
              </div>
              {report.fileAttachment?.url && (
                <div className="drawer-context-row" style={{marginTop: '10px'}}>
                  <a href={report.fileAttachment.url.startsWith('http') ? report.fileAttachment.url : `${STRAPI_BASE_URL.replace('/api', '')}${report.fileAttachment.url}`} target="_blank" rel="noreferrer" className="btn btn-outline-primary btn-sm block-btn">
                    Ver Archivo Adjunto
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* --- COLUMNA DERECHA: INTERACCIÓN --- */}
        <div className="drawer-right">
          

          <div className="drawer-body">
            <div className="drawer-content-max">
              <h3 className="drawer-section-title"><Clock size={16} /> Historial de Seguimiento</h3>
              
              <div className="drawer-timeline-container">
                {report.history.map((h, index) => (
                  <TimelineItem 
                    key={h.id} 
                    h={h} 
                    isNewest={index === 0} 
                    isOpen={!!historyOpen[h.id]} 
                    toggleOpen={toggleHistory} 
                  />
                ))}
                
                {report.history.length === 0 && (
                  <div className="drawer-timeline-item">
                    <div className="drawer-timeline-dot"></div>
                    <div className="drawer-timeline-card empty">
                      <p>Aún no hay gestiones registradas para este caso.</p>
                    </div>
                  </div>
                )}
                
                {/* Evento inicial anclado al final */}
                <div className="drawer-timeline-item">
                  <div className="drawer-timeline-dot initial"></div>
                  <div className="drawer-timeline-card">
                    <div className="drawer-timeline-header-btn" style={{cursor: 'default', backgroundColor: '#fff'}}>
                      <div className="drawer-timeline-info">
                        <div className="drawer-timeline-meta"><span className="drawer-timeline-date">{report.date}</span></div>
                        <h4 className="drawer-timeline-title">Apertura de Caso</h4>
                      </div>
                      <div className="drawer-timeline-author-sec">
                        <div className="drawer-timeline-author-info"><p className="drawer-timeline-author-name">ID: {report.leaderDocument}</p><p className="drawer-timeline-author-role">Líder</p></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Formulario Sticky Inferior (Solo SST) */}
          {currentUser.role === 'SST' && (
            <div className="drawer-footer">
              <div className="drawer-content-max">
                <div className="drawer-footer-title">
                  
                  <h3>Registrar Nueva Gestión</h3>
                </div>
                
                <form onSubmit={handleSubmit} className="drawer-form">
                  <div className="drawer-form-grid">
                    <div className="form-group-compact">
                      <label>Acción</label>
                      <select value={form.action} onChange={e => updateForm('action', e.target.value)}>{ACCIONES.map(a => <option key={a} value={a}>{a}</option>)}</select>
                    </div>
                    <div className="form-group-compact">
                      <label>Sistema</label>
                      <select value={form.system} onChange={e => updateForm('system', e.target.value)}>{SISTEMAS.map(s => <option key={s} value={s}>{s}</option>)}</select>
                    </div>
                    <div className="form-group-compact">
                      <label>Temporalidad</label>
                      <select value={form.duration} onChange={e => updateForm('duration', e.target.value)}>{TEMPORALIDADES.map(t => <option key={t} value={t}>{t}</option>)}</select>
                    </div>
                    <div className="form-group-compact">
                      <label>Estado</label>
                      <select value={form.status} onChange={e => updateForm('status', e.target.value)}>{ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}</select>
                    </div>
                  </div>

                  <div className="drawer-form-action-row">
                    <div className="drawer-form-textarea">
                      <label>Detalles del seguimiento</label>
                      <textarea required rows="2" placeholder="Escribe aquí los detalles de la gestión..." value={form.note} onChange={e => updateForm('note', e.target.value)}></textarea>
                    </div>
                    <button type="submit" disabled={isSubmitting} className="drawer-submit-btn">
                      <span>{isSubmitting ? 'Guardando...' : 'Guardar'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 6. PANTALLAS PRINCIPALES
// ==========================================

function Login({ onLogin }) {
  const [doc, setDoc] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!doc) return;
    setLoading(true); setErr('');
    try {
      // ¡Ahora usamos el servicio unificado!
      const u = await obtenerEmpleadoBuk(doc);
      if (!u || u.status !== 'activo') throw new Error(u ? 'Usuario inactivo' : 'Documento no encontrado');

      // Verificación de Roles y Permisos
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
      // Pasamos los datos al componente App
      onLogin({ document: nLeader.document_number, name: nLeader.nombre, role, area: nLeader.area_nombre, equipo: nTeam, cargo: nLeader.cargo, foto: nLeader.foto }, [nLeader, ...nTeam]);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card card">
        <div className="login-header"><div className="login-icon"><ShieldAlert size={40} /></div><h1>SST</h1><p>Ingreso</p></div>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Documento</label>
            <div className="input-with-icon">
              <UserCircle className="icon-left" size={20} />
              <input type="number" value={doc} onChange={e => setDoc(e.target.value)} disabled={loading} className="form-control" placeholder="Ingrese documento..." />
            </div>
          </div>
          {err && <p className="error-message">{err}</p>}
          <button disabled={loading || !doc} type="submit" className="btn btn-primary btn-block">{loading ? 'Verificando...' : 'Ingresar'}</button>
        </form>
      </div>
    </div>
  );
}

// Componente Raíz de la Aplicación
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [allBukUsers, setAllBukUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Obtiene los reportes desde Strapi según el rol (SST ve todo, Líder solo lo suyo)
  const fetchReports = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const filter = currentUser.role === 'LIDER' ? `&filters[id_lider][$eq]=${currentUser.document}` : '';
      const res = await fetch(`${STRAPI_BASE_URL}/sst-reportes?populate=sst_seguimientos,archivo_pdf&sort=createdAt:desc${filter}`);
      const { data } = await res.json();

      if (data) {
        // Mapeamos los datos de Strapi cruzándolos con los datos estáticos de los empleados que ya tenemos
        setReports(data.map(item => {
          const att = item.attributes;
          const buk = normalizeBukUser(allBukUsers.find(u => String(u.document_number) === String(att.id_empleado)) || {});
          const pdf = Array.isArray(att.archivo_pdf?.data) ? att.archivo_pdf.data[0] : (att.archivo_pdf?.data || att.archivo_pdf);
          return {
            id: String(item.id),
            strapiId: item.id,
            employeeId: att.id_empleado,
            employeeName: buk.nombre,
            employeeDetails: {foto: buk.foto,
            documento: att.id_empleado,
            celular: buk.Celular,
            correo: buk.correo,
            cargo: buk.cargo ,
            area_nombre: buk.area_nombre,
            departamento: buk.departamento,
            direction: buk.direction || '-',
            ingreso: buk.ingreso || '-',
            peso_kg: att.peso_kg,
            talla_m: att.talla_m,
            birthDate: att.fecha_nacimiento,
            age: calculateAgeFromBirthDate(att.fecha_nacimiento),
            genero: att.genero || buk.genero || '-'
            },
            entityCharge: att.entidad_cargo || '-',
            entityName: att.nombre_entidad || '-',
            fileAttachment: pdf ? { id: pdf.id, name: pdf.attributes?.name || pdf.name, url: pdf.attributes?.url || null } : null,
            leaderDocument: att.id_lider,
            date: formatDate(att.createdAt),
            type: att.categoria,
            description: att.descripcion,
            status: att.estado, 
            accion: att.accion,
            sistema_afectado: att.sistema_afectado, 
            temporalidad: att.temporalidad,
            history: (att.sst_seguimientos?.data || []).map(seg => ({ id: seg.id,
            date: formatDate(seg.attributes.createdAt),
            rawDate: seg.attributes.createdAt,
            note: seg.attributes.descripcion,
            author: seg.attributes.id_admin })).sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate))
          };
        }));
      }
    } catch (err) { alert("Error cargando servidor."); } finally { setLoading(false); }
  };

  // Se ejecuta al iniciar sesión para cargar la tabla
  useEffect(() => { if (currentUser) fetchReports(); }, [currentUser]);

  // Abre el modal de gestión y, si faltan datos del empleado, los busca en la API centralizada
  const handleOpenCase = async (report) => {
    const copy = { ...report };
    if (!copy.employeeDetails?.Celular || copy.employeeDetails.Celular === 'N/R') {
      const buk = await obtenerEmpleadoBuk(copy.employeeId);
      if (buk) copy.employeeDetails = { ...copy.employeeDetails, ...buk, documento: copy.employeeId };
    }
    setSelectedReport(copy);
  };

  // Si no hay usuario, mostramos el Login
  if (!currentUser) return <Login onLogin={(u, buk) => { setAllBukUsers(buk); setCurrentUser(u); }} />;

  const filtered = reports.filter(t => [t.type, t.id, t.employeeName].some(v => v?.toLowerCase().includes(search.toLowerCase())));
  const stats = { total: reports.length, open: reports.filter(t => t.status === 'Abierto').length, inProgress: reports.filter(t => t.status === 'En Seguimiento').length, closed: reports.filter(t => t.status === 'Cerrado').length };

  return (
    <div className="app-layout">
      <main className="main-content">
        <div className="content-area">
          <div className="view-container">
            {/* Cabecera Principal */}
            <div className="view-header">
              <div className="topbar-actions">
                <div className="user-header">
                  <div className="user-info">
                    {currentUser.foto ? <img src={currentUser.foto} alt="Perfil" className="user-avatar" /> : <div className="user-avatar-fallback"><User size={14} /></div>}
                    <h2>¡Hola, {currentUser.name}!</h2>
                  </div>
                  <div className="user-actions">
                    <button onClick={fetchReports} disabled={loading} className="btn btn-primary"><RefreshCw size={16} /><span>Actualizar</span></button>
                    <button onClick={() => { setCurrentUser(null); setReports([]); setAllBukUsers([]); }} className="btn btn-secondary"><LogOut size={18} /><span>Salir</span></button>
                  </div>
                </div>
              </div>
            </div>

            {/* Tarjetas de Estadísticas (Solo para SST) */}
            {currentUser.role === 'SST' && <DashboardStats stats={stats} />}

            {/* Tabla Principal */}
            <div className="card table-card">
              <div className="table-toolbar">
                <div className="search-wrapper"><Search className="search-icon" size={20} /><input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="form-control" /></div>
                {currentUser.role === 'LIDER' && <button onClick={() => setShowModal(true)} className="btn btn-primary"><Plus size={18} /> Crear Reporte</button>}
              </div>

              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr><th>ID</th><th>Fecha</th><th>Cédula</th><th>Colaborador</th><th>Tipo</th>{currentUser.role === 'SST' && <th>Detalle</th>}<th>Estado</th>{currentUser.role === 'SST' && <th>Acción</th>}</tr>
                  </thead>
                  <tbody>
                    {filtered.map(t => (
                      <tr key={t.id}>
                        <td><p className="table-bold-text">{t.id}</p></td><td><p className="table-bold-text">{t.date}</p></td><td><p className="table-bold-text">{t.employeeId}</p></td>
                        <td><p className="table-bold-text">{t.employeeName}</p></td><td><p className="table-bold-text">{t.type}</p></td>
                        {currentUser.role === 'SST' && <td><p className="table-text-truncate">{t.description}</p></td>}
                        <td><StatusBadge status={t.status} /></td>
                        {currentUser.role === 'SST' && <td><button onClick={() => handleOpenCase(t)} className="btn btn-outline-primary btn-sm">Gestionar <ChevronRight size={16} /></button></td>}
                      </tr>
                    ))}
                    {!filtered.length && !loading && <tr><td colSpan="8" className="table-empty-state">No hay casos registrados.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Renderizado Condicional de Modales */}
        {selectedReport && <CaseManagementModal report={selectedReport} currentUser={currentUser} onClose={() => setSelectedReport(null)} onRefresh={fetchReports} />}
        {showModal && <NewReportModal currentUser={currentUser} onClose={() => setShowModal(false)} onRefresh={fetchReports} />}
      </main>
    </div>
  );
}
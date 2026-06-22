import React, { useState, useEffect } from 'react';
import { Ticket, Search, User, CheckCircle2, Clock, AlertCircle, ShieldAlert, LogOut, FileText, Briefcase, MapPin, Phone, Mail, RefreshCw, ChevronRight, UserCircle, Hash } from 'lucide-react';
import { STRAPI_BASE_URL, mapStrapiToReports, obtenerEmpleadoBuk, calculateBMI, StatusBadge } from '../utils/helpers';
import './SSTView.css';

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

const TimelineItem = ({ h, isNewest, isOpen, toggleOpen }) => (
  <div className="drawer-timeline-item">
    <div className={`drawer-timeline-dot ${isNewest ? 'newest' : ''}`}></div>
    <div className={`drawer-timeline-card ${isOpen ? 'open' : ''}`}>
      <button type="button" onClick={() => toggleOpen(h.id)} className="drawer-timeline-header-btn">
        <div className="drawer-timeline-info">
          <div className="drawer-timeline-meta"><span className="drawer-timeline-date">{h.date}</span>{isNewest && <span className="drawer-timeline-badge-new">Último</span>}</div>
          <h4 className="drawer-timeline-title">Gestión SST</h4>
        </div>
        <div className="drawer-timeline-author-sec">
          <div className="drawer-timeline-author-info"><p className="drawer-timeline-author-name">ID Admin: {h.author}</p><p className="drawer-timeline-author-role">Gestor</p></div>
          <div className="drawer-timeline-avatar-placeholder"><UserCircle size={20} /></div>
          <div className={`drawer-timeline-chevron ${isOpen ? 'rotated' : ''}`}><ChevronRight size={18} /></div>
        </div>
      </button>
      <div className={`drawer-timeline-content-wrapper ${isOpen ? 'expanded' : ''}`}><div className="drawer-timeline-content"><p>{h.note}</p></div></div>
    </div>
  </div>
);

const CaseManagementModal = ({ report, currentUser, onClose, onRefresh }) => {
  const [form, setForm] = useState({ note: '', status: report.status || 'Abierto', action: report.accion || 'Compromiso autocuidado', system: report.sistema_afectado || 'No Aplica', duration: report.temporalidad || 'No Aplica' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(report.history.length > 0 ? { [report.history[0].id]: true } : {});

  const updateForm = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const toggleHistory = (id) => setHistoryOpen(p => ({ ...p, [id]: !p[id] }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.note.trim()) return;
    setIsSubmitting(true);
    try {
      const segRes = await fetch(`${STRAPI_BASE_URL}/sst-seguimientos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: { id_admin: String(currentUser.document), descripcion: form.note, sst_reporte: report.strapiId } }) });
      if (!segRes.ok) throw new Error('Error guardando seguimiento');
      const newSegId = (await segRes.json()).data.id;

      const repRes = await fetch(`${STRAPI_BASE_URL}/sst-reportes/${report.strapiId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: { estado: form.status, accion: form.action, sistema_afectado: form.system, temporalidad: form.duration, sst_seguimientos: [...report.history.map(h => h.id), newSegId] } }) });
      if (!repRes.ok) throw new Error('Error actualizando estado');
      onRefresh(); onClose();
    } catch (err) { alert("Error: " + err.message); } finally { setIsSubmitting(false); }
  };

  const details = report.employeeDetails || {};
  const bmi = calculateBMI(details.peso_kg, details.talla_m);

  const ACCIONES = ['Compromiso autocuidado', 'Reincoporacion laboral', 'Acta de seguimiento', 'Autorización de lonchera', 'Cierre de reincorporación', 'Otra'];
  const SISTEMAS = ['No Aplica', 'Genitourinario', 'Dermatológico', 'Cardiovascular', 'Gastrointestinal', 'Respiratorio', 'Inmunologico', 'Alimenticio', 'Neurologico', 'Neoplasias'];
  const TEMPORALIDADES = ['No Aplica', '1 mes', '3 meses'];
  const ESTADOS = ['Abierto', 'En Seguimiento', 'Cerrado', 'Retirado'];
  const TimelineItem = ({ h, isNewest, isOpen, toggleOpen }) => (
  <div className="drawer-timeline-item">
    <div className={`drawer-timeline-dot ${isNewest ? 'newest' : ''}`}></div>
    <div className={`drawer-timeline-card ${isOpen ? 'open' : ''}`}>
      <button type="button" onClick={() => toggleOpen(h.id)} className="drawer-timeline-header-btn">
        <div className="drawer-timeline-info">
          <div className="drawer-timeline-meta">
            <span className="drawer-timeline-date">{h.date}</span>
            {isNewest && <span className="drawer-timeline-badge-new">Último</span>}
          </div>
          <h4 className="drawer-timeline-title">Gestión SST</h4>
        </div>
        <div className="drawer-timeline-author-sec">
          <div className="drawer-timeline-author-info">
            <p className="drawer-timeline-author-name">{h.authorName || `SST: ${h.author}`}</p>
            <p className="drawer-timeline-author-role">Gestor</p>
          </div>
          {h.authorFoto ? (
            <img src={h.authorFoto} alt="SST" className="drawer-avatar" style={{width: 35, height: 35}} />
          ) : (
            <div className="drawer-timeline-avatar-placeholder"><UserCircle size={20} /></div>
          )}
          <div className={`drawer-timeline-chevron ${isOpen ? 'rotated' : ''}`}><ChevronRight size={18} /></div>
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

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-panel" onClick={e => e.stopPropagation()}>
        <div className="drawer-left">
          <div className="drawer-left-header">
            <span className="drawer-id-badge">
              {report.id}
            </span>
          </div>
          <div className="drawer-section">
            <div className="drawer-timeline">
              <h3 className="drawer-section-title">Historial de Seguimiento</h3>

              {/* 1. Item Fijo de Apertura del Caso (Datos del Líder) */}
              <div className="drawer-timeline-item">
                <div className="drawer-timeline-dot"></div>
                <div className="drawer-timeline-card open">
                  <div className="drawer-timeline-header-btn">
                    <div className="drawer-timeline-info">
                      <div className="drawer-timeline-meta">
                        <span className="drawer-timeline-date">{report.date}</span>
                        <span className="drawer-timeline-badge-new">Apertura</span>
                      </div>
                      <h4 className="drawer-timeline-title">Reporte Inicial</h4>
                    </div>
                    <div className="drawer-timeline-author-sec">
                      <div className="drawer-timeline-author-info">
                        <p className="drawer-timeline-author-name">Líder ID: {report.leaderDocument}</p>
                      </div>
                    </div>
                  </div>
                  <div className="drawer-timeline-content-wrapper expanded">
                    <div className="drawer-timeline-content">
                      <p><strong>Descripción del reporte:</strong> {report.descripcion || 'Sin descripción inicial'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Seguimientos SST */}
              {report.history.map((h, index) => (
                <TimelineItem 
                  key={h.id} 
                  h={h} 
                  isNewest={index === 0} 
                  isOpen={historyOpen[h.id]} 
                  toggleOpen={toggleHistory} 
                />
              ))}
            </div>

            

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
                <div>
                  <span>{details.cargo}</span>
                  <span>{details.area_nombre}</span>
                  <span>{details.departamento}</span>
                  <span>{details.direction}</span>

                  <span>{details.Celular}</span>
                  <span>{details.correo}</span>

                  <span>{details.birthday}</span>
                  <span>{details.genero || "GENERO"}</span>
                </div>
                <div className="drawer-profile-info">
                  <h3 className="drawer-profile-name">{report.employeeName}</h3>
                  <p className="drawer-profile-role">Género: {report.employeeDetails?.genero || 'No especificado'}</p>
                  <p className="drawer-profile-role">Estado actual del reporte: <strong>{report.estado}</strong></p>
                </div>
              </div>
            </div>
            <div className="drawer-biometrics">
              <div className="drawer-bio-box"><span className="drawer-bio-label">Peso</span><strong className="drawer-bio-val">{details.peso_kg || '--'} <small>kg</small></strong></div>
              <div className="drawer-bio-box"><span className="drawer-bio-label">Talla</span><strong className="drawer-bio-val">{details.talla_m || '--'} <small>m</small></strong></div>
              <div className={`drawer-bio-box bmi-box ${bmi.cssClass}`}><span className="drawer-bio-label">IMC</span><strong className="drawer-bio-val">{bmi.value}</strong><div className="drawer-bmi-indicator"></div></div>
            </div>
            <div className="drawer-context-card">
              <div className="drawer-context-row">
                <span className="drawer-context-label">Categoría: {report.type}</span>
                <span className="drawer-context-label">Entidad: {report.entityCharge} - {report.entityName}</span>
                <span className="drawer-context-label">Estado Actual</span><StatusBadge status={report.status} />
                <span className="drawer-context-label">Descripción Original</span><p>{report.description}</p>
              </div>
              <div className="drawer-context-desc"></div>
              {report.fileAttachment && report.fileAttachment.url && (
                <div className="attachment-section" style={{ marginTop: '15px' }}>
                  <a 
                    href={`${STRAPI_BASE_URL.replace('/api', '')}${report.fileAttachment.url}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="btn btn-outline"
                  >
                    <FileText size={16} /> Ver Archivo Adjunto
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="drawer-right">
          <div className="drawer-body">
            <div className="drawer-content-max">
              <div className="drawer-timeline-container">
                {report.history.map((h, index) => <TimelineItem key={h.id} h={h} isNewest={index === 0} isOpen={!!historyOpen[h.id]} toggleOpen={toggleHistory} />)}
                {report.history.length === 0 && <div className="drawer-timeline-item"><div className="drawer-timeline-dot"></div><div className="drawer-timeline-card empty"><p>Aún no hay gestiones registradas para este caso.</p></div></div>}
                <div className="drawer-timeline-item">
                  <div className="drawer-timeline-dot initial"></div>
                  <div className="drawer-timeline-card">
                    <div className="drawer-timeline-header-btn" style={{cursor: 'default', backgroundColor: '#fff'}}>
                      <div className="drawer-timeline-info">
                        <div className="drawer-timeline-meta">
                          <span className="drawer-timeline-date">{report.date}</span>
                          </div>
                            <h4 className="drawer-timeline-title">Apertura de Caso</h4>
                            <p className="drawer-sub-title"><Clock size={14}/> Reportado el {report.date} por ID: {report.leaderDocument}</p>
                          </div>
                      <div className="drawer-timeline-author-sec"><div className="drawer-timeline-author-info"><p className="drawer-timeline-author-name">ID: {report.leaderDocument}</p><p className="drawer-timeline-author-role">Líder</p></div></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="drawer-footer">
            <div className="drawer-content-max">
              <form onSubmit={handleSubmit} className="drawer-form">
                <div className="drawer-form-grid">
                  <div className="form-group-compact"><label>Acción</label><select value={form.action} onChange={e => updateForm('action', e.target.value)}>{ACCIONES.map(a => <option key={a} value={a}>{a}</option>)}</select></div>
                  <div className="form-group-compact"><label>Sistema</label><select value={form.system} onChange={e => updateForm('system', e.target.value)}>{SISTEMAS.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                  <div className="form-group-compact"><label>Temporalidad</label><select value={form.duration} onChange={e => updateForm('duration', e.target.value)}>{TEMPORALIDADES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                  <div className="form-group-compact"><label>Estado</label><select value={form.status} onChange={e => updateForm('status', e.target.value)}>{ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}</select></div>
                </div>
                <div className="drawer-form-action-row">
                  <div className="drawer-form-textarea"><label>Detalles del seguimiento</label><textarea required rows="2" placeholder="Escribe aquí los detalles de la gestión..." value={form.note} onChange={e => updateForm('note', e.target.value)}></textarea></div>
                  <button type="submit" disabled={isSubmitting} className="drawer-submit-btn"><span>{isSubmitting ? 'Guardando...' : 'Guardar'}</span></button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function SSTView({ currentUser, allBukUsers, onLogout }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${STRAPI_BASE_URL}/sst-reportes?populate=sst_seguimientos,archivo_pdf&sort=createdAt:desc`);
      const { data } = await res.json();
      if (data) setReports(mapStrapiToReports(data, allBukUsers));
    } catch (err) { alert("Error cargando servidor."); } finally { setLoading(false); }
  };

  useEffect(() => { fetchReports(); }, []);

  const handleOpenCase = async (report) => {
    const copy = { ...report };
    if (!copy.employeeDetails?.Celular || copy.employeeDetails.Celular === 'N/R') {
      const buk = await obtenerEmpleadoBuk(copy.employeeId);
      if (buk) copy.employeeDetails = { ...copy.employeeDetails, ...buk, documento: copy.employeeId };
    }
    setSelectedReport(copy);
  };

  const filtered = reports.filter(t => [t.type, t.id, t.employeeName].some(v => v?.toLowerCase().includes(search.toLowerCase())));
  const stats = { total: reports.length, open: reports.filter(t => t.status === 'Abierto').length, inProgress: reports.filter(t => t.status === 'En Seguimiento').length, closed: reports.filter(t => t.status === 'Cerrado').length };

  return (
    <div className="app-layout">
      <main className="main-content">
        <div className="content-area">
          <div className="view-container">
            <div className="view-header">
              <div className="topbar-actions">
                <div className="user-header">
                  <div className="user-info">
                    {currentUser.foto ? <img src={currentUser.foto} alt="Perfil" className="user-avatar" /> : <div className="user-avatar-fallback"><User size={14} /></div>}
                    <h2>¡Hola, {currentUser.name}!</h2>
                  </div>
                  <div className="user-actions">
                    <button onClick={fetchReports} disabled={loading} className="btn btn-primary"><RefreshCw size={16} /><span>Actualizar</span></button>
                    <button onClick={onLogout} className="btn btn-secondary"><LogOut size={18} /><span>Salir</span></button>
                  </div>
                </div>
              </div>
            </div>

            <DashboardStats stats={stats} />

            <div className="card table-card">
              <div className="table-toolbar">
                <div className="search-wrapper"><Search className="search-icon" size={20} /><input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="form-control" /></div>
              </div>

              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr><th>ID</th><th>Fecha</th><th>Cédula</th><th>Colaborador</th><th>Tipo</th><th>Detalle</th><th>Estado</th><th>Acción</th></tr>
                  </thead>
                  <tbody>
                    {filtered.map(t => (
                      <tr key={t.id}>
                        <td><p className="table-bold-text">{t.id}</p></td>
                        <td><p className="table-bold-text">{t.date}</p></td>
                        <td><p className="table-bold-text">{t.employeeId}</p></td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {t.employeeDetails?.foto ? (
                              <img 
                                src={t.employeeDetails.foto} 
                                alt={t.employeeName} 
                                style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} 
                              />
                            ) : (
                              <UserCircle size={32} color="#94a3b8" />
                            )}
                            <span className="table-bold-text">{t.employeeName}</span>
                          </div>
                        </td>
                        <td><p className="table-bold-text">{t.type}</p></td>
                        <td><p className="table-text-truncate">{t.description}</p></td>
                        <td><StatusBadge status={t.status} /></td>
                        <td><button onClick={() => handleOpenCase(t)} className="btn btn-outline-primary btn-sm">Gestionar <ChevronRight size={16} /></button></td>
                      </tr>
                    ))}
                    {!filtered.length && !loading && <tr><td colSpan="8" className="table-empty-state">No hay casos registrados.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        {selectedReport && <CaseManagementModal report={selectedReport} currentUser={currentUser} onClose={() => setSelectedReport(null)} onRefresh={fetchReports} />}
      </main>
    </div>
  );
}
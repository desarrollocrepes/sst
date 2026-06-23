import React, { useState, useEffect, useMemo } from 'react';
import { 
  Ticket, Search, User, CheckCircle2, Clock, AlertCircle, 
  ShieldAlert, LogOut, FileText, Briefcase, MapPin, Phone, 
  Mail, RefreshCw, ChevronRight, UserCircle, Hash 
} from 'lucide-react';
import { STRAPI_BASE_URL, mapStrapiToReports, obtenerEmpleadoBuk, calculateBMI, StatusBadge } from '../utils/helpers';
import './SSTView.css';

// 1. EXTRAER CONSTANTES GLOBALES
// Al sacarlas del componente, evitamos que se recreen en cada renderizado de React.
const ACCIONES = ['Compromiso autocuidado', 'Reincoporacion laboral', 'Acta de seguimiento', 'Autorización de lonchera', 'Cierre de reincorporación', 'Otra'];
const SISTEMAS = ['No Aplica', 'Genitourinario', 'Dermatológico', 'Cardiovascular', 'Gastrointestinal', 'Respiratorio', 'Inmunologico', 'Alimenticio', 'Neurologico', 'Neoplasias'];
const TEMPORALIDADES = ['No Aplica', '1 mes', '3 meses'];
const ESTADOS = ['Pendiente', 'Abierto', 'Cerrado'];

// 2. COMPONENTES DE PRESENTACIÓN PURA
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
          <div className="drawer-timeline-meta"><span className="drawer-timeline-date">{h.date}</span></div>
        </div>
        <div className="drawer-timeline-author-sec">
          <div className="drawer-timeline-author-info">
            <p className="drawer-timeline-author-name">{h.authorName || (h.author ? `SST: ${h.author}` : 'SST desconocido')}</p>
          </div>
          {h.authorFoto ? (
            <img src={h.authorFoto} alt="SST" className="drawer-timeline-author-img" />
          ) : (
            <div className="drawer-timeline-avatar-placeholder"><UserCircle size={20} /></div>
          )}
          <div className={`drawer-timeline-chevron ${isOpen ? 'rotated' : ''}`}><ChevronRight size={18} /></div>
        </div>
      </button>
      <div className={`drawer-timeline-content-wrapper ${isOpen ? 'expanded' : ''}`}>
        <div className="drawer-timeline-content">
          <p className="drawer-timeline-note">{h.note}</p>
          <div className="drawer-timeline-metrics-grid">
            <div className="drawer-timeline-metric-card">
              <span className="drawer-timeline-metric-label">Acción</span>
              <span className="drawer-timeline-metric-value">{h.accion}</span>
            </div>
            <div className="drawer-timeline-metric-card">
              <span className="drawer-timeline-metric-label">Sistema</span>
              <span className="drawer-timeline-metric-value">{h.sistema}</span>
            </div>
            <div className="drawer-timeline-metric-card">
              <span className="drawer-timeline-metric-label">Temporalidad</span>
              <span className="drawer-timeline-metric-value">{h.temporalidad}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const CaseManagementModal = ({ report, currentUser, onClose, onRefresh }) => {
  const [form, setForm] = useState({ 
    note: '', 
    status: report.status || 'Pendiente', 
    action: report.accion || 'Compromiso autocuidado', 
    system: report.sistema_afectado || 'No Aplica', 
    duration: report.temporalidad || 'No Aplica' 
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(report.history.length > 0 ? { [report.history[0].id]: true } : {});

  const updateForm = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const toggleHistory = (id) => setHistoryOpen(p => ({ ...p, [id]: !p[id] }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.note.trim()) return;
    setIsSubmitting(true);
    
    // Simplificamos la lógica del booleano
    const estadoBool = form.status === 'Abierto' ? true : (form.status === 'Cerrado' ? false : null);

    try {
      const segRes = await fetch(`${STRAPI_BASE_URL}/sst-seguimientos`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          data: { 
            id_sst: String(currentUser.document), 
            descripcion: form.note, 
            sst_reporte: report.strapiId,
            accion: form.action,           
            sistema: form.system,          
            temporalidad: form.duration    
          } 
        }) 
      });
      
      if (!segRes.ok) throw new Error('Error guardando seguimiento');
      const { data: { id: newSegId } } = await segRes.json();

      const repRes = await fetch(`${STRAPI_BASE_URL}/sst-reportes/${report.strapiId}`, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          data: { 
            estado: estadoBool, 
            accion: form.action, 
            sistema_afectado: form.system, 
            temporalidad: form.duration, 
            id_lider: report.leaderDocument,
            sst_seguimientos: [...report.history.map(h => h.id), newSegId] 
          } 
        }) 
      });
      
      if (!repRes.ok) throw new Error('Error actualizando estado del reporte padre');
      
      onRefresh(); 
      onClose();
    } catch (err) { 
      alert(`Error: ${err.message}`); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const details = report.employeeDetails || {};
  const bmi = calculateBMI(details.peso_kg, details.talla_m);

  const attachmentUrl = report.fileAttachment?.url?.startsWith('http') 
    ? report.fileAttachment.url 
    : report.fileAttachment?.url ? `${STRAPI_BASE_URL.replace('/api', '')}${report.fileAttachment.url}` : null;

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-panel" onClick={e => e.stopPropagation()}>
        <div className="drawer-left">
          {/* ... Mismo código de UI ... */}
        </div>
        <div className="drawer-right">
          <div className="drawer-body">
            <div className="drawer-content-max">
              <div className="drawer-timeline-container">
                {report.history.map((h, index) => (
                  <TimelineItem key={h.id} h={h} isNewest={index === 0} isOpen={!!historyOpen[h.id]} toggleOpen={toggleHistory} />
                ))}
                {report.history.length === 0 && (
                  <div className="drawer-timeline-item">
                    <div className="drawer-timeline-dot"></div>
                    <div className="drawer-timeline-card empty"><p>Aún no hay gestiones registradas para este caso.</p></div>
                  </div>
                )}
                {/* ... Mismo código de UI de Reporte Inicial ... */}
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
      const res = await fetch(`${STRAPI_BASE_URL}/sst-reportes?populate=sst_seguimientos,archivo&sort=createdAt:desc`);
      const { data } = await res.json();
      
      if (data) {
        let mapped = mapStrapiToReports(data, allBukUsers || []);
        
        // 3. OPTIMIZACIÓN EN LA RECUPERACIÓN INTELIGENTE (Uso de Set para evitar repeticiones)
        const missingUsersSet = new Set();
        
        mapped.forEach(r => {
          if (r.employeeName.startsWith('Empleado')) missingUsersSet.add(r.employeeId);
          if (r.leaderName.startsWith('Líder ID:')) missingUsersSet.add(r.leaderDocument);
          
          r.history.forEach(h => {
            if (h.author && !(allBukUsers || []).some(u => String(u.document_number) === String(h.author))) {
              missingUsersSet.add(h.author);
            }
          });
        });

        const missingUsers = Array.from(missingUsersSet);
        if (missingUsers.length > 0) {
          const fetchedUsers = await Promise.all(missingUsers.map(doc => obtenerEmpleadoBuk(doc)));
          const validUsers = fetchedUsers.filter(Boolean);
          if (validUsers.length > 0) {
            mapped = mapStrapiToReports(data, [...(allBukUsers || []), ...validUsers]);
          }
        }
        setReports(mapped);
      }
    } catch (err) { 
      alert("Error cargando servidor."); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { fetchReports(); }, []);

  const handleOpenCase = async (report) => {
    const copy = { ...report };
    if (!copy.employeeDetails?.Celular || copy.employeeDetails.Celular === 'N/R') {
      const buk = await obtenerEmpleadoBuk(copy.employeeId);
      if (buk) {
        copy.employeeDetails = {
          ...copy.employeeDetails,
          ...buk,
          genero: copy.employeeDetails?.genero || buk.genero || 'No especificado',
          documento: copy.employeeId
        };
      }
    }
    setSelectedReport(copy);
  };

  // 4. RENDIMIENTO: USAR useMemo PARA CÁLCULOS DERIVADOS
  const filtered = useMemo(() => {
    if (!search) return reports;
    const lowerSearch = search.toLowerCase();
    return reports.filter(t => 
      [t.type, t.id, t.employeeName].some(v => v?.toLowerCase().includes(lowerSearch))
    );
  }, [reports, search]);

  const stats = useMemo(() => ({ 
    total: reports.length, 
    open: reports.filter(t => t.statusBoolean === true).length, 
    inProgress: reports.filter(t => t.statusBoolean === null).length, 
    closed: reports.filter(t => t.statusBoolean === false).length 
  }), [reports]);

  return (
    <div className="app-layout">
      {/* ... Mismo código de UI base del Dashboard ... */}
      <main className="main-content">
        <div className="content-area">
          <div className="view-container">
            {/* Header */}
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
                <div className="search-wrapper">
                  <Search className="search-icon" size={20} />
                  <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="form-control" />
                </div>
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
                          <div className="table-employee-cell">
                            {t.employeeDetails?.foto ? (
                              <img src={t.employeeDetails.foto} alt={t.employeeName} className="table-employee-avatar" />
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
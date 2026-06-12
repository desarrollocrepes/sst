import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, Ticket, AlertTriangle, Search, Plus, 
  User, CheckCircle2, Clock, AlertCircle, ShieldAlert,
  LogOut, Users, FileText, Briefcase, MapPin, Phone, Mail,
  RefreshCw, ChevronRight, Activity, UserCircle
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

const STRAPI_BASE_URL = 'https://macfer.crepesywaffles.com/api';

// --- HELPER COMPONENTS ---
const StatusBadge = ({ status }) => {
  const normalizedStatus = status?.toLowerCase() || '';
  let badgeClass = 'badge-default';
  
  if (normalizedStatus.includes('abierto')) badgeClass = 'badge-danger';
  if (normalizedStatus.includes('seguimiento')) badgeClass = 'badge-warning';
  if (normalizedStatus.includes('cerrado')) badgeClass = 'badge-success';
  
  return (
    <span className={`badge ${badgeClass}`}>
      {status}
    </span>
  );
};

const calculateBMI = (peso, talla) => {
  if (!peso || !talla) return { value: '-', label: 'N/A', cssClass: 'bmi-default' };
  const imc = (peso / (talla * talla)).toFixed(1);
  let label = '';
  let cssClass = '';
  
  if (imc < 18.5) { label = 'Bajo peso'; cssClass = 'bmi-low'; }
  else if (imc >= 18.5 && imc < 25) { label = 'Peso normal'; cssClass = 'bmi-normal'; }
  else if (imc >= 25 && imc < 30) { label = 'Sobrepeso'; cssClass = 'bmi-warning'; }
  else { label = 'Obesidad'; cssClass = 'bmi-danger'; }
  
  return { value: imc, label, cssClass };
};

// --- MAIN APP COMPONENT ---
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [allBukUsers, setAllBukUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [reportType, setReportType] = useState('Incidente');
  const [peso, setPeso] = useState('');
  const [talla, setTalla] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const [selectedReport, setSelectedReport] = useState(null);
  const [newNote, setNewNote] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // Reiniciar página al buscar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // --- LOGIC ---
  const mapStrapiToApp = (strapiData, bukUsers) => {
    return strapiData.map(item => {
      const att = item.attributes;
      const bukUser = bukUsers.find(u => String(u.document_number) === String(att.empleado_documento)) || {};

      return {
        id: `CASO-${item.id}`,
        strapiId: item.id,
        employeeId: att.empleado_documento,
        employeeName: att.empleado_nombre,
        employeeDetails: {
          foto: bukUser.foto || null,
          documento: att.empleado_documento,
          celular: bukUser.Celular || 'No registrado',
          correo: bukUser.correo || 'No registrado',
          cargo: bukUser.cargo || 'No registrado',
          area: bukUser.area_nombre || att.pdv,
          peso: att.peso,
          talla: att.talla
        },
        leaderDocument: att.lider_documento,
        pdv: att.pdv,
        date: new Date(att.createdAt).toLocaleDateString(),
        type: att.tipo_caso,
        description: att.descripcion,
        status: att.estado,
        history: att.sst_seguimientos?.data?.map(seg => ({
          id: seg.id,
          date: new Date(seg.attributes.createdAt).toLocaleDateString(),
          note: seg.attributes.nota,
          author: seg.attributes.autor
        })) || []
      };
    });
  };

    // Datos para Recharts
  const pieData = useMemo(() => {
    const counts = reports.reduce((acc, curr) => {
      acc[curr.type] = (acc[curr.type] || 0) + 1;
      return acc;
    }, {});
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
  }, [reports]);
  
  const fetchReports = async () => {
    if (!currentUser) return;
    setLoadingData(true);
    try {
      const url = `${STRAPI_BASE_URL}/sst-reportes?populate=sst_seguimientos&sort=createdAt:desc${
        currentUser.role === 'LIDER' ? `&filters[lider_documento][$eq]=${currentUser.document}` : ''
      }`;
      const response = await fetch(url);
      const json = await response.json();
      
      if (json.data) {
        setReports(mapStrapiToApp(json.data, allBukUsers));
      }
    } catch (error) {
      console.error("Error cargando reportes:", error);
      alert("Hubo un error cargando los datos del servidor.");
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (currentUser) fetchReports();
  }, [currentUser]);

  const handleLogout = () => {
    setCurrentUser(null);
    setReports([]);
    setAllBukUsers([]);
    setActiveTab('dashboard');
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    const selectedEmployee = currentUser.equipo.find(e => String(e.document_number) === String(selectedEmpId));
    if (!selectedEmployee || !description.trim()) return;

    setIsSubmittingReport(true);
    try {
      const payload = {
        data: {
          empleado_documento: String(selectedEmployee.document_number),
          empleado_nombre: selectedEmployee.nombre,
          lider_documento: currentUser.document,
          pdv: currentUser.pdv,
          tipo_caso: reportType,
          descripcion: description,
          peso: peso ? parseFloat(peso) : null,
          talla: talla ? parseFloat(talla) : null,
          estado: 'Abierto'
        }
      };

      const response = await fetch(`${STRAPI_BASE_URL}/sst-reportes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error("Error en el servidor al guardar.");

      setDescription('');
      setPeso('');
      setTalla('');
      setSelectedEmpId('');
      setActiveTab('dashboard');
      await fetchReports();
      
    } catch (error) {
      alert("Error enviando el reporte: " + error.message);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleOpenCase = (report) => {
    setSelectedReport(report);
    setNewStatus(report.status || 'Abierto');
    setNewNote('');
  };

  const handleSaveFollowUp = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setIsSubmittingNote(true);
    try {
      const segRes = await fetch(`${STRAPI_BASE_URL}/sst-seguimientos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { nota: newNote, autor: currentUser.name } })
      });
      if (!segRes.ok) throw new Error('Error al guardar el seguimiento');
      const segData = await segRes.json();
      const newSegId = segData.data.id;

      const existingSegIds = selectedReport.history.map(h => h.id);

      const repRes = await fetch(`${STRAPI_BASE_URL}/sst-reportes/${selectedReport.strapiId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: { estado: newStatus, sst_seguimientos: [...existingSegIds, newSegId] }
        })
      });
      if (!repRes.ok) throw new Error('Error al actualizar el estado del caso');

      await fetchReports();
      setSelectedReport(null);
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setIsSubmittingNote(false);
    }
  };

  if (!currentUser) {
    return <Login onLogin={(user, fullBuk) => { setAllBukUsers(fullBuk); setCurrentUser(user); }} />;
  }

  const filteredTickets = reports.filter(ticket => 
    ticket.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.employeeName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Lógica de Paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredTickets.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);

  const stats = {
    total: reports.length,
    open: reports.filter(t => t.status === 'Abierto').length,
    inProgress: reports.filter(t => t.status === 'En Seguimiento').length,
    closed: reports.filter(t => t.status === 'Cerrado').length
  };

  const barData = [
    { name: 'Abierto', casos: stats.open },
    { name: 'Seguimiento', casos: stats.inProgress },
    { name: 'Cerrado', casos: stats.closed }
  ];
  
  const CHART_COLORS = ['#6d4c41', '#8d6e63', '#bcaaa4', '#e7c6b5', '#a1887f'];

  const renderDashboard = () => (
    <div className="view-container">
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-info">
            <p className="stat-title">{currentUser.role === 'LIDER' ? 'Mis Reportes' : 'Total Casos'}</p>
            <p className="stat-value">{stats.total}</p>
          </div>
          <div className="stat-icon icon-coffee"><Ticket size={24} /></div>
        </div>
        <div className="stat-card">
          <div className="stat-info">
            <p className="stat-title">Sin Atender (Abiertos)</p>
            <p className="stat-value text-red">{stats.open}</p>
          </div>
          <div className="stat-icon icon-red"><AlertCircle size={24} /></div>
        </div>
        <div className="stat-card">
          <div className="stat-info">
            <p className="stat-title">En Seguimiento</p>
            <p className="stat-value text-amber">{stats.inProgress}</p>
          </div>
          <div className="stat-icon icon-amber"><Clock size={24} /></div>
        </div>
        <div className="stat-card">
          <div className="stat-info">
            <p className="stat-title">Casos Cerrados</p>
            <p className="stat-value text-emerald">{stats.closed}</p>
          </div>
          <div className="stat-icon icon-emerald"><CheckCircle2 size={24} /></div>
        </div>
      </div>

      {currentUser.role === 'SST' && reports.length > 0 && (
        <div className="charts-grid">
          <div className="chart-card">
            <h3 className="section-title">Distribución por Tipo de Caso</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name" label>
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="chart-card">
            <h3 className="section-title">Estado Actual de Casos</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={barData}>
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="casos" fill="#5d4037" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <div className="view-container">
        <div className="view-header mt-4">
          <h2>{currentUser.role === 'LIDER' ? 'Casos Reportados' : 'Bandeja de Casos SST'}</h2>
          {currentUser.role === 'LIDER' && (
            <button onClick={() => setActiveTab('new')} className="btn btn-primary">
              <Plus size={20} /> Nuevo Reporte
            </button>
          )}
        </div>

        <div className="card table-card">
          <div className="table-toolbar">
            <div className="search-wrapper">
              <Search className="search-icon" size={20} />
              <input 
                type="text" 
                placeholder="Buscar por colaborador, ID o detalle..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-control"
              />
            </div>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID / Fecha</th>
                  <th>Colaborador</th>
                  <th>Detalle / Tipo</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map(ticket => (
                  <tr key={ticket.id}>
                    <td>
                      <p className="font-bold">{ticket.id}</p>
                      <p className="text-small text-muted">{ticket.date}</p>
                    </td>
                    <td>
                      <div className="employee-table-info">
                        {ticket.employeeDetails?.foto ? (
                          <img src={ticket.employeeDetails.foto} alt="Foto" className="avatar-sm" />
                        ) : (
                          <div className="avatar-sm placeholder">{ticket.employeeName.charAt(0)}</div>
                        )}
                        <div>
                          <p className="font-bold">{ticket.employeeName}</p>
                          <p className="text-small text-muted">CC: {ticket.employeeId}</p>
                          {currentUser.role === 'SST' && (
                            <p className="text-small text-primary strong">Líder: {ticket.leaderDocument}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <p className="font-bold">{ticket.type}</p>
                      <p className="text-small text-muted truncate">{ticket.description}</p>
                    </td>
                    <td>
                      <StatusBadge status={ticket.status} />
                    </td>
                    <td>
                      <button onClick={() => handleOpenCase(ticket)} className="btn btn-outline-primary btn-sm">
                        {currentUser.role === 'SST' ? 'Gestionar' : 'Ver Detalles'} <ChevronRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {currentItems.length === 0 && !loadingData && (
                  <tr>
                    <td colSpan="5" className="text-center p-large text-muted py-4">
                      No hay casos registrados o que coincidan con la búsqueda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && (
            <div className="pagination-controls">
              <button 
                disabled={currentPage === 1} 
                onClick={() => setCurrentPage(p => p - 1)} 
                className="btn btn-secondary btn-sm"
              >
                Anterior
              </button>
              <span className="text-small font-bold text-muted">
                Página {currentPage} de {totalPages}
              </span>
              <button 
                disabled={currentPage === totalPages} 
                onClick={() => setCurrentPage(p => p + 1)} 
                className="btn btn-secondary btn-sm"
              >
                Siguiente
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );

  const renderNewTicket = () => {
    const selectedEmployee = currentUser.equipo?.find(e => String(e.document_number) === selectedEmpId);

    return (
      <div className="view-container form-container">
        <form onSubmit={handleSubmitReport} className="card form-card">
          <div className="form-section">
            <h3 className="section-title"><User size={18} /> Colaborador Afectado</h3>
            
            <div className="form-group">
              <label>Seleccionar miembro del equipo</label>
              <select className="form-control" value={selectedEmpId} onChange={(e) => setSelectedEmpId(e.target.value)} required>
                <option value="" disabled>-- Seleccione su colaborador --</option>
                {currentUser.equipo?.map(emp => (
                  <option key={emp.document_number} value={emp.document_number}>{emp.nombre}</option>
                ))}
              </select>
            </div>

            {selectedEmployee && (
              <div className="employee-preview">
                {selectedEmployee.foto ? (
                  <img src={selectedEmployee.foto} alt="Foto" className="avatar" />
                ) : (
                  <div className="avatar placeholder">{selectedEmployee.nombre.charAt(0)}</div>
                )}
                <div className="employee-info">
                  <p className="name">{selectedEmployee.nombre}</p>
                  <p className="details">C.C: {selectedEmployee.document_number} • {selectedEmployee.cargo}</p>
                </div>
              </div>
            )}
          </div>

          <div className="form-section">
            <h3 className="section-title"><FileText size={18} /> Detalles de la Novedad</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Categoría</label>
                <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="form-control">
                  <option value="Incidente">Incidente</option>
                  <option value="Accidente Leve">Accidente Leve</option>
                  <option value="Accidente Grave">Accidente Grave</option>
                  <option value="Condición Insegura">Condición Insegura</option>
                  <option value="Enfermedad Laboral">Enfermedad Laboral</option>
                </select>
              </div>
              <div className="form-group">
                <label>Peso (kg)</label>
                <input type="number" step="0.1" required placeholder="Ej: 70.5" className="form-control" value={peso} onChange={(e) => setPeso(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Talla (m)</label>
                <input type="number" step="0.01" required placeholder="Ej: 1.75" className="form-control" value={talla} onChange={(e) => setTalla(e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label>Descripción de lo sucedido</label>
              <textarea required rows="4" value={description} onChange={(e) => setDescription(e.target.value)} className="form-control" placeholder="Explique qué pasó, dónde, cómo y cuándo..."></textarea>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" onClick={() => setActiveTab('dashboard')} className="btn btn-secondary">Cancelar</button>
            <button disabled={isSubmittingReport || !selectedEmpId} type="submit" className="btn btn-primary">
              {isSubmittingReport ? 'Guardando...' : 'Enviar Reporte'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <>
      <div className="app-layout">
        <main className="main-content">
          <header className="topbar">
            <div className="mobile-logo">
               <ShieldAlert className="text-primary" size={24} /> SafeDesk
            </div>
            <div className="topbar-title">
              <nav className="sidebar-nav">
                <button onClick={() => setActiveTab('dashboard')} className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}>
                  <LayoutDashboard size={20} /> Dashboard
                </button>
                {currentUser.role === 'LIDER' && (
                  <button onClick={() => setActiveTab('new')} className={`nav-item ${activeTab === 'new' ? 'active' : ''}`}>
                    <AlertTriangle size={20} /> Reportar Novedad
                  </button>
                )}
              </nav>
            </div>
            
            <div className="topbar-actions">
              <button onClick={fetchReports} disabled={loadingData} className="btn-icon text-primary">
                 <RefreshCw size={16} />
                 <span>Actualizar</span>
              </button>
              <div className="divider"></div>
              <div className="user-profile">
                <div className="user-avatar">
                  {currentUser.foto ? (
                    <img src={currentUser.foto} alt="Perfil" className="avatar-xs" />
                  ) : (
                    <User size={16} />
                  )}
                </div>
                <span className="user-name">{currentUser.name}</span>
              </div>
              <button onClick={handleLogout} className="btn-icon text-danger" title="Cerrar Sesión">
                <LogOut size={18} />
              </button>
            </div>
          </header>

          <div className="content-area">
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'new' && renderNewTicket()}
          </div>

          {/* MODAL GESTIÓN DE CASO */}
          {selectedReport && (
            <div className="modal-overlay">
              <div className="modal-window">
                <div className="modal-header">
                  <div>
                     <h2>Gestión del Caso: {selectedReport.id}</h2>
                     <p>Reportado el {selectedReport.date}</p>
                  </div>
                  <button onClick={() => setSelectedReport(null)} className="btn btn-dark">
                    Cerrar Panel
                  </button>
                </div>
                
                <div className="modal-body">
                  <div className="modal-col profile-col">
                    <div className="card profile-card">
                      <div className="profile-header">
                        {selectedReport.employeeDetails?.foto ? (
                          <img src={selectedReport.employeeDetails.foto} alt="Perfil" className="profile-img" />
                        ) : (
                          <div className="profile-img placeholder">
                            {selectedReport.employeeName.charAt(0)}
                          </div>
                        )}
                        <h3>{selectedReport.employeeName}</h3>
                        <p>{selectedReport.employeeDetails?.documento}</p>
                      </div>
                      
                      <div className="profile-body">
                        <div className="contact-info">
                          <p><Briefcase size={16} /> {selectedReport.employeeDetails?.cargo}</p>
                          <p><MapPin size={16} /> {selectedReport.employeeDetails?.area}</p>
                          <p><Phone size={16} /> {selectedReport.employeeDetails?.celular}</p>
                          <p><Mail size={16} /> {selectedReport.employeeDetails?.correo}</p>
                        </div>

                        <div className="biometric-section">
                          <h4>Datos Biométricos</h4>
                          <div className="biometric-grid">
                            <div className="bio-card">
                              <span>Peso</span>
                              <strong>{selectedReport.employeeDetails?.peso || '--'} <small>kg</small></strong>
                            </div>
                            <div className="bio-card">
                              <span>Talla</span>
                              <strong>{selectedReport.employeeDetails?.talla || '--'} <small>m</small></strong>
                            </div>
                          </div>
                          
                          {(() => {
                            const bmi = calculateBMI(selectedReport.employeeDetails?.peso, selectedReport.employeeDetails?.talla);
                            return (
                              <div className={`bmi-card ${bmi.cssClass}`}>
                                <div>
                                  <span>IMC Calculado</span>
                                  <strong>{bmi.label}</strong>
                                </div>
                                <span className="bmi-value">{bmi.value}</span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="modal-col details-col">
                    <div className="detail-section">
                      <h3 className="section-title"><FileText size={16}/> Detalles del Evento</h3>
                      <div className="card p-4">
                        <div className="detail-row"><span>Categoría</span> <strong>{selectedReport.type}</strong></div>
                        <div className="detail-row align-center"><span>Estado Actual</span> <StatusBadge status={selectedReport.status} /></div>
                        
                        <div className="description-box">
                          <span>Descripción Reportada</span>
                          <p>"{selectedReport.description}"</p>
                        </div>
                      </div>
                    </div>

                    {currentUser.role === 'SST' && (
                      <div className="detail-section mt-4">
                        <h3 className="section-title"><Activity size={16}/> Añadir Gestión</h3>
                        <form onSubmit={handleSaveFollowUp} className="card p-4">
                          <div className="form-group">
                            <label>Actualizar Estado</label>
                            <select className="form-control" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                              <option value="Abierto">Abierto</option>
                              <option value="En Seguimiento">En Seguimiento</option>
                              <option value="Cerrado">Cerrado</option>
                            </select>
                          </div>
                          <div className="form-group">
                            <label>Observaciones SST</label>
                            <textarea rows="3" required className="form-control" placeholder="Acciones tomadas..." value={newNote} onChange={(e) => setNewNote(e.target.value)} />
                          </div>
                          <button type="submit" disabled={isSubmittingNote} className="btn btn-primary w-full">
                            {isSubmittingNote ? 'Guardando...' : 'Guardar Gestión'}
                          </button>
                        </form>
                      </div>
                    )}
                  </div>

                  <div className="modal-col timeline-col">
                    <h3 className="section-title"><Clock size={16}/> Línea de Tiempo</h3>
                    
                    <div className="timeline">
                      <div className="timeline-item">
                        <div className="timeline-dot dot-primary"></div>
                        <div className="timeline-content">
                          <div className="tl-header">
                            <strong>Apertura del Caso</strong>
                            <span className="tl-date">{selectedReport.date}</span>
                          </div>
                          <p className="tl-sub">Líder: <strong>{selectedReport.leaderDocument}</strong></p>
                        </div>
                      </div>

                      {selectedReport.history.map((h, i) => (
                        <div className="timeline-item" key={i}>
                          <div className="timeline-dot dot-secondary"></div>
                          <div className="timeline-content">
                            <div className="tl-header">
                              <strong>Gestión SST</strong>
                              <span className="tl-date">{h.date}</span>
                            </div>
                            <p className="tl-text">{h.note}</p>
                            <span className="tl-author">— {h.author}</span>
                          </div>
                        </div>
                      ))}
                      
                      {selectedReport.history.length === 0 && (
                        <div className="timeline-item">
                           <div className="timeline-dot dot-muted"></div>
                           <p className="tl-empty">Esperando gestión...</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}

// --- LOGIN COMPONENT ---
function Login({ onLogin }) {
  const [document, setDocument] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!document) return;
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`https://apialohav2.crepesywaffles.com/buk/empleados3?documento=${document}`);
      if (!response.ok) throw new Error('Documento no encontrado');
      
      const jsonResponse = await response.json();
      const usersData = jsonResponse.data || [];
      const user = usersData.find(u => String(u.document_number) === document);

      if (!user) throw new Error('Documento no encontrado.');
      if (user.status !== 'activo') throw new Error('El usuario se encuentra inactivo.');

      let role = '';
      let equipoActivo = [];

      if (user.departamento === 'Seguridad y Salud en el Trabajo' && user.direction === 'Dirección Desarrollo Humano') {
        role = 'SST';
      } else if (user.lider === 1) {
        role = 'LIDER';
        if (user.equipo && Array.isArray(user.equipo)) {
          equipoActivo = user.equipo.filter(emp => emp.status === 'activo');
        }
      } else {
        throw new Error('No tiene los permisos requeridos.');
      }

      const userData = {
        document: String(user.document_number),
        name: user.nombre,
        role: role,
        pdv: user.area_nombre !== 'No Aplica' ? user.area_nombre : user.departamento,
        area: user.area_nombre !== 'No Aplica' ? user.area_nombre : user.departamento,
        equipo: equipoActivo,
        cargo: user.cargo,
        foto: user.foto
      };

      onLogin(userData, usersData);
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-split-wrapper">
      <div className="login-left-panel">
        <h1 className="login-left-title">
          <ShieldAlert size={48} className="login-logo-icon" /> Portal SST
          
        </h1>
        <br></br>39541384 doc. LIDER
        <br></br>52917575 doc. SST
      </div>
      
      <div className="login-right-panel">
        <div className="login-form-container">
          <h2 className="login-right-title">Bienvenido</h2>
          <p className="login-right-subtitle">Usa tu número de documento para ingresar</p>
          
          <form onSubmit={handleSubmit} className="login-form-split">
            <div className="form-group-split">
              <input 
                type="tel" 
                value={document}
                onChange={(e) => setDocument(e.target.value.replace(/\D/g, ''))}
                disabled={loading}
                className="form-control-large"
                placeholder="Ej. 1020304050"
              />
            </div>
            
            {error && <p className="error-message-split">{error}</p>}
            
            <button disabled={loading || !document} type="submit" className="btn btn-primary btn-large w-full">
              {loading ? 'Verificando...' : (
                <>Continuar <ChevronRight size={20} /></>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
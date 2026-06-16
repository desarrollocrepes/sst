import React, { useState, useEffect, useMemo } from 'react';
import './app.css';
import { 
  LayoutDashboard, Ticket, AlertTriangle, Search, Plus, 
  User, CheckCircle2, Clock, AlertCircle, ShieldAlert,
  LogOut, FileText, Briefcase, MapPin, Phone, Mail,
  RefreshCw, ChevronRight, Activity, Calendar, Upload, AlertOctagon, HeartPulse, Shield, Lock
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

const STRAPI_BASE_URL = 'https://macfer.crepesywaffles.com/api';

// --- Reusable Components (Pure CSS) ---
const Button = ({ variant = 'default', size = 'default', className = '', children, ...props }) => {
  return (
    <button className={`btn btn-variant-${variant} btn-size-${size} ${className}`} {...props}>
      {children}
    </button>
  );
};

const Badge = ({ variant = 'default', className = '', children, ...props }) => {
  return (
    <div className={`badge badge-variant-${variant} ${className}`} {...props}>
      {children}
    </div>
  );
};

const Card = ({ className = '', children, ...props }) => (
  <div className={`card ${className}`} {...props}>{children}</div>
);
const CardHeader = ({ className = '', children, ...props }) => (
  <div className={`card-header ${className}`} {...props}>{children}</div>
);
const CardTitle = ({ className = '', children, ...props }) => (
  <h3 className={`card-title ${className}`} {...props}>{children}</h3>
);
const CardDescription = ({ className = '', children, ...props }) => (
  <p className={`card-description ${className}`} {...props}>{children}</p>
);
const CardContent = ({ className = '', children, ...props }) => (
  <div className={`card-content ${className}`} {...props}>{children}</div>
);
const CardFooter = ({ className = '', children, ...props }) => (
  <div className={`card-footer ${className}`} {...props}>{children}</div>
);

const Input = ({ className = '', ...props }) => (
  <input className={`input-base input ${className}`} {...props} />
);

const Label = ({ className = '', children, ...props }) => (
  <label className={`label ${className}`} {...props}>{children}</label>
);

const Textarea = ({ className = '', ...props }) => (
  <textarea className={`input-base textarea ${className}`} {...props} />
);

const Select = ({ className = '', children, ...props }) => (
  <select className={`input-base select ${className}`} {...props}>
    {children}
  </select>
);

// --- HELPER COMPONENTS & LOGIC ---
const REPORT_CATEGORIES = [
  "Incidente", "Accidente Leve", "Accidente Grave", "Condición Insegura", "Enfermedad Laboral",
  "Reincorporación post incapacidad", "Recomendaciones medicas", "Recomendaciones nutricionales", "Incapacidades recurrentes"
];

const ACTION_CATEGORIES = [
  "Compromiso autocuidado", "Reincoporacion laboral", "Acta de seguimiento", "Autorización de lonchera", "Cierre de reincorporación", "Otra"
];

const AFFECTED_SYSTEMS = [
  "No Aplica", "Genitourinario", "Dermatológico", "Cardiovascular", "Gastrointestinal",
  "Respiratorio", "Inmunologico", "Alimenticio", "Neurologico", "Neoplasias"
];

const STATUS_OPTIONS = ["Abierto", "Accion Realizada", "Retirado", "Cerrado"];

const StatusBadge = ({ status }) => {
  const normalizedStatus = status?.toLowerCase() || '';
  let variant = 'secondary';
  
  if (normalizedStatus.includes('abierto')) variant = 'destructive';
  if (normalizedStatus.includes('accion')) variant = 'warning';
  if (normalizedStatus.includes('retirado')) variant = 'secondary';
  if (normalizedStatus.includes('cerrado')) variant = 'success';
  
  return <Badge variant={variant}>{status}</Badge>;
};

const calculateBMI = (peso, talla) => {
  if (!peso || !talla) return { value: '-', label: 'N/A' };
  const imc = (peso / (talla * talla)).toFixed(1);
  return { value: imc, label: imc < 18.5 ? 'Bajo peso' : imc < 25 ? 'Normal' : imc < 30 ? 'Sobrepeso' : 'Obesidad' };
};

const calculateAge = (dobString) => {
  if (!dobString) return null;
  const age = new Date(Date.now() - new Date(dobString).getTime());
  return Math.abs(age.getUTCFullYear() - 1970);
};

const calculateSeniority = (fechaIngreso) => {
  if (!fechaIngreso) return 'Desconocida';
  const ageDt = new Date(Date.now() - new Date(fechaIngreso).getTime());
  const years = Math.abs(ageDt.getUTCFullYear() - 1970);
  const months = ageDt.getUTCMonth();
  return years === 0 ? `${months} meses` : `${years} años, ${months} meses`;
};











const Login = ({ onLogin }) => {
  const [document, setDocument] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!document) return;
    setLoading(true); setError('');

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
        if (user.equipo && Array.isArray(user.equipo)) equipoActivo = user.equipo.filter(emp => emp.status === 'activo');
      } else {
        throw new Error('No tiene los permisos requeridos.');
      }

      onLogin({
        document: String(user.document_number), name: user.nombre, role: role,
        pdv: user.area_nombre !== 'No Aplica' ? user.area_nombre : user.departamento,
        area: user.area_nombre !== 'No Aplica' ? user.area_nombre : user.departamento,
        equipo: equipoActivo, cargo: user.cargo, foto: user.foto,
        departamento: user.departamento, direction: user.direction
      }, usersData);
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
  <div className="login-page">
    <Card className="login-card">
      <CardHeader className="login-card-header">
        <div className="login-logo-container">
          <div className="login-logo">
            <Shield size={24} color="#fff" />
          </div>
        </div>

        <CardTitle className="login-title">
          CardTitle
        </CardTitle>

        <CardDescription className="login-description">
          CardDescription
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="login-card-content">
          <div className="form-group">
            <Label htmlFor="document">
              Número de documento
            </Label>

            <div className="input-wrapper">
              <Input
                id="document"
                type="tel"
                value={document}
                onChange={(e) =>
                  setDocument(e.target.value.replace(/\D/g, ''))
                }
                disabled={loading}
                placeholder="Ej. 1020304050"
                className="document-input"
              />
            </div>
          </div>
        </CardContent>

        <CardFooter className="login-card-footer">
          {error && (
            <p className="login-error">
              {error}
            </p>
          )}

          <Button
            disabled={loading || !document}
            type="submit"
            className="login-button"
          >
            {loading ? (
              'Verificando...'
            ) : (
              <span className="button-content">
                Continuar
                <ChevronRight
                  size={18}
                  style={{ marginLeft: '8px' }}
                />
              </span>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  </div>
);
};


// --- MAIN APP COMPONENT ---
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [allBukUsers, setAllBukUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [reportType, setReportType] = useState(REPORT_CATEGORIES[0]);
  const [peso, setPeso] = useState('');
  const [talla, setTalla] = useState('');
  const [description, setDescription] = useState('');
  const [pdfFile, setPdfFile] = useState(null);
  const [genero, setGenero] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [entidadCargo, setEntidadCargo] = useState('EPS');
  const [nombreEntidad, setNombreEntidad] = useState('');
  const [empData, setEmpData] = useState({ cargo: '', area_nombre: '', departamento: '', direction: '', celular: '', correo: '', fecha_ingreso: '' });
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const [selectedReport, setSelectedReport] = useState(null);
  const [newNote, setNewNote] = useState('');
  const [newStatus, setNewStatus] = useState('Abierto');
  const [accionCategory, setAccionCategory] = useState(ACTION_CATEGORIES[0]);
  const [sistemaAfectado, setSistemaAfectado] = useState(AFFECTED_SYSTEMS[0]);
  const [temporalidad, setTemporalidad] = useState('');
  const [asignadoA, setAsignadoA] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  const sstUsers = useMemo(() => {
    return allBukUsers.filter(u => u.departamento === 'Seguridad y Salud en el Trabajo' && u.direction === 'Dirección Desarrollo Humano');
  }, [allBukUsers]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  useEffect(() => {
    if (selectedEmpId && currentUser?.equipo) {
      const emp = currentUser.equipo.find(e => String(e.document_number) === String(selectedEmpId));
      if (emp) {
        setEmpData({
          cargo: emp.cargo || '', area_nombre: emp.area_nombre || '', departamento: emp.departamento || '',
          direction: emp.direction || '', celular: emp.Celular || '', correo: emp.correo || '', fecha_ingreso: emp.fecha_ingreso || ''
        });
      }
    }
  }, [selectedEmpId, currentUser]);

  const mapStrapiToApp = (strapiData, bukUsers) => {
    return strapiData.map(item => {
      const att = item.attributes;
      const bukUser = bukUsers.find(u => String(u.document_number) === String(att.empleado_documento)) || {};

      return {
        id: `CASO-${item.id}`, strapiId: item.id, employeeId: att.empleado_documento, employeeName: att.empleado_nombre,
        employeeDetails: {
          foto: bukUser.foto || null, documento: att.empleado_documento, celular: att.celular_editado || bukUser.Celular || 'No registrado',
          correo: att.correo_editado || bukUser.correo || 'No registrado', cargo: att.cargo_editado || bukUser.cargo || 'No registrado',
          area: att.area_editada || bukUser.area_nombre || att.pdv, departamento: att.departamento_editado || bukUser.departamento || '',
          direction: att.direccion_editada || bukUser.direction || '', peso: att.peso, talla: att.talla,
          genero: att.genero || 'No especificado', edad: att.edad || calculateAge(att.fecha_nacimiento) || 'N/A', antiguedad: calculateSeniority(bukUser.fecha_ingreso),
        },
        leaderDocument: att.lider_documento, pdv: att.pdv, date: new Date(att.createdAt).toLocaleDateString(),
        type: att.tipo_caso, description: att.descripcion, status: att.estado, entidadCargo: att.entidad_cargo || 'N/A',
        nombreEntidad: att.nombre_entidad || 'N/A', pdfUrl: att.pdf_url || null,
        vencimiento: att.fecha_vencimiento_accion ? new Date(att.fecha_vencimiento_accion) : null,
        asignadoA: att.asignado_a || null, gestor: att.gestor_cierre || null,
        history: att.sst_seguimientos?.data?.map(seg => ({
          id: seg.id, date: new Date(seg.attributes.createdAt).toLocaleDateString(), note: seg.attributes.nota,
          author: seg.attributes.autor, accion: seg.attributes.categoria_accion || 'General', sistema: seg.attributes.sistema_afectado || 'N/A'
        })) || []
      };
    });
  };

  const fetchReports = async () => {
    if (!currentUser) return;
    setLoadingData(true);
    try {
      const url = `${STRAPI_BASE_URL}/sst-reportes?populate=sst_seguimientos&sort=createdAt:desc${
        currentUser.role === 'LIDER' ? `&filters[lider_documento][$eq]=${currentUser.document}` : ''
      }`;
      const response = await fetch(url);
      const json = await response.json();
      if (json.data) setReports(mapStrapiToApp(json.data, allBukUsers));
    } catch (error) {
      console.error("Error cargando reportes:", error);
      alert("Hubo un error cargando los datos del servidor.");
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => { if (currentUser) fetchReports(); }, [currentUser]);

  const handleLogout = () => {
    setCurrentUser(null); setReports([]); setAllBukUsers([]); setActiveTab('dashboard');
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    const selectedEmployee = currentUser.equipo.find(e => String(e.document_number) === String(selectedEmpId));
    if (!selectedEmployee || !description.trim()) return;

    setIsSubmittingReport(true);
    try {
      let fakePdfUrl = null;
      if (pdfFile) fakePdfUrl = `https://mock.storage.com/pdf_${Date.now()}.pdf`;

      const payload = {
        data: {
          empleado_documento: String(selectedEmployee.document_number), empleado_nombre: selectedEmployee.nombre,
          lider_documento: currentUser.document, pdv: currentUser.pdv, tipo_caso: reportType,
          descripcion: description, peso: peso ? parseFloat(peso) : null, talla: talla ? parseFloat(talla) : null,
          estado: 'Abierto', genero: genero, fecha_nacimiento: fechaNacimiento, edad: calculateAge(fechaNacimiento),
          entidad_cargo: entidadCargo, nombre_entidad: nombreEntidad, pdf_url: fakePdfUrl,
          cargo_editado: empData.cargo, area_editada: empData.area_nombre, departamento_editado: empData.departamento,
          direccion_editada: empData.direction, celular_editado: empData.celular, correo_editado: empData.correo
        }
      };

      const response = await fetch(`${STRAPI_BASE_URL}/sst-reportes`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error("Error en el servidor al guardar.");

      setDescription(''); setPeso(''); setTalla(''); setSelectedEmpId('');
      setGenero(''); setFechaNacimiento(''); setNombreEntidad(''); setPdfFile(null);
      setActiveTab('dashboard');
      await fetchReports();
    } catch (error) {
      alert("Error enviando el reporte: " + error.message);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleOpenCase = (report) => {
    setSelectedReport(report); setNewStatus(report.status || 'Abierto'); setNewNote('');
    setAccionCategory(ACTION_CATEGORIES[0]); setSistemaAfectado(AFFECTED_SYSTEMS[0]);
    setTemporalidad(''); setAsignadoA(report.asignadoA || '');
  };

  const handleSaveFollowUp = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setIsSubmittingNote(true);
    try {
      const segRes = await fetch(`${STRAPI_BASE_URL}/sst-seguimientos`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { nota: newNote, autor: currentUser.name, categoria_accion: accionCategory, sistema_afectado: sistemaAfectado } })
      });
      if (!segRes.ok) throw new Error('Error al guardar el seguimiento');
      const segData = await segRes.json();
      
      let fechaVencimiento = selectedReport.vencimiento;
      if (temporalidad) {
        const d = new Date(); d.setMonth(d.getMonth() + parseInt(temporalidad, 10));
        fechaVencimiento = d.toISOString();
      }

      const repRes = await fetch(`${STRAPI_BASE_URL}/sst-reportes/${selectedReport.strapiId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: { estado: newStatus, sst_seguimientos: [...selectedReport.history.map(h => h.id), segData.data.id],
            fecha_vencimiento_accion: fechaVencimiento, asignado_a: asignadoA || null,
            gestor_cierre: newStatus === 'Cerrado' ? currentUser.name : selectedReport.gestor }
        })
      });
      if (!repRes.ok) throw new Error('Error al actualizar el estado');

      await fetchReports(); setSelectedReport(null);
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setIsSubmittingNote(false);
    }
  };

    const entityData = useMemo(() => {
    const counts = reports.reduce((acc, curr) => { acc[curr.entidadCargo || 'N/A'] = (acc[curr.entidadCargo || 'N/A'] || 0) + 1; return acc; }, {});
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
  }, [reports]);

  const pieData = useMemo(() => {
    const counts = reports.reduce((acc, curr) => { acc[curr.type] = (acc[curr.type] || 0) + 1; return acc; }, {});
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
  }, [reports]);

  if (!currentUser) {
    return <Login onLogin={(user, fullBuk) => { setAllBukUsers(fullBuk); setCurrentUser(user); }} />;
  }

  const filteredTickets = reports.filter(t => 
    t.type?.toLowerCase().includes(searchTerm.toLowerCase()) || t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) || t.employeeDetails?.documento?.includes(searchTerm)
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const currentItems = filteredTickets.slice(indexOfLastItem - itemsPerPage, indexOfLastItem);
  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);

  const stats = {
    total: reports.length, open: reports.filter(t => t.status === 'Abierto').length,
    inProgress: reports.filter(t => t.status === 'Accion Realizada').length,
    closed: reports.filter(t => t.status === 'Cerrado').length,
    myResolved: reports.filter(t => t.status === 'Cerrado' && t.gestor === currentUser.name).length
  };

  const expiredAlerts = reports.filter(t => t.status !== 'Cerrado' && t.vencimiento && new Date(t.vencimiento) < new Date());

  const barData = [
    { name: 'Abierto', casos: stats.open }, { name: 'Acc. Real.', casos: stats.inProgress }, { name: 'Cerrado', casos: stats.closed }
  ];
  const CHART_COLORS = ['#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#64748b', '#ec4899'];


  const renderDashboard = () => (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {currentUser.role === 'SST' && expiredAlerts.length > 0 && (
        <div className="alert-banner">
          <AlertOctagon className="text-red-600" size={24} style={{ flexShrink: 0 }} />
          <div>
            <h3 className="font-semibold text-red-800">Alertas de Vencimiento ({expiredAlerts.length})</h3>
            <p className="text-sm text-red-700" style={{ marginTop: '0.25rem' }}>Existen casos cuyas acciones o recomendaciones médicas han vencido.</p>
            <div className="alert-tags">
              {expiredAlerts.slice(0, 5).map(a => (
                <Badge key={a.id} variant="destructive" onClick={() => handleOpenCase(a)} style={{ cursor: 'pointer' }}>
                  {a.id} - {a.employeeName}
                </Badge>
              ))}
              {expiredAlerts.length > 5 && <Badge variant="outline">+{expiredAlerts.length - 5} más</Badge>}
            </div>
          </div>
        </div>
      )}

      <div className="dashboard-grid">
        <Card>
          <CardHeader>
            <div className="stats-header">
              <CardTitle className="text-sm font-medium">{currentUser.role === 'LIDER' ? 'Mis Reportes' : 'Total Casos'}</CardTitle>
              <Ticket size={16} className="text-zinc-500" />
            </div>
          </CardHeader>
          <CardContent><div className="stats-value">{stats.total}</div></CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="stats-header">
              <CardTitle className="text-sm font-medium">Abiertos</CardTitle>
              <AlertCircle size={16} className="text-red-500" />
            </div>
          </CardHeader>
          <CardContent><div className="stats-value text-red-500">{stats.open}</div></CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="stats-header">
              <CardTitle className="text-sm font-medium">Acción Realizada</CardTitle>
              <Clock size={16} className="text-amber-500" />
            </div>
          </CardHeader>
          <CardContent><div className="stats-value text-amber-500">{stats.inProgress}</div></CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="stats-header">
              <CardTitle className="text-sm font-medium">Casos Cerrados</CardTitle>
              <CheckCircle2 size={16} className="text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="stats-value text-emerald-500">{stats.closed}</div>
            {currentUser.role === 'SST' && <p className="text-xs text-zinc-500" style={{ marginTop: '0.25rem' }}>Resueltos por ti: <span className="font-medium text-zinc-900">{stats.myResolved}</span></p>}
          </CardContent>
        </Card>
      </div>

      {currentUser.role === 'SST' && reports.length > 0 && (
        <div className="charts-grid">
          <Card>
            <CardHeader><CardTitle className="text-sm">Por Entidad a Cargo</CardTitle></CardHeader>
            <CardContent>
              <div style={{ height: '200px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={entityData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} dataKey="value" nameKey="name" paddingAngle={5}>
                      {entityData.map((e, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }}/>
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Distribución de Casos</CardTitle></CardHeader>
            <CardContent>
              <div style={{ height: '200px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} dataKey="value" nameKey="name" paddingAngle={5}>
                      {pieData.map((e, i) => <Cell key={i} fill={CHART_COLORS.slice().reverse()[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Estado Actual</CardTitle></CardHeader>
            <CardContent>
              <div style={{ height: '200px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <Tooltip cursor={{ fill: '#f4f4f5' }} contentStyle={{ borderRadius: '8px', fontSize: '12px' }}/>
                    <Bar dataKey="casos" fill="#18181b" radius={[4, 4, 0, 0]} barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader className="table-header-row">
          <div>
            <CardTitle>{currentUser.role === 'LIDER' ? 'Reportes Realizados' : 'Bandeja de Casos SST'}</CardTitle>
            <CardDescription>{currentUser.role === 'LIDER' ? 'Visualización de solo lectura.' : 'Gestiona los reportes de sedes y equipos.'}</CardDescription>
          </div>
          <div className="d-flex items-center gap-2">
            <div className="table-search-bar">
              <Search className="table-search-icon" size={16} />
              <Input type="text" placeholder="Buscar reporte..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="table-search-input" />
            </div>
            {currentUser.role === 'LIDER' && (
              <Button onClick={() => setActiveTab('new')} className="hidden sm-flex d-flex items-center"><Plus size={16} style={{ marginRight: '0.5rem' }} /> Nuevo</Button>
            )}
          </div>
        </CardHeader>
        
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID / Fecha</th><th>Colaborador</th><th>Detalle</th><th>Estado</th>
                {currentUser.role === 'SST' && <th className="text-right">Acción</th>}
              </tr>
            </thead>
            <tbody>
              {currentItems.map(ticket => (
                <tr key={ticket.id}>
                  <td>
                    <p className="font-semibold text-zinc-900">{ticket.id}</p>
                    <p className="text-xs text-zinc-500 mt-4">{ticket.date}</p>
                    {ticket.vencimiento && ticket.status !== 'Cerrado' && new Date(ticket.vencimiento) < new Date() && (
                      <Badge variant="destructive" style={{ marginTop: '0.5rem' }}>Vencido</Badge>
                    )}
                  </td>
                  <td>
                    <div className="d-flex items-center gap-4">
                      {ticket.employeeDetails?.foto ? (
                        <img src={ticket.employeeDetails.foto} alt="" className="avatar" style={{ height: '2.5rem', width: '2.5rem' }} />
                      ) : (
                        <div className="avatar" style={{ height: '2.5rem', width: '2.5rem' }}>{ticket.employeeName.charAt(0)}</div>
                      )}
                      <div>
                        <p className="font-medium text-zinc-900">{ticket.employeeName}</p>
                        <p className="text-xs text-zinc-500">CC: {ticket.employeeId}</p>
                        {currentUser.role === 'SST' && <p className="text-xs text-blue-500 font-medium" style={{ marginTop: '0.125rem' }}>Líder: {ticket.leaderDocument}</p>}
                      </div>
                    </div>
                  </td>
                  <td style={{ maxWidth: '200px' }}>
                    <p className="font-medium text-zinc-900">{ticket.type}</p>
                    <p className="text-xs text-zinc-500 truncate" style={{ marginTop: '0.25rem' }} title={ticket.description}>{ticket.description}</p>
                  </td>
                  <td><StatusBadge status={ticket.status} /></td>
                  {currentUser.role === 'SST' && (
                    <td className="text-right">
                      <Button variant="outline" size="sm" onClick={() => handleOpenCase(ticket)}>
                        <span className="d-flex items-center">Gestionar <ChevronRight size={14} style={{ marginLeft: '0.25rem' }} /></span>
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
              {currentItems.length === 0 && !loadingData && (
                <tr><td colSpan="5" className="text-center text-zinc-500" style={{ height: '6rem' }}>No se encontraron reportes.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        
        {totalPages > 1 && (
          <div className="table-pagination">
            <span className="text-sm text-zinc-500">Página {currentPage} de {totalPages}</span>
            <div className="d-flex gap-2">
              <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Anterior</Button>
              <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Siguiente</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );


  const renderNewTicket = () => {
    const selectedEmployee = currentUser.equipo?.find(e => String(e.document_number) === selectedEmpId);
    const handleDataChange = (e, field) => setEmpData(prev => ({ ...prev, [field]: e.target.value }));

    return (
      <div className="animate-slide-up" style={{ maxWidth: '56rem', margin: '0 auto', paddingBottom: '3rem' }}>
        <Card style={{ overflow: 'hidden' }}>
          <CardHeader style={{ backgroundColor: 'var(--zinc-900)', color: 'white', borderBottom: 'none' }}>
            <CardTitle className="text-xl">Reportar Nueva Novedad SST</CardTitle>
            <CardDescription className="text-zinc-400">Diligencie este formulario con información detallada para una correcta gestión.</CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmitReport}>
            <CardContent style={{ paddingTop: '2rem', display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
              
              {/* Sección: Colaborador */}
              <div>
                <div className="form-section-header">
                  <User size={20} className="text-zinc-500" />
                  <h3 className="font-bold text-base">1. Identificación del Colaborador</h3>
                </div>
                
                <div style={{ maxWidth: '28rem', marginBottom: '1.5rem' }}>
                  <Label>Seleccionar miembro del equipo</Label>
                  <Select value={selectedEmpId} onChange={(e) => setSelectedEmpId(e.target.value)} required>
                    <option value="" disabled>-- Busque o seleccione --</option>
                    {currentUser.equipo?.map(emp => <option key={emp.document_number} value={emp.document_number}>{emp.nombre} - CC: {emp.document_number}</option>)}
                  </Select>
                </div>

                {selectedEmployee && (
                  <div className="employee-summary-card">
                    <div className="d-flex" style={{ flexDirection: 'column', gap: '1rem' }}>
                      <div className="d-flex items-center gap-4">
                        {selectedEmployee.foto ? (
                          <img src={selectedEmployee.foto} alt="" className="avatar" style={{ height: '4rem', width: '4rem' }} />
                        ) : (
                          <div className="avatar text-xl font-bold" style={{ height: '4rem', width: '4rem' }}>{selectedEmployee.nombre.charAt(0)}</div>
                        )}
                        <div>
                          <p className="font-bold text-lg leading-tight">{selectedEmployee.nombre}</p>
                          <p className="text-sm text-zinc-500 mt-4 font-mono">C.C. {selectedEmployee.document_number}</p>
                        </div>
                      </div>
                      <div className="form-grid form-grid-2" style={{ gap: '1rem' }}>
                        <div><Label className="text-xs text-zinc-500">Cargo</Label><Input value={empData.cargo} onChange={(e)=>handleDataChange(e,'cargo')} className="text-xs" style={{ height: '2rem' }} /></div>
                        <div><Label className="text-xs text-zinc-500">Área</Label><Input value={empData.area_nombre} onChange={(e)=>handleDataChange(e,'area_nombre')} className="text-xs" style={{ height: '2rem' }} /></div>
                        <div><Label className="text-xs text-zinc-500">Dpto.</Label><Input value={empData.departamento} onChange={(e)=>handleDataChange(e,'departamento')} className="text-xs" style={{ height: '2rem' }} /></div>
                        <div><Label className="text-xs text-zinc-500">Celular</Label><Input value={empData.celular} onChange={(e)=>handleDataChange(e,'celular')} className="text-xs" style={{ height: '2rem' }} /></div>
                      </div>
                    </div>

                    <div style={{ borderLeft: '1px solid var(--zinc-200)', paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                       <h4 className="font-semibold text-sm d-flex items-center gap-2"><HeartPulse size={16} className="text-zinc-400"/> Datos Demográficos</h4>
                       <div className="d-flex" style={{ flexDirection: 'column', gap: '0.75rem' }}>
                         <div>
                            <Label className="text-xs">Género</Label>
                            <Select value={genero} onChange={(e) => setGenero(e.target.value)} required className="text-xs" style={{ height: '2rem' }}>
                              <option value="" disabled>Seleccione...</option><option value="Mujer">Mujer</option><option value="Hombre">Hombre</option>
                            </Select>
                         </div>
                         <div>
                            <Label className="text-xs">Fecha de Nacimiento</Label>
                            <Input type="date" value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)} required className="text-xs" style={{ height: '2rem' }} />
                            {fechaNacimiento && <span className="text-xs text-zinc-500 mt-4 d-block">Edad calculada: {calculateAge(fechaNacimiento)} años</span>}
                         </div>
                       </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Sección: Detalles del caso */}
              <div>
                <div className="form-section-header">
                  <FileText size={20} className="text-zinc-500" />
                  <h3 className="font-bold text-base">2. Detalles de la Novedad</h3>
                </div>
                <div className="form-grid form-grid-3">
                  <div style={{ gridColumn: 'span 2' }}>
                    <Label>Categoría del Reporte</Label>
                    <Select value={reportType} onChange={(e) => setReportType(e.target.value)}>
                      {REPORT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </Select>
                  </div>
                  
                  <div className="form-grid form-grid-4" style={{ gridColumn: '1 / -1', backgroundColor: 'var(--zinc-50)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--zinc-200)' }}>
                      <div>
                        <Label className="text-xs">Entidad a Cargo</Label>
                        <Select value={entidadCargo} onChange={(e) => setEntidadCargo(e.target.value)}>
                          <option value="EPS">EPS</option><option value="ARL">ARL</option><option value="Medicina Prepagada">Medicina Prepagada</option>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Nombre de Entidad</Label>
                        <Input value={nombreEntidad} onChange={(e) => setNombreEntidad(e.target.value)} required placeholder="Ej: Sanitas" />
                      </div>
                      <div>
                        <Label className="text-xs">Peso (kg)</Label>
                        <Input type="number" step="0.1" required placeholder="Ej: 70.5" value={peso} onChange={(e) => setPeso(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">Talla (m)</Label>
                        <Input type="number" step="0.01" required placeholder="Ej: 1.75" value={talla} onChange={(e) => setTalla(e.target.value)} />
                      </div>
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                  <Label>Descripción de lo sucedido / Observaciones</Label>
                  <Textarea required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Explique detalladamente..." />
                </div>
              </div>

              {/* Sección: Adjuntos */}
              <div>
                <div className="form-section-header">
                  <Upload size={20} className="text-zinc-500" />
                  <h3 className="font-bold text-base">3. Soportes (Opcional)</h3>
                </div>
                <div className="file-dropzone">
                   <Input type="file" accept="application/pdf" id="file-upload" className="hidden" onChange={(e) => setPdfFile(e.target.files[0])} />
                   <Label htmlFor="file-upload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                     <div className="avatar" style={{ height: '3rem', width: '3rem', marginBottom: '0.5rem' }}><FileText className="text-zinc-400" /></div>
                     <span className="font-medium">Haga clic para subir soporte en PDF</span>
                     <span className="text-xs text-zinc-500 mt-4">Solo archivos .pdf (Max. 5MB)</span>
                   </Label>
                   {pdfFile && <Badge variant="success" style={{ marginTop: '1rem' }}>Archivo cargado: {pdfFile.name}</Badge>}
                </div>
              </div>

            </CardContent>
            
            <CardFooter style={{ backgroundColor: 'var(--zinc-50)', borderTop: '1px solid var(--zinc-200)', justifyContent: 'space-between', paddingTop: '1.5rem' }}>
              <Button type="button" variant="outline" onClick={() => setActiveTab('dashboard')}>Cancelar</Button>
              <Button disabled={isSubmittingReport || !selectedEmpId} type="submit" size="lg">
                {isSubmittingReport ? 'Guardando...' : 'Enviar Reporte al SST'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  };

  return (
    <div className="d-flex" style={{ minHeight: '100vh', flexDirection: 'column' }}>
      {/* Header */}
      <header className="app-header">
        <div className="header-actions">
          <div className="header-profile">
            {currentUser.foto ? (
              <img src={currentUser.foto} alt="Perfil" className="avatar" />
            ) : (
              <div className="avatar"><User size={14} className="text-zinc-500" /></div>
            )}
            <div className="hidden sm-flex" style={{ flexDirection: 'column' }}>
              <span className="text-sm font-medium">{currentUser.name}</span>
              <span className="text-xs text-zinc-500">{currentUser.cargo}</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchReports} disabled={loadingData} className="hidden md-flex text-zinc-500">
            <RefreshCw size={16} className={loadingData ? 'animate-spin' : ''} style={{ marginRight: '0.5rem' }} /> Actualizar
          </Button>
          <Button variant="ghost" size="icon" onClick={handleLogout} style={{ color: 'var(--zinc-500)' }}>
            <LogOut size={18} />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'new' && renderNewTicket()}
      </main>

      {/* Slide-over Case Management (ONLY FOR SST) */}
      {selectedReport && currentUser.role === 'SST' && (
        <div className="modal-overlay">
          <div className="modal-content animate-slide-left">
            
            <div className="modal-header">
              <div>
                <h2 className="text-xl font-bold text-zinc-900">{selectedReport.id}</h2>
                <div className="d-flex items-center gap-2 mt-4">
                  <p className="text-sm text-zinc-500 d-flex items-center"><Calendar size={12} style={{ marginRight: '0.25rem' }}/> {selectedReport.date}</p>
                  <StatusBadge status={selectedReport.status} />
                </div>
              </div>
              <Button variant="outline" onClick={() => setSelectedReport(null)}>Cerrar Panel</Button>
            </div>

            <div className="modal-body">
              {/* Employee Card */}
              <div className="employee-summary-card" style={{ gridTemplateColumns: '1fr' }}>
                <div className="d-flex gap-4">
                  {selectedReport.employeeDetails?.foto ? (
                    <img src={selectedReport.employeeDetails.foto} alt="" className="avatar" style={{ height: '5rem', width: '5rem', borderRadius: 'var(--radius-md)' }} />
                  ) : (
                    <div className="avatar font-bold text-2xl" style={{ height: '5rem', width: '5rem', borderRadius: 'var(--radius-md)' }}>{selectedReport.employeeName.charAt(0)}</div>
                  )}
                  <div style={{ flex: 1 }}>
                    <h3 className="font-bold text-lg leading-tight mb-4">{selectedReport.employeeName}</h3>
                    <p className="text-xs text-zinc-500 mb-4 font-mono">{selectedReport.employeeDetails?.documento}</p>
                    <div className="form-grid form-grid-2 text-xs text-zinc-600" style={{ gap: '0.5rem' }}>
                      <div className="d-flex items-center"><Briefcase size={12} style={{ marginRight: '0.25rem' }} /> {selectedReport.employeeDetails?.cargo}</div>
                      <div className="d-flex items-center"><MapPin size={12} style={{ marginRight: '0.25rem' }} /> {selectedReport.employeeDetails?.area}</div>
                    </div>
                  </div>
                </div>
                <div className="form-grid form-grid-4 text-center text-sm" style={{ borderTop: '1px solid var(--zinc-200)', paddingTop: '1rem', marginTop: '1rem' }}>
                  <div><span className="text-xs text-zinc-500 d-block">Edad</span><span className="font-medium">{selectedReport.employeeDetails?.edad} a</span></div>
                  <div><span className="text-xs text-zinc-500 d-block">Género</span><span className="font-medium">{selectedReport.employeeDetails?.genero}</span></div>
                  <div><span className="text-xs text-zinc-500 d-block">Antigüedad</span><span className="font-medium">{selectedReport.employeeDetails?.antiguedad}</span></div>
                  <div><span className="text-xs text-zinc-500 d-block">IMC</span><span className="font-medium">{calculateBMI(selectedReport.employeeDetails?.peso, selectedReport.employeeDetails?.talla).value}</span></div>
                </div>
              </div>

              {/* Event Details */}
              <div>
                <h3 className="text-sm font-bold d-flex items-center mb-4" style={{ borderBottom: '1px solid var(--zinc-200)', paddingBottom: '0.5rem' }}><FileText size={16} style={{ marginRight: '0.5rem' }}/> Información de la Novedad</h3>
                <div className="form-grid form-grid-2 text-sm mb-4">
                  <div><span className="text-xs text-zinc-500 d-block">Categoría</span><span className="font-medium">{selectedReport.type}</span></div>
                  <div><span className="text-xs text-zinc-500 d-block">Entidad a Cargo</span><span className="font-medium">{selectedReport.entidadCargo} - {selectedReport.nombreEntidad}</span></div>
                </div>
                <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--zinc-200)' }}>
                  <span className="text-xs font-semibold text-zinc-500 d-block mb-4">Descripción reportada:</span>
                  <p className="text-sm">"{selectedReport.description}"</p>
                </div>
              </div>

              {/* Action Form */}
              <div className="action-box">
                <h3 className="text-sm font-bold" style={{ color: 'var(--blue-900)', marginBottom: '1rem', display: 'flex', alignItems: 'center' }}><Activity size={16} style={{ marginRight: '0.5rem' }}/> Registrar Gestión SST</h3>
                <form onSubmit={handleSaveFollowUp} className="d-flex" style={{ flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-grid form-grid-2">
                    <div>
                      <Label className="text-xs" style={{ color: 'var(--blue-900)' }}>Categoría Acción</Label>
                      <Select value={accionCategory} onChange={(e) => setAccionCategory(e.target.value)}>{ACTION_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</Select>
                    </div>
                    <div>
                      <Label className="text-xs" style={{ color: 'var(--blue-900)' }}>Sistema Afectado</Label>
                      <Select value={sistemaAfectado} onChange={(e) => setSistemaAfectado(e.target.value)}>{AFFECTED_SYSTEMS.map(s => <option key={s} value={s}>{s}</option>)}</Select>
                    </div>
                    <div>
                      <Label className="text-xs" style={{ color: 'var(--blue-900)' }}>Temporalidad</Label>
                      <Select value={temporalidad} onChange={(e) => setTemporalidad(e.target.value)}>
                        <option value="">No aplica / Sin cierre automático</option><option value="1">1 Mes</option><option value="2">2 Meses</option>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs" style={{ color: 'var(--blue-900)' }}>Estado del Caso</Label>
                      <Select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>{STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}</Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs" style={{ color: 'var(--blue-900)' }}>Detalle de la Gestión</Label>
                    <Textarea required value={newNote} onChange={(e) => setNewNote(e.target.value)} style={{ borderColor: 'var(--blue-200)' }} />
                  </div>
                  <Button type="submit" disabled={isSubmittingNote} style={{ backgroundColor: 'var(--blue-600)', color: 'white' }}>
                    {isSubmittingNote ? 'Guardando...' : 'Guardar Gestión'}
                  </Button>
                </form>
              </div>

              {/* Timeline */}
              <div style={{ borderTop: '1px solid var(--zinc-200)', paddingTop: '1rem' }}>
                <h3 className="text-sm font-bold mb-4 d-flex items-center"><Clock size={16} style={{ marginRight: '0.5rem' }}/> Historial de Gestiones</h3>
                <div className="timeline">
                  {selectedReport.history.map((h, i) => (
                    <div key={i} className="timeline-item">
                      <div className="timeline-marker timeline-marker-blue"></div>
                      <div className="timeline-content">
                        <div className="d-flex justify-between items-center mb-4">
                          <Badge variant="secondary" style={{ backgroundColor: 'var(--blue-50)', color: 'var(--blue-700)' }}>{h.accion}</Badge>
                          <span className="text-xs text-zinc-400">{h.date}</span>
                        </div>
                        <p className="text-sm">{h.note}</p>
                        <div className="d-flex justify-between items-center text-xs text-zinc-500 mt-4" style={{ paddingTop: '0.5rem', borderTop: '1px solid var(--zinc-100)' }}>
                          <span className="d-flex items-center"><Activity size={12} style={{ marginRight: '0.25rem' }}/> {h.sistema}</span>
                          <span className="italic">— {h.author}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="timeline-item">
                    <div className="timeline-marker timeline-marker-dark"></div>
                    <div className="timeline-content" style={{ backgroundColor: 'var(--zinc-50)' }}>
                      <div className="d-flex justify-between items-center mb-4">
                        <span className="font-bold text-sm">Apertura del Caso</span>
                        <span className="text-xs text-zinc-400">{selectedReport.date}</span>
                      </div>
                      <p className="text-xs text-zinc-500">Reportado por: <strong>{selectedReport.leaderDocument}</strong></p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
import React, { useState, useMemo } from 'react';
import { 
  Shield, 
  LogOut, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  FileText, 
  UserCircle, 
  Activity,
  ChevronRight,
  PlusCircle,
  Search,
  Loader2,
  Users
} from 'lucide-react';

// --- MOCK DATA INICIAL PARA REPORTES (Ya que no hay API de guardado aún) ---
const INITIAL_REPORTS = [
  {
    id: 'CASO-101',
    employeeId: '11', // Document number de prueba del equipo
    employeeName: 'Juan Pérez (Mock)',
    leaderDocument: '111',
    pdv: 'Sede Norte',
    date: '2026-06-08',
    type: 'Incidente',
    description: 'Caída de caja vacía cerca al pie, no hubo contacto ni lesión.',
    status: 'Cerrado',
    history: [
      { date: '2026-06-09', note: 'Se verificó con el empleado. No hay dolor. Se recomienda uso de botas de seguridad.', author: 'SST Central' }
    ]
  }
];

// --- HELPER COMPONENTS ---
const StatusBadge = ({ status }) => {
  const styles = {
    'Abierto': 'bg-red-50 text-red-800 border-red-200',
    'En Seguimiento': 'bg-amber-50 text-amber-800 border-amber-200',
    'Cerrado': 'bg-emerald-50 text-emerald-800 border-emerald-200',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide border uppercase ${styles[status] || 'bg-stone-100 text-stone-600'}`}>
      {status}
    </span>
  );
};

// --- MAIN APP COMPONENT ---
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [reports, setReports] = useState(INITIAL_REPORTS);

  const handleLogin = (user) => setCurrentUser(user);
  const handleLogout = () => setCurrentUser(null);

  const handleAddReport = (newReport) => {
    setReports([newReport, ...reports]);
  };

  const handleUpdateReport = (reportId, newHistoryEntry, newStatus) => {
    setReports(reports.map(r => {
      if (r.id === reportId) {
        return {
          ...r,
          status: newStatus,
          history: [...r.history, newHistoryEntry]
        };
      }
      return r;
    }));
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col font-sans text-stone-800">
      {/* HEADER: Café oscuro elegante */}
      <header className="bg-[#3E2723] text-white shadow-lg border-b-4 border-[#5D4037]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white p-2 rounded-lg">
              <Shield className="h-6 w-6 text-[#3E2723]" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-wider uppercase block leading-tight">SST Protect</span>
              <span className="text-[10px] text-stone-300 tracking-widest uppercase">Portal Corporativo</span>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-bold text-[#F5F5DC]">{currentUser.name}</div>
              <div className="text-xs text-stone-400 font-medium tracking-wide">
                {currentUser.role} • {currentUser.pdv}
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2.5 bg-[#4E342E] hover:bg-[#5D4037] rounded-full transition-all duration-300 border border-[#5D4037] hover:shadow-md"
              title="Cerrar Sesión"
            >
              <LogOut className="h-5 w-5 text-stone-200" />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {currentUser.role === 'LIDER' ? (
          <LeaderDashboard 
            user={currentUser} 
            reports={reports} 
            onAddReport={handleAddReport} 
          />
        ) : (
          <SSTDashboard 
            reports={reports} 
            onUpdateReport={handleUpdateReport} 
          />
        )}
      </main>
    </div>
  );
}

// --- LOGIN COMPONENT CON API REAL ---
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
      const response = await fetch('https://apialohav2.crepesywaffles.com/buk/empleados3');
      if (!response.ok) {
        throw new Error('Error al conectar con el servidor de empleados.');
      }
      
      const jsonResponse = await response.json();
      const usersData = jsonResponse.data || [];
      
      const user = usersData.find(u => String(u.document_number) === document);

      if (!user) {
        throw new Error('Documento no encontrado en la base de datos.');
      }

      if (user.status !== 'activo') {
        throw new Error('El usuario se encuentra inactivo.');
      }

      let role = '';
      let equipoActivo = [];

      // Validar rol SST
      if (user.departamento === 'Seguridad y Salud en el Trabajo' && user.direction === 'Dirección Desarrollo Humano') {
        role = 'SST';
      } 
      // Validar rol LÍDER
      else if (user.lider === 1) {
        role = 'LIDER';
        // Filtrar el equipo para asegurar que solo se muestren empleados activos
        if (user.equipo && Array.isArray(user.equipo)) {
          equipoActivo = user.equipo.filter(emp => emp.status === 'activo');
        }
      } 
      // Sin permisos
      else {
        throw new Error('No tiene los permisos requeridos (No es Líder ni profesional SST).');
      }

      onLogin({
        document: String(user.document_number),
        name: user.nombre,
        role: role,
        pdv: user.area_nombre !== 'No Aplica' ? user.area_nombre : user.departamento,
        equipo: equipoActivo,
        cargo: user.cargo,
        foto: user.foto
      });

    } catch (err) {
      setError(err.message || 'Ocurrió un error inesperado al iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Elementos decorativos de fondo */}
      <div className="absolute top-0 left-0 w-full h-64 bg-[#3E2723] rounded-b-[100px] shadow-2xl opacity-95"></div>

      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden relative z-10 border border-stone-100">
        <div className="p-10 text-center">
          <div className="mx-auto w-20 h-20 bg-[#F5F5DC] rounded-full flex items-center justify-center mb-6 shadow-inner border border-[#EFEBE9]">
            <Shield className="h-10 w-10 text-[#5D4037]" />
          </div>
          <h2 className="text-3xl font-black text-[#3E2723] tracking-tight">SST Protect</h2>
          <p className="text-stone-500 mt-2 text-sm font-medium tracking-wide uppercase">Gestión Corporativa</p>
        </div>
        
        <div className="px-10 pb-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="document" className="block text-sm font-bold text-[#5D4037] mb-2 uppercase tracking-wide">
                Documento de Identidad
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <UserCircle className="h-5 w-5 text-stone-400" />
                </div>
                <input
                  id="document"
                  type="number"
                  required
                  disabled={loading}
                  className="block w-full pl-12 pr-4 py-4 bg-stone-50 border-2 border-stone-200 rounded-xl focus:ring-0 focus:border-[#5D4037] focus:bg-white sm:text-base font-medium transition-all duration-300 outline-none disabled:opacity-50"
                  placeholder="Ingrese su documento..."
                  value={document}
                  onChange={(e) => setDocument(e.target.value)}
                />
              </div>
            </div>
            
            {error && (
              <div className="bg-red-50 text-red-800 p-4 rounded-xl text-sm flex items-start border border-red-100 animate-fade-in">
                <AlertTriangle className="h-5 w-5 mr-3 flex-shrink-0 text-red-600" />
                <span className="font-medium leading-relaxed">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !document}
              className="w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-[#5D4037] hover:bg-[#3E2723] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5D4037] transition-all duration-300 disabled:opacity-70 uppercase tracking-widest"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5 mr-3" />
                  Verificando...
                </>
              ) : (
                'Ingresar al Sistema'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// --- LEADER DASHBOARD COMPONENT ---
function LeaderDashboard({ user, reports, onAddReport }) {
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [reportType, setReportType] = useState('Incidente');
  const [description, setDescription] = useState('');

  // Equipo viene de la API
  const myEmployees = user.equipo || [];

  const selectedEmployee = myEmployees.find(e => String(e.document_number) === selectedEmpId);
  
  // History of reports for the selected employee
  const employeeHistory = useMemo(() => {
    if (!selectedEmpId) return [];
    return reports.filter(r => String(r.employeeId) === selectedEmpId).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [reports, selectedEmpId]);

  const handleSubmitReport = (e) => {
    e.preventDefault();
    if (!selectedEmployee || !description.trim()) return;

    const newReport = {
      id: `CASO-${Math.floor(Math.random() * 10000)}`,
      employeeId: String(selectedEmployee.document_number),
      employeeName: selectedEmployee.nombre,
      leaderDocument: user.document,
      pdv: user.pdv,
      date: new Date().toISOString().split('T')[0],
      type: reportType,
      description: description,
      status: 'Abierto',
      history: []
    };

    onAddReport(newReport);
    setDescription('');
  };

  return (
    <div className="space-y-8">
      {/* ENCABEZADO LIDER */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {user.foto ? (
             <img src={user.foto} alt={user.name} className="h-16 w-16 rounded-full border-2 border-[#5D4037] object-cover shadow-sm"/>
          ) : (
             <div className="h-16 w-16 rounded-full bg-[#EFEBE9] text-[#5D4037] flex items-center justify-center font-bold text-xl border-2 border-[#5D4037]">
                {user.name.charAt(0)}
             </div>
          )}
          <div>
            <h1 className="text-3xl font-black text-[#3E2723]">{user.name}</h1>
            <p className="text-stone-500 font-medium tracking-wide uppercase text-sm mt-1">{user.cargo} • {user.pdv}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 bg-[#EFEBE9] text-[#5D4037] px-5 py-3 rounded-xl border border-[#D7CCC8]">
          <Users className="h-5 w-5" />
          <span className="font-bold">Colaboradores: {myEmployees.length}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* FORMULARIO DE REPORTE */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl shadow-md border border-stone-200 overflow-hidden">
            <div className="bg-[#3E2723] px-6 py-5">
              <h2 className="text-lg font-bold text-white flex items-center tracking-wide uppercase">
                <PlusCircle className="h-5 w-5 mr-3 text-[#D7CCC8]" />
                Registrar Novedad
              </h2>
            </div>
            <div className="p-8">
              <form onSubmit={handleSubmitReport} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-[#5D4037] mb-2 uppercase tracking-wide">
                    Seleccionar Colaborador
                  </label>
                  <select
                    className="w-full bg-stone-50 border-2 border-stone-200 rounded-xl focus:border-[#5D4037] focus:ring-0 sm:text-sm p-3 font-medium outline-none transition-colors"
                    value={selectedEmpId}
                    onChange={(e) => setSelectedEmpId(e.target.value)}
                    required
                  >
                    <option value="" disabled>-- Seleccione su colaborador --</option>
                    {myEmployees.map(emp => (
                      <option key={emp.document_number} value={emp.document_number}>
                        {emp.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedEmployee && (
                  <div className="bg-[#FDFBF7] p-4 rounded-xl border border-[#D7CCC8] text-sm animate-fade-in shadow-inner">
                    <div className="flex gap-4 items-center mb-2">
                       {selectedEmployee.foto && (
                         <img src={selectedEmployee.foto} alt="Foto" className="w-10 h-10 rounded-full border border-stone-300 object-cover" />
                       )}
                       <div>
                         <p className="text-stone-800 font-bold">{selectedEmployee.nombre}</p>
                         <p className="text-stone-500 text-xs tracking-wider uppercase">C.C: {selectedEmployee.document_number}</p>
                       </div>
                    </div>
                    <p className="text-stone-700 font-medium"><strong>Cargo:</strong> {selectedEmployee.cargo}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-[#5D4037] mb-2 uppercase tracking-wide">
                    Tipo de Novedad
                  </label>
                  <select
                    className="w-full bg-stone-50 border-2 border-stone-200 rounded-xl focus:border-[#5D4037] focus:ring-0 sm:text-sm p-3 font-medium outline-none transition-colors"
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                  >
                    <option value="Incidente">Incidente (Sin lesión)</option>
                    <option value="Accidente Leve">Accidente Leve</option>
                    <option value="Accidente Grave">Accidente Grave</option>
                    <option value="Condición Insegura">Condición Insegura</option>
                    <option value="Enfermedad Laboral">Posible Enf. Laboral</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#5D4037] mb-2 uppercase tracking-wide">
                    Descripción del Caso
                  </label>
                  <textarea
                    rows={5}
                    required
                    className="w-full bg-stone-50 border-2 border-stone-200 rounded-xl focus:border-[#5D4037] focus:ring-0 sm:text-sm p-4 font-medium outline-none transition-colors resize-none"
                    placeholder="Detalle exactamente lo ocurrido..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={!selectedEmpId}
                  className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-[#5D4037] hover:bg-[#3E2723] focus:outline-none transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest"
                >
                  Enviar Reporte
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* HISTORIAL DEL EMPLEADO */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl shadow-md border border-stone-200 h-full flex flex-col overflow-hidden">
            <div className="bg-[#4E342E] px-8 py-5 flex justify-between items-center">
              <h2 className="text-lg font-bold text-white flex items-center tracking-wide uppercase">
                <FileText className="h-5 w-5 mr-3 text-[#D7CCC8]" />
                Historial SST
              </h2>
              {selectedEmployee && (
                <span className="text-xs font-bold bg-[#EFEBE9] text-[#3E2723] px-3 py-1.5 rounded-full shadow-sm tracking-wide uppercase">
                  {selectedEmployee.nombre.split(' ')[0]}
                </span>
              )}
            </div>
            
            <div className="p-8 flex-1 bg-stone-50/50">
              {!selectedEmpId ? (
                <div className="text-center py-24 text-stone-400">
                  <UserCircle className="h-20 w-20 mx-auto text-stone-300 mb-6" />
                  <p className="text-lg font-medium">Seleccione un colaborador<br/>para consultar su historial.</p>
                </div>
              ) : employeeHistory.length === 0 ? (
                <div className="text-center py-24 text-stone-500 animate-fade-in">
                  <CheckCircle className="h-20 w-20 mx-auto text-[#8BCA8E] mb-6" />
                  <p className="text-lg font-bold text-stone-700">Sin reportes previos</p>
                  <p className="text-sm mt-2">Este colaborador tiene un excelente historial SST.</p>
                </div>
              ) : (
                <div className="space-y-6 animate-fade-in">
                  {employeeHistory.map((report) => (
                    <div key={report.id} className="bg-white border-2 border-stone-100 rounded-2xl p-6 shadow-sm hover:border-[#D7CCC8] transition-colors relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-[#5D4037]"></div>
                      
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3 pl-2">
                        <div className="flex items-center gap-4">
                          <span className="font-black text-[#3E2723] tracking-wide">{report.id}</span>
                          <StatusBadge status={report.status} />
                        </div>
                        <span className="text-sm font-medium text-stone-400 bg-stone-100 px-3 py-1 rounded-full">{report.date}</span>
                      </div>
                      
                      <div className="pl-2">
                        <h4 className="text-sm font-bold text-[#5D4037] mb-2 uppercase tracking-wide">{report.type}</h4>
                        <p className="text-stone-700 leading-relaxed mb-6">{report.description}</p>
                        
                        {report.history.length > 0 && (
                          <div className="bg-[#FDFBF7] rounded-xl p-5 border border-[#EFEBE9]">
                            <p className="text-[11px] font-black text-[#5D4037] uppercase tracking-widest mb-3 flex items-center">
                              <Activity className="h-3 w-3 mr-2" />
                              Último Seguimiento
                            </p>
                            <div className="text-sm text-stone-800 border-l-4 border-[#8BCA8E] pl-4 py-1 font-medium">
                              <span className="text-stone-400 block mb-1 text-xs">{report.history[report.history.length - 1].date}</span>
                              {report.history[report.history.length - 1].note}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- SST DASHBOARD COMPONENT ---
function SSTDashboard({ reports, onUpdateReport }) {
  const [selectedReport, setSelectedReport] = useState(null);
  const [newNote, setNewNote] = useState('');
  const [newStatus, setNewStatus] = useState('');

  // Estadísticas
  const stats = useMemo(() => {
    return {
      total: reports.length,
      abiertos: reports.filter(r => r.status === 'Abierto').length,
      seguimiento: reports.filter(r => r.status === 'En Seguimiento').length,
      cerrados: reports.filter(r => r.status === 'Cerrado').length,
    };
  }, [reports]);

  const handleOpenCase = (report) => {
    setSelectedReport(report);
    setNewStatus(report.status);
    setNewNote('');
  };

  const handleCloseModal = () => {
    setSelectedReport(null);
  };

  const handleSaveFollowUp = (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    const historyEntry = {
      date: new Date().toISOString().split('T')[0],
      note: newNote,
      author: 'Profesional SST'
    };

    onUpdateReport(selectedReport.id, historyEntry, newStatus);
    
    setSelectedReport({
      ...selectedReport,
      status: newStatus,
      history: [...selectedReport.history, historyEntry]
    });
    setNewNote('');
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-[#3E2723]">Panel de Control SST</h1>
        <p className="text-stone-500 font-medium mt-1 tracking-wide">Gestión centralizada de novedades nacionales.</p>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Casos" value={stats.total} icon={<FileText />} variant="primary" />
        <StatCard title="Abiertos" value={stats.abiertos} icon={<AlertTriangle />} variant="danger" />
        <StatCard title="En Seguimiento" value={stats.seguimiento} icon={<Activity />} variant="warning" />
        <StatCard title="Cerrados" value={stats.cerrados} icon={<CheckCircle />} variant="success" />
      </div>

      {/* DATA GRID */}
      <div className="bg-white rounded-3xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="px-8 py-6 border-b border-stone-100 bg-white flex flex-col sm:flex-row justify-between items-center gap-4">
          <h2 className="text-lg font-bold text-[#3E2723] uppercase tracking-wide">Registro General</h2>
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-stone-400 h-4 w-4" />
            <input 
              type="text" 
              placeholder="Buscar caso, empleado, pdv..." 
              className="w-full sm:w-80 pl-11 pr-4 py-3 border-2 border-stone-100 rounded-xl text-sm focus:ring-0 focus:border-[#5D4037] bg-stone-50 font-medium outline-none transition-colors"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-100">
            <thead className="bg-[#FDFBF7]">
              <tr>
                <th className="px-8 py-4 text-left text-xs font-black text-[#5D4037] uppercase tracking-widest">Caso</th>
                <th className="px-8 py-4 text-left text-xs font-black text-[#5D4037] uppercase tracking-widest">Fecha</th>
                <th className="px-8 py-4 text-left text-xs font-black text-[#5D4037] uppercase tracking-widest">Punto de Venta</th>
                <th className="px-8 py-4 text-left text-xs font-black text-[#5D4037] uppercase tracking-widest">Colaborador</th>
                <th className="px-8 py-4 text-left text-xs font-black text-[#5D4037] uppercase tracking-widest">Tipo</th>
                <th className="px-8 py-4 text-left text-xs font-black text-[#5D4037] uppercase tracking-widest">Estado</th>
                <th className="px-8 py-4 text-right text-xs font-black text-[#5D4037] uppercase tracking-widest">Acción</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-stone-50">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-stone-50 transition-colors group">
                  <td className="px-8 py-5 whitespace-nowrap text-sm font-black text-[#3E2723]">{report.id}</td>
                  <td className="px-8 py-5 whitespace-nowrap text-sm font-medium text-stone-500">{report.date}</td>
                  <td className="px-8 py-5 whitespace-nowrap text-sm font-medium text-stone-600">{report.pdv}</td>
                  <td className="px-8 py-5 whitespace-nowrap text-sm font-bold text-stone-800">{report.employeeName}</td>
                  <td className="px-8 py-5 whitespace-nowrap text-sm font-medium text-stone-600">{report.type}</td>
                  <td className="px-8 py-5 whitespace-nowrap">
                    <StatusBadge status={report.status} />
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => handleOpenCase(report)}
                      className="text-[#5D4037] hover:text-[#3E2723] bg-[#EFEBE9] px-4 py-2 rounded-lg hover:bg-[#D7CCC8] transition-all flex items-center justify-end ml-auto font-bold uppercase tracking-wide text-xs"
                    >
                      Revisar
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </button>
                  </td>
                </tr>
              ))}
              {reports.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-8 py-16 text-center text-stone-400 font-medium">
                    No hay registros en el sistema.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL GESTIÓN DE CASO */}
      {selectedReport && (
        <div className="fixed inset-0 bg-[#3E2723]/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-stone-200">
            
            <div className="bg-[#3E2723] px-8 py-5 flex justify-between items-center shrink-0">
              <div>
                 <h2 className="text-xl font-black text-white tracking-wide">Gestión: {selectedReport.id}</h2>
                 <p className="text-[#D7CCC8] text-xs font-bold uppercase tracking-widest mt-1">SST Control Center</p>
              </div>
              <button onClick={handleCloseModal} className="text-[#D7CCC8] hover:text-white p-2 transition-colors font-bold text-sm tracking-widest uppercase bg-[#5D4037] rounded-lg">
                Cerrar
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-8 bg-[#FDFBF7]">
              
              {/* Columna Izquierda */}
              <div className="space-y-8">
                <div>
                  <h3 className="text-xs font-black text-[#5D4037] uppercase tracking-widest mb-4 border-b-2 border-stone-200 pb-2">Información del Evento</h3>
                  <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm space-y-4">
                    <p className="text-sm flex justify-between border-b border-stone-50 pb-2"><span className="text-stone-400 font-bold uppercase tracking-wide">Colaborador</span> <strong className="text-[#3E2723] text-right">{selectedReport.employeeName}</strong></p>
                    <p className="text-sm flex justify-between border-b border-stone-50 pb-2"><span className="text-stone-400 font-bold uppercase tracking-wide">PDV</span> <span className="text-stone-800 font-medium text-right">{selectedReport.pdv}</span></p>
                    <p className="text-sm flex justify-between border-b border-stone-50 pb-2"><span className="text-stone-400 font-bold uppercase tracking-wide">Fecha</span> <span className="text-stone-800 font-medium text-right">{selectedReport.date}</span></p>
                    <p className="text-sm flex justify-between border-b border-stone-50 pb-2"><span className="text-stone-400 font-bold uppercase tracking-wide">Tipo</span> <span className="text-stone-800 font-medium text-right">{selectedReport.type}</span></p>
                    <div className="text-sm flex justify-between items-center pt-1"><span className="text-stone-400 font-bold uppercase tracking-wide">Estado</span> <StatusBadge status={selectedReport.status} /></div>
                    
                    <div className="pt-4 mt-4 border-t-2 border-stone-100">
                      <span className="text-[#5D4037] font-black uppercase tracking-widest text-[10px] block mb-2">Descripción del Reporte</span>
                      <p className="text-sm text-stone-700 leading-relaxed bg-stone-50 p-4 rounded-xl border border-stone-100 font-medium">"{selectedReport.description}"</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-black text-[#5D4037] uppercase tracking-widest mb-4 border-b-2 border-stone-200 pb-2">Nuevo Seguimiento</h3>
                  <form onSubmit={handleSaveFollowUp} className="bg-white border border-stone-100 rounded-2xl p-6 space-y-5 shadow-sm">
                    <div>
                      <label className="block text-xs font-black text-[#5D4037] mb-2 uppercase tracking-widest">Actualizar Estado</label>
                      <select 
                        className="w-full bg-stone-50 border-2 border-stone-100 rounded-xl focus:border-[#5D4037] focus:ring-0 sm:text-sm p-3 font-bold outline-none"
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                      >
                        <option value="Abierto">Abierto</option>
                        <option value="En Seguimiento">En Seguimiento</option>
                        <option value="Cerrado">Cerrado</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-[#5D4037] mb-2 uppercase tracking-widest">Observaciones</label>
                      <textarea
                        rows={4}
                        required
                        className="w-full bg-stone-50 border-2 border-stone-100 rounded-xl focus:border-[#5D4037] focus:ring-0 sm:text-sm p-4 font-medium outline-none resize-none"
                        placeholder="Registre la gestión realizada..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-4 px-4 rounded-xl shadow-md text-sm font-black text-white bg-[#5D4037] hover:bg-[#3E2723] transition-all duration-300 uppercase tracking-widest"
                    >
                      Guardar Gestión
                    </button>
                  </form>
                </div>
              </div>

              {/* Columna Derecha / Timeline */}
              <div>
                <h3 className="text-xs font-black text-[#5D4037] uppercase tracking-widest mb-6 border-b-2 border-stone-200 pb-2 flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  Línea de Tiempo del Caso
                </h3>
                
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-1 before:bg-stone-200 pl-10">
                  
                  {/* Creación */}
                  <div className="relative">
                    <div className="absolute -left-10 w-6 h-6 rounded-full border-4 border-white bg-[#5D4037] shadow-sm flex items-center justify-center z-10 transform -translate-x-1/2"></div>
                    <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-black text-[#3E2723] text-sm uppercase tracking-wide">Apertura de Caso</div>
                        <time className="font-bold text-[#5D4037] bg-[#EFEBE9] px-2 py-1 rounded text-xs">{selectedReport.date}</time>
                      </div>
                      <div className="text-stone-500 text-xs font-medium uppercase tracking-wider">Reportado por Líder PDV</div>
                    </div>
                  </div>

                  {/* Seguimientos */}
                  {selectedReport.history.map((h, i) => (
                    <div key={i} className="relative">
                      <div className="absolute -left-10 w-6 h-6 rounded-full border-4 border-white bg-stone-400 shadow-sm flex items-center justify-center z-10 transform -translate-x-1/2"></div>
                      <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-black text-stone-700 text-sm uppercase tracking-wide">Gestión SST</div>
                          <time className="font-bold text-stone-500 bg-stone-100 px-2 py-1 rounded text-xs">{h.date}</time>
                        </div>
                        <div className="text-stone-700 text-sm mt-3 font-medium leading-relaxed">{h.note}</div>
                        <div className="text-stone-400 text-xs mt-3 font-bold uppercase tracking-wider">— {h.author}</div>
                      </div>
                    </div>
                  ))}
                  
                  {selectedReport.history.length === 0 && (
                    <div className="relative">
                       <div className="absolute -left-10 w-6 h-6 rounded-full border-4 border-[#FDFBF7] bg-stone-200 z-10 transform -translate-x-1/2"></div>
                       <p className="text-sm font-bold text-stone-400 py-2">Esperando gestión SST...</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- SUB-COMPONENTS ---
function StatCard({ title, value, icon, variant }) {
  const styles = {
    primary: 'bg-[#5D4037] text-white border-[#4E342E] icon-bg-[#3E2723]',
    danger: 'bg-white text-stone-800 border-red-200 icon-bg-red-50 icon-text-red-600',
    warning: 'bg-white text-stone-800 border-amber-200 icon-bg-amber-50 icon-text-amber-600',
    success: 'bg-white text-stone-800 border-emerald-200 icon-bg-emerald-50 icon-text-emerald-600',
  };

  const current = styles[variant];

  return (
    <div className={`rounded-3xl border-2 p-6 flex items-center shadow-sm ${current.split(' ').filter(c => !c.startsWith('icon-')).join(' ')}`}>
      <div className={`p-4 rounded-2xl mr-5 shadow-inner ${variant === 'primary' ? 'bg-[#3E2723] text-[#D7CCC8]' : current.match(/icon-bg-[^\s]+/)[0].replace('icon-bg-', 'bg-')} ${variant !== 'primary' ? current.match(/icon-text-[^\s]+/)[0].replace('icon-text-', 'text-') : ''}`}>
        {icon}
      </div>
      <div>
        <p className={`text-xs font-black uppercase tracking-widest ${variant === 'primary' ? 'text-[#D7CCC8]' : 'text-stone-400'}`}>{title}</p>
        <p className="text-3xl font-black mt-1">{value}</p>
      </div>
    </div>
  );
}
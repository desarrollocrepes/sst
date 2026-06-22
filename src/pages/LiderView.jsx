import React, { useState, useEffect } from 'react';
import { Search, Plus, User, RefreshCw, LogOut, FileText, UserCircle } from 'lucide-react';
import { STRAPI_BASE_URL, normalizeBukUser, obtenerEmpleadoBuk, mapStrapiToReports, StatusBadge } from '../utils/helpers';

const NewReportModal = ({ currentUser, onClose, onRefresh }) => {
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [empDetails, setEmpDetails] = useState(null);
  const [form, setForm] = useState({ type: 'Incidente', peso: '', talla: '', gender: '', entityType: 'EPS', entityName: '', description: '' });
  const [supportFile, setSupportFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateForm = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSelectEmployee = async (docNum) => {
    setSelectedEmpId(docNum);
    if (!docNum) return setEmpDetails(null);
    const teamEmp = currentUser.equipo?.find(emp => String(emp.document_number) === String(docNum));
    const normEmp = teamEmp ? normalizeBukUser(teamEmp) : null;
    setEmpDetails(normEmp);
    const bukEmp = await obtenerEmpleadoBuk(docNum);
    if (bukEmp) setEmpDetails({ ...normEmp, ...bukEmp });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const emp = empDetails || currentUser.equipo.find(e => String(e.document_number) === String(selectedEmpId));
    if (!emp || !form.description.trim()) return;

    setIsSubmitting(true);
    try {
      let archivoId = null;
      if (supportFile) {
        const uploadData = new FormData();
        uploadData.append('files', supportFile);
        const upRes = await fetch(`${STRAPI_BASE_URL.replace('/api', '')}/api/upload`, { method: 'POST', body: uploadData });
        if (!upRes.ok) throw new Error('Error al subir PDF.');
        const upJson = await upRes.json();
        archivoId = Array.isArray(upJson) ? upJson[0]?.id : upJson.id;
      }

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
          estado: null, // null para que quede en "Pendiente"
          archivo: archivoId || null // CAMBIO a "archivo"
        }
      };

      const res = await fetch(`${STRAPI_BASE_URL}/sst-reportes`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Error guardando reporte.");
      onRefresh(); onClose();
    } catch (err) { alert("Error: " + err.message); } finally { setIsSubmitting(false); }
  };

  const emp = empDetails || normalizeBukUser(currentUser.equipo?.find(e => String(e.document_number) === selectedEmpId) || {});
  const CATEGORIAS = ['Incidente', 'Accidente Leve', 'Accidente Grave', 'Condición Insegura', 'Enfermedad Laboral', 'Reincorporación post incapacidad', 'Recomendaciones medicas', 'Recomendaciones nutricionales', 'Incapacidades recurrentes'];
  const ENTIDADES = ['EPS', 'ARL', 'Medicina prepagada'];

  return (
    // CAMBIO MODAL LIDER: Estructura y estilos forzados para que funcione como el Slide Over de SST
    <div className="drawer-overlay" onClick={onClose} style={{ position: 'fixed', inset: 0, display: 'flex', justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000 }}>
      <div className="drawer-panel drawer-panel-single" onClick={e => e.stopPropagation()} style={{ width: '500px', height: '100%', backgroundColor: '#fff', overflowY: 'auto', padding: '20px', animation: 'slideLeft 0.3s ease-out' }}>        
        
        <div className="drawer-body">
            <form onSubmit={handleSubmit} className="form-card">
            <div className="form-section">
              <div className="form-group">
                <label>Seleccionar colaborador</label>
                <select className="form-control" value={selectedEmpId} onChange={(e) => handleSelectEmployee(e.target.value)} required>
                  <option value="" disabled>-- Seleccione --</option>
                  {currentUser.equipo?.map(e => <option key={e.document_number} value={e.document_number}>{e.document_number} - {e.nombre}</option>)}
                </select>
              </div>
              {selectedEmpId && emp && (
                <div className="employee-preview">
                  <div className="employee-header" style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                    {emp.foto ? <img src={emp.foto} alt="Foto" className="avatar" style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }} /> : <div className="avatar placeholder" style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{emp.nombre?.charAt(0)}</div>}
                    <div className="employee-info"><h3 style={{ margin: 0 }}>{emp.nombre}</h3></div>
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
            </div>
            
            <div className="form-group">
              <label>Archivo Adjunto (PDF o Imagen)</label>
              <input 
                type="file" 
                className="form-control" 
                onChange={(e) => setSupportFile(e.target.files[0])}
                accept=".pdf,image/*" 
              />
            </div>
            
            <button type="submit" className="btn btn-primary block-btn" disabled={isSubmitting} style={{ width: '100%', marginTop: '15px' }}>
              {isSubmitting ? 'Guardando...' : 'Crear Reporte'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};


export default function LiderView({ currentUser, allBukUsers, onLogout }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const filter = `&filters[id_lider][$eq]=${currentUser.document}`;
      const res = await fetch(`${STRAPI_BASE_URL}/sst-reportes?populate=sst_seguimientos,archivo&sort=createdAt:desc${filter}`);
      const { data } = await res.json();
      if (data) {
        let mapped = mapStrapiToReports(data, allBukUsers || []);
        
        // RECUPERACIÓN DINÁMICA: Si el empleado no estaba en "allBukUsers", lo buscamos a la API directo para que salga la foto
        const missingDocs = [...new Set(mapped.filter(r => r.employeeName.startsWith('Empleado')).map(r => r.employeeId))];
        if (missingDocs.length > 0) {
          const fetchedUsers = await Promise.all(missingDocs.map(doc => obtenerEmpleadoBuk(doc)));
          const validUsers = fetchedUsers.filter(Boolean);
          if (validUsers.length > 0) {
            const combinedUsers = [...(allBukUsers || []), ...validUsers];
            mapped = mapStrapiToReports(data, combinedUsers);
          }
        }
        setReports(mapped);
      }
    } catch (err) { alert("Error cargando servidor."); } finally { setLoading(false); }
  };

  useEffect(() => { fetchReports(); }, []);
  const filtered = reports.filter(t => [t.type, t.id, t.employeeName].some(v => v?.toLowerCase().includes(search.toLowerCase())));

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

            <div className="card table-card">
              <div className="table-toolbar">
                <div className="search-wrapper"><Search className="search-icon" size={20} /><input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="form-control" /></div>
                <button onClick={() => setShowModal(true)} className="btn btn-primary"><Plus size={18} /> Crear Reporte</button>
              </div>

              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Fecha</th>
                      <th>Cédula</th>
                      <th>Colaborador</th>
                      <th>Tipo</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(t => (
                      <tr key={t.id}>
                        <td><p className="table-bold-text">{t.id}</p></td>
                        <td><p className="table-bold-text">{t.date}</p></td>
                        <td><p className="table-bold-text">{t.employeeId}</p></td>
                        <td>
                          {/* CAMBIO TABLA: Mostrando Foto y Nombre en la tabla del líder */}
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
                        <td><StatusBadge status={t.status} /></td>
                      </tr>
                    ))}
                    {!filtered.length && !loading && <tr><td colSpan="6" className="table-empty-state">No hay casos registrados.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        {showModal && <NewReportModal currentUser={currentUser} onClose={() => setShowModal(false)} onRefresh={fetchReports} />}
      </main>
    </div>
  );
}
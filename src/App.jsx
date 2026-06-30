import React, { useState, useEffect, useMemo } from 'react';
import './app.css';
import {
  Shield, Search, AlertTriangle, X, Save, LogOut,
  Users, RefreshCw, CheckCircle, Plus,
  ClipboardPlus,
  CircleUserRound,
  FileText
} from 'lucide-react';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

// ==================== CONFIG & STATE ====================
const API_EMPLEADOS = 'https://apialohav2.crepesywaffles.com/buk/empleados3';
const API_REPORTES = 'https://macfer.crepesywaffles.com/api/sst-reportes';
const API_SEGUIMIENTOS = 'https://macfer.crepesywaffles.com/api/sst-seguimientos';

const globalEmpCache = {};

// ==================== UTILS & API HELPERS ====================
async function fetchEmployee(doc) {
  try {
    const res = await fetch(`${API_EMPLEADOS}?documento=${doc}`);
    const json = await res.json();
    if (json.ok && json.data && json.data.length > 0) {
      globalEmpCache[doc] = json.data[0];
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

// Consideramos "Abierto" si no es explícitamente "Cerrado" (false). null = Nuevo/Pendiente.
const isCaseClosed = (estado) => estado === false || estado === 'Cerrado';

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
  if (!pesoKg || !tallaM) return 'N/A';
  const imc = pesoKg / (tallaM * tallaM);
  return imc.toFixed(1);
};


// ==================== COMPONENTS ====================

const ToastContainer = ({ toasts }) => (
  <div id="toast-container">
    {toasts.map((t) => (
      <div key={t.id} className={`toast ${t.type}`}>
        {t.type === 'error' ? '❌' : '✅'} {t.msg}
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
        onError={(e) => { e.target.src = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2NjbSI+PHBhdGggZD0iTTEyIDJjNS41MiAwIDEwIDQuNDggMTAgMTBzLTQuNDggMTAtMTAgMTBTMiAxNy41MiAyIDEyIDYuNDggMiAxMiAyem0wIDE4YzQuNDEgMCA4LTMuNTkgOC04cy0zLjU5LTgtOC04LTggMy41OS04IDggMy41OSA4IDggOHptMC0xNGMyLjIxIDAgNCAxLjc5 NCA0cy0xLjc5IDQtNCA0LTQtMS43OS00LTQgMS43OS00IDQtNHptMCA2YzIuNjcgMCA4IDEuMzQgOCA0djJIMDR2LTJjMC0yLjY2IDUuMzMtNCA4LTR6Ii8+PC9zdmc+" }}
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
      const emp = await fetchEmployee(doc);
      if (!emp) {
        showToast('Usuario no encontrado', 'error');
      } else if (emp.status !== 'activo') {
        showToast('El usuario no se encuentra activo', 'error');
      } else {
        if (emp.departamento === 'Seguridad y Salud en el Trabajo') {
          onLoginSuccess(emp, 'SST');
          showToast(`Bienvenido(a), ${emp.nombre.split(' ')[0]}`);
        } else if (emp.lider === 0 || emp.lider === 1 || (emp.equipo && emp.equipo.length > 0)) {
          onLoginSuccess(emp, 'LIDER');
          showToast(`Bienvenido(a), ${emp.nombre.split(' ')[0]}`);
        } else {
          showToast('No tiene permisos para acceder a esta plataforma', 'error');
        }
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

const LiderView = ({ user, showToast, setLoading }) => {
  const hasEquipo = user.equipo && user.equipo.length > 0;
  const [useDropdownMode, setUseDropdownMode] = useState(hasEquipo);
  const [manualDoc, setManualDoc] = useState('');
  const [selectedColaborador, setSelectedColaborador] = useState(null);
  const [history, setHistory] = useState([]);

  const [formData, setFormData] = useState({
    categoria: '', genero: '', peso: '', talla: '',
    entidad_tipo: '', entidad_nombre: '', descripcion: '', archivo: null
  });

  const loadHistory = async () => {
    try {
      const res = await fetch(`${API_REPORTES}?filters[id_lider][$eq]=${user.document_number}&populate=*&sort=createdAt:desc`);
      const json = await res.json();
      setHistory(json.data || []);
      
      const ids = [...new Set(json.data.map(r => r.attributes.id_empleado))];
      await Promise.all(ids.map(id => fetchEmployee(id)));
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
      const emp = await fetchEmployee(manualDoc);
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
    
    // Validación de campos obligatorios
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
        estado: null, // Null por defecto al crearse
        publishedAt: new Date().toISOString()
      };

      const formDataPayload = new FormData();
      formDataPayload.append('data', JSON.stringify(payloadData));
      
      if (formData.archivo) {
        formDataPayload.append('files.archivo', formData.archivo);
      }

      const res = await fetch(API_REPORTES, {
        method: 'POST',
        body: formDataPayload // Fetch establecerá automáticamente el multipart/form-data
      });

      if (res.ok) {
        showToast('Reporte enviado exitosamente');
        setFormData({ categoria: '', genero: '', peso: '', talla: '', entidad_tipo: '', entidad_nombre: '', descripcion: '', archivo: null });
        setSelectedColaborador(null);
        setManualDoc('');
        // Limpiar el input file físicamente
        const fileInput = document.getElementById('file-upload');
        if(fileInput) fileInput.value = '';
        
        await loadHistory(); // Refrescar tabla
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

  return (
    <div className="view-container active container">
      <div className="lider-header">
        <h2>Generar reporte a Seguridad y Salud en el Trabajo</h2>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="report-grid">
          <div className="form-group full-width">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="form-label">{useDropdownMode ? 'Colaborador Afectado (Mi Equipo)' : 'Buscar Colaborador por Cédula'}</label>
              {hasEquipo && (
                <button type="button" className="btn btn-outline" style={{ padding: '2px 8px', fontSize: '11px' }} onClick={() => setUseDropdownMode(!useDropdownMode)}>
                  {useDropdownMode ? <>Buscar por Cédula</> : <>Usar Lista de Equipo</>}
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
                <input type="number" className="form-control" placeholder="Ingrese número de cédula..." value={manualDoc} onChange={(e) => setManualDoc(e.target.value)} style={{ flex: 1 }} />
                <button type="button" className="btn btn-outline" onClick={handleManualSearch}>Buscar CC</button>
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
            <label className="form-label">Adjuntar Documento (Opcional - Solo PDF)</label>
            <input id="file-upload" type="file" accept="application/pdf" className="form-control" onChange={handleFileChange} />
          </div>
        </div>
        <div style={{ marginTop: '20px', textAlign: 'right' }}>
          <button className="btn btn-primary" onClick={handleSubmit}>Enviar Reporte a SST</button>
        </div>
      </div>

      {/* Historial del Líder */}
      <div className="cases-section">
        <div className="cases-header">
          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Mi Historial de Reportes</div>
          <button className="btn btn-outline" style={{ padding: '6px 12px' }} onClick={loadHistory}><RefreshCw size={14} /> Actualizar</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID Reporte</th>
                <th>Empleado Reportado</th>
                <th>Estado</th>
                <th>Categoría</th>
                <th>Fecha Reporte</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>No has realizado ningún reporte aún.</td></tr>
              ) : (
                history.map(r => {
                  const attr = r.attributes;
                  const empData = globalEmpCache[attr.id_empleado];
                  let estadoBadge = 'abierto';
                  let estadoLabel = 'Abierto';
                  if (attr.estado === false) { estadoBadge = 'cerrado'; estadoLabel = 'Cerrado'; }
                  else if (attr.estado === null) { estadoBadge = 'alerta'; estadoLabel = 'Nuevo'; } // null = alerta/nuevo

                  return (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>#{r.id}</td>
                      <td>
                        
                        {empData ? <b>{empData.nombre}</b> : `${attr.id_empleado}`}<br />
                        <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{attr.id_empleado}</span>
                      </td>
                      <td>
                        <span className={`status-badge ${estadoBadge}`} style={attr.estado === null ? { background: 'rgba(245, 158, 11, 0.1)', color: 'var(--amber)' } : {}}>
                          <span className="dot"></span>{estadoLabel}
                        </span>
                      </td>
                      <td>{attr.categoria || 'N/A'}</td>
                      <td>{new Date(attr.createdAt).toLocaleDateString('es-CO')}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const SSTDashboard = ({ user, showToast, setLoading }) => {
  const [reportes, setReportes] = useState([]);
  const [filter, setFilter] = useState('todos');
  const [search, setSearch] = useState('');
  const [selectedReporte, setSelectedReporte] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_REPORTES}?populate=*&publicationState=preview`);
      if (!res.ok) throw new Error('API Error');
      const json = await res.json();
      const sorted = json.data.sort((a, b) => new Date(b.attributes.createdAt) - new Date(a.attributes.createdAt));
      
      const ids = [...new Set(sorted.map(r => r.attributes.id_empleado).filter(Boolean))];
      await Promise.all(ids.map(id => fetchEmployee(id)));
      
      setReportes([...sorted]); 
    } catch (err) {
      showToast('Error al cargar datos del servidor', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const total = reportes.length;
  const abiertos = reportes.filter(r => !isCaseClosed(r.attributes.estado)).length;
  const cerrados = total - abiertos;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const urgentes = reportes.filter(r => {
    if (isCaseClosed(r.attributes.estado)) return false;
    const segs = r.attributes.sst_seguimientos?.data || [];
    return segs.length === 0 && new Date(r.attributes.createdAt) < sevenDaysAgo;
  }).length;

  const filteredReportes = useMemo(() => {
    let filtered = reportes;
    if (filter === 'Abierto') filtered = filtered.filter(r => !isCaseClosed(r.attributes.estado));
    else if (filter === 'Cerrado') filtered = filtered.filter(r => isCaseClosed(r.attributes.estado));
    else if (filter === 'Prioritario') {
      filtered = filtered.filter(r => {
        if (isCaseClosed(r.attributes.estado)) return false;
        const segs = r.attributes.sst_seguimientos?.data || [];
        return segs.length === 0 && new Date(r.attributes.createdAt) < sevenDaysAgo;
      });
    }

    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(r => {
        const attr = r.attributes;
        const empName = globalEmpCache[attr.id_empleado]?.nombre || '';
        return (attr.id_empleado && attr.id_empleado.includes(s)) ||
          empName.toLowerCase().includes(s) ||
          (attr.categoria || '').toLowerCase().includes(s);
      });
    }
    return filtered;
  }, [reportes, filter, search]);

  const PALETTE = ['#503629', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];

  const estadoData = useMemo(() => {
    const map = { 'Abierto': 0, 'Cerrado': 0, 'Nuevo': 0 };
    reportes.forEach(r => {
      if (r.attributes.estado === false) map['Cerrado']++;
      else if (r.attributes.estado === null) map['Nuevo']++;
      else map['Abierto']++;
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
    const map = { 'Mujer': 0, 'Hombre': 0, 'Sin Asignar': 0 };
    reportes.forEach(r => {
      const attr = r.attributes;
      const emp = globalEmpCache[attr.id_empleado];
      const g = attr.genero || (emp && emp.genero) || '';
      
      if (g.toLowerCase().startsWith('m') && g !== 'Mujer') map['Hombre']++;
      else if (g === 'Mujer' || g === 'Femenino') map['Mujer']++;
      else if (g === 'Hombre' || g === 'Masculino') map['Hombre']++;
      else map['Sin Asignar']++;
    });
    return {
      labels: Object.keys(map),
      datasets: [{ data: Object.values(map), backgroundColor: ['#ec4899', '#3b82f6', '#cbd5e1'], borderWidth: 0 }]
    };
  }, [reportes]);

  const edadData = useMemo(() => {
    const map = { '18-25': 0, '26-35': 0, '36-45': 0, '46+': 0, 'N/A': 0 };
    reportes.forEach(r => {
      const emp = globalEmpCache[r.attributes.id_empleado];
      const age = emp ? getAge(emp.birthday || emp.fecha_nacimiento) : null;
      if (age === null || isNaN(age)) map['N/A']++;
      else if (age <= 25) map['18-25']++;
      else if (age <= 35) map['26-35']++;
      else if (age <= 45) map['36-45']++;
      else map['46+']++;
    });
    const keys = Object.keys(map).filter(k => map[k] > 0);
    return {
      labels: keys,
      datasets: [{ data: keys.map(k => map[k]), backgroundColor: PALETTE[2], borderRadius: 4 }]
    };
  }, [reportes]);

  const antiguedadData = useMemo(() => {
    const map = { '0-1 año': 0, '1-3 años': 0, '3-5 años': 0, '5+ años': 0, 'N/A': 0 };
    reportes.forEach(r => {
      const emp = globalEmpCache[r.attributes.id_empleado];
      const t = emp ? getTenure(emp.ingreso || emp.fecha_ingreso) : null;
      if (t === null || isNaN(t)) map['N/A']++;
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
  }, [reportes]);

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

  const barOptionsH = { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { grid: { display: false }, ticks: { font: { size: 10 } } } } };
  const barOptionsV = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 11 } } }, y: { display: false } } };
  const doughnutOptions = { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } } };

  return (
    <div className="view-container active container">
      <div className="alert-banner" onClick={() => setFilter('Abierto')}>
        <AlertTriangle size={32} color="var(--red)" />
        <div className="alert-text">
          <strong>{abiertos} Casos Activos pendientes de revisión</strong>
          <p>Casos abiertos o nuevos requieren revisión o seguimiento constante.</p>
        </div>
      </div>

      <div className="kpis">
        <div className={`kpi ${filter === 'todos' ? 'active-filter' : ''}`} onClick={() => setFilter('todos')}>
          <div className="kpi-label">Total Reportes</div><div className="kpi-value">{total}</div>
        </div>
        <div className={`kpi abierto ${filter === 'Abierto' ? 'active-filter' : ''}`} onClick={() => setFilter('Abierto')}>
          <div className="kpi-label">Casos Activos</div><div className="kpi-value">{abiertos}</div>
        </div>
        <div className={`kpi cerrado ${filter === 'Cerrado' ? 'active-filter' : ''}`} onClick={() => setFilter('Cerrado')}>
          <div className="kpi-label">Casos Cerrados</div><div className="kpi-value">{cerrados}</div>
        </div>
        <div className={`kpi alerta ${filter === 'Prioritario' ? 'active-filter' : ''}`} onClick={() => setFilter('Prioritario')}>
          <div className="kpi-label">Atención Prioritaria</div><div className="kpi-value">{urgentes}</div>
        </div>
      </div>

      <div className="charts-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        <div className="chart-card"><div className="chart-title">Estado de Casos</div><div className="chart-wrap"><Doughnut data={estadoData} options={doughnutOptions} /></div></div>
        <div className="chart-card"><div className="chart-title">Acción Realizada</div><div className="chart-wrap"><Bar data={accData} options={barOptionsH} /></div></div>
        <div className="chart-card"><div className="chart-title">Sistema Afectado</div><div className="chart-wrap"><Bar data={sisData} options={barOptionsH} /></div></div>
        <div className="chart-card"><div className="chart-title">Por Género</div><div className="chart-wrap"><Doughnut data={generoData} options={doughnutOptions} /></div></div>
        <div className="chart-card"><div className="chart-title">Por Edad</div><div className="chart-wrap"><Bar data={edadData} options={barOptionsV} /></div></div>
        <div className="chart-card"><div className="chart-title">Por Antigüedad</div><div className="chart-wrap"><Bar data={antiguedadData} options={barOptionsV} /></div></div>
        <div className="chart-card"><div className="chart-title">Top Diagnósticos</div><div className="chart-wrap"><Bar data={diagData} options={barOptionsH} /></div></div>
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
                <th>ID Empleado</th>
                <th>Estado</th>
                <th>Categoría / Diag.</th>
                <th>Sistema</th>
                <th>Última Acción</th>
                <th>Fecha Reporte</th>
                <th>Seguimientos</th>
              </tr>
            </thead>
            <tbody>
              {filteredReportes.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>No se encontraron reportes.</td></tr>
              ) : (
                filteredReportes.map(r => {
                  const attr = r.attributes;
                  const segs = attr.sst_seguimientos?.data || [];
                  const lastSeg = segs.length > 0 ? segs[segs.length - 1].attributes : null;
                  const empData = globalEmpCache[attr.id_empleado];
                  
                  let estadoBadge = 'abierto';
                  let estadoLabel = 'Abierto';
                  if (attr.estado === false) { estadoBadge = 'cerrado'; estadoLabel = 'Cerrado'; }
                  else if (attr.estado === null) { estadoBadge = 'alerta'; estadoLabel = 'Nuevo'; }

                  return (
                    <tr key={r.id} onClick={() => setSelectedReporte(r)}>
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
                          <span className="dot"></span>{estadoLabel}
                        </span>
                      </td>
                      <td>{attr.categoria || 'N/A'}</td>
                      <td>{lastSeg?.sistema || <span style={{ color: 'var(--amber)', fontSize: '12px' }}>Pendiente</span>}</td>
                      <td>{lastSeg?.accion || '—'}</td>
                      <td style={{ fontSize: '13px' }}>{new Date(attr.createdAt).toLocaleDateString('es-CO')}</td>
                      <td>
                        {segs.length > 0
                          ? <span style={{ color: 'var(--green)', fontSize: '12px', fontWeight: 600 }}>✓ {segs.length} Seg.</span>
                          : <span style={{ color: 'var(--red)', fontSize: '12px', fontWeight: 600 }}>Sin Seg.</span>}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
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
        />
      )}
    </div>
  );
};

const SSTModal = ({ reporte, user, onClose, onRefresh, showToast, setLoading }) => {
  const attr = reporte.attributes;
  const [emp, setEmp] = useState(globalEmpCache[attr.id_empleado] || {});
  const [liderEmp, setLiderEmp] = useState({});
  const [, setSstUpdate] = useState(0); 

  const closed = isCaseClosed(attr.estado);
  const segs = attr.sst_seguimientos?.data || [];

  const [form, setForm] = useState({
    accion: '', sistema: '', temporalidad: '', descripcion: '', 
    estado: closed ? 'Cerrado' : 'Abierto'
  });

  useEffect(() => {
    const fetchDependencies = async () => {
      // Fetch Empleado Afectado
      const dataEmp = await fetchEmployee(attr.id_empleado); 
      if (dataEmp) setEmp(dataEmp);

      // Fetch Líder que reporta
      if (attr.id_lider) {
        const dataLider = await fetchEmployee(attr.id_lider);
        if (dataLider) setLiderEmp(dataLider);
      }

      // Fetch SSTs que hicieron seguimientos (para inyectar sus nombres)
      const sstIds = [...new Set(segs.map(s => s.attributes.id_sst).filter(Boolean))];
      await Promise.all(sstIds.map(async id => {
         if (!globalEmpCache[id]) await fetchEmployee(id);
      }));
      setSstUpdate(prev => prev + 1); // Forzar re-render para mostrar nombres
    };
    fetchDependencies();
  }, [attr.id_empleado, attr.id_lider, segs]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const ageVal = getAge(emp.birthday || emp.fecha_nacimiento);
  const edadCalc = ageVal !== null ? `${ageVal} años` : 'N/A';
  const imcCalc = calcularIMC(attr.peso_kg, attr.talla_m);

  const getFullUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url; // Si ya viene de Cloudinary completo, lo usa directo
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
        temporalidad: form.temporalidad,
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
      const nuevoEstadoBool = form.estado === 'Abierto'; 

      await fetch(`${API_REPORTES}/${reporte.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: { estado: nuevoEstadoBool, sst_seguimientos: existingSegs }
        })
      });

      showToast('Seguimiento guardado exitosamente');
      setForm({ accion: '', sistema: '', temporalidad: '', descripcion: '', estado: nuevoEstadoBool ? 'Abierto' : 'Cerrado' });
      await onRefresh();

    } catch (e) {
      showToast(`Error al guardar: ${e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  let estadoBadge = 'abierto'; let estadoLabel = 'Abierto';
  if (attr.estado === false) { estadoBadge = 'cerrado'; estadoLabel = 'Cerrado'; }
  else if (attr.estado === null) { estadoBadge = 'alerta'; estadoLabel = 'Nuevo'; }

  return (
    <div className="modal-overlay" onClick={(e) => e.target.className === 'modal-overlay' && onClose()}>
      <div className="slide-over-modal">
        <div className="slide-panel-left">
          {emp.foto ? (
             <img src={emp.foto} alt="foto emp" className="profile-avatar" onError={(e) => { e.target.src = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2NjbSI+PHBhdGggZD0iTTEyIDJjNS41MiAwIDEwIDQuNDggMTAgMTBzLTQuNDggMTAtMTAgMTBTMiAxNy41MiAyIDEyIDYuNDggMiAxMiAyem0wIDE4YzQuNDEgMCA4LTMuNTkgOC04cy0zLjU5LTgtOC04LTggMy41OS04IDggMy41OSA4IDggOHptMC0xNGMyLjIxIDAgNCAxLjc5 NCA0cy0xLjc5IDQtNCA0LTQtMS43OS00LTQgMS43OS00IDQtNHptMCA2YzIuNjcgMCA4IDEuMzQgOCA0djJIMDR2LTJjMC0yLjY2IDUuMzMtNCA4LTR6Ii8+PC9zdmc+" }} />
          ) : (
             <div style={{display: 'flex', justifyContent: 'center', marginBottom: '16px'}}>
               <CircleUserRound size={100} color="var(--muted)" strokeWidth={1} />
             </div>
          )}
          
          <div className="profile-name">{emp.nombre || 'Cargando...'}</div>
          <div className="profile-role">{attr.id_empleado}</div>

          <div className="info-grid">
            <div className="info-item"><span className="info-label">Nacimiento</span><span className="info-value">{emp.birthday || emp.fecha_nacimiento || 'N/A'} ({edadCalc})</span></div>
            <div className="info-item"><span className="info-label">Género</span><span className="info-value">{attr.genero || emp.genero || 'N/A'}</span></div>
            <div className="info-item"><span className="info-label">Ingreso</span><span className="info-value">{emp.ingreso || emp.fecha_ingreso || 'N/A'}</span></div>
            <div className="info-item"><span className="info-label">Celular</span><span className="info-value">{emp.Celular || emp.celular || emp.telefono || 'N/A'}</span></div>
            <div className="info-item full"><span className="info-label">Correo</span><span className="info-value">{emp.correo || emp.email || 'N/A'}</span></div>
            <div className="info-item full"><span className="info-label">Cargo</span><span className="info-value">{emp.cargo || 'N/A'}</span></div>
            <div className="info-item"><span className="info-label">Área</span><span className="info-value">{emp.area_nombre || emp.area || 'N/A'}</span></div>
            <div className="info-item"><span className="info-label">Depto</span><span className="info-value">{emp.departamento || 'N/A'}</span></div>
            <div className="info-item full"><span className="info-label">Dirección</span><span className="info-value">{emp.direction || emp.direccion || 'N/A'}</span></div>
            <div className="info-item"><span className="info-label">Peso</span><span className="info-value">{attr.peso_kg ? `${attr.peso_kg} kg` : 'N/A'}</span></div>
            <div className="info-item"><span className="info-label">Talla</span><span className="info-value">{attr.talla_m ? `${attr.talla_m} m` : 'N/A'}</span></div>
            <div className="info-item full"><span className="info-label">IMC</span><span className="info-value">{imcCalc}</span></div>
          </div>
        </div>

        <div className="slide-panel-right">
          <button className="modal-close" onClick={onClose}><X size={20} /></button>

          <div className="slide-panel-history">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 700 }}>Reporte #{reporte.id}</h2>
              <span className={`status-badge ${estadoBadge}`} style={attr.estado === null ? { background: 'rgba(245, 158, 11, 0.1)', color: 'var(--amber)' } : {}}>
                <span className="dot"></span>{estadoLabel}
              </span>
            </div>
            
            <div style={{ background: 'var(--surface2)', padding: '16px', borderRadius: '8px', marginBottom: '32px' }}>
              <div style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CircleUserRound size={16} color="var(--muted)"/>
                <span style={{ fontSize: '13px', color: 'var(--text2)' }}>
                  <strong>Reportado por:</strong> {liderEmp.nombre}
                </span>
              </div>
              <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text)' }}>
                Se registra un reporte en la categoría <strong>{attr.categoria || 'N/A'}</strong>,
                asociado a la entidad <strong>{attr.entidad_cargo || 'N/A'}: {attr.nombre_entidad || 'N/A'}</strong>,
                con fecha de reporte inicial <strong>{new Date(attr.createdAt).toLocaleString('es-CO')}</strong>.
                De acuerdo con la información suministrada en la descripción del evento, se reporta: <strong>{attr.descripcion || 'Sin descripción inicial.'}</strong>
              </p>
              
              {/* Botón para abrir el PDF */}
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
                <div style={{ color: 'var(--amber)', background: 'rgba(245, 158, 11, 0.1)', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                  <strong>No hay seguimientos registrados aún para esta novedad</strong>
                </div>
              ) : (
                segs.slice().reverse().map(s => {
                  const sa = s.attributes;
                  const sstDetails = globalEmpCache[sa.id_sst];
                  return (
                    <div key={s.id} className="followup-item" style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '16px', borderRadius: '8px', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>
                          {new Date(sa.createdAt).toLocaleString('es-CO')}
                        </div>
                        
                        <div style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 600, background: 'var(--surface2)', padding: '2px 8px', borderRadius: '12px' }}>
                          <CircleUserRound size={16} color="var(--muted)"/><strong> Seguimiento por:</strong> {sstDetails.nombre}
                        </div>
                      </div>
                      <p style={{ fontSize: '14px', lineHeight: '1.6', marginBottom: '8px' }}>
                        <strong>Detalle:</strong> {sa.descripcion || 'Sin descripción.'}
                      </p>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11px', background: 'var(--surface2)', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>{sa.accion || 'N/A'}</span>
                        <span style={{ fontSize: '11px', background: 'var(--surface2)', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>{sa.sistema || 'N/A'}</span>
                        {sa.temporalidad && <span style={{ fontSize: '11px', background: 'var(--surface2)', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>{sa.temporalidad}</span>}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <div className="slide-panel-form">
            <div className="section-title" style={{ marginTop: 0 }}>Agregar Nuevo Seguimiento</div>
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
              <div className="form-group"><label className="form-label">Temporalidad</label><input type="text" name="temporalidad" className="form-control" placeholder="Ej: 1 mes..." value={form.temporalidad} onChange={handleChange} /></div>
              <div className="form-group">
                <label className="form-label">Actualizar Estado</label>
                <select name="estado" className="form-control" value={form.estado} onChange={handleChange}>
                  <option value="Abierto">Mantener Abierto (En seguimiento)</option>
                  <option value="Cerrado">Cerrar Caso</option>
                </select>
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Descripción</label><textarea name="descripcion" className="form-control" rows="2" placeholder="Detalle la gestión realizada..." value={form.descripcion} onChange={handleChange}></textarea></div>
            </div>
            <div style={{ textAlign: 'right', marginTop: '16px' }}>
              <button className="btn btn-primary" onClick={handleSubmit}><Save size={16} /> Guardar Seguimiento</button>
            </div>
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

  const showToast = (msg, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  };

  const handleLogout = () => { setUser(null); setRole(null); };

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
            <LiderView user={user} showToast={showToast} setLoading={setLoading} />
          ) : (
            <SSTDashboard user={user} showToast={showToast} setLoading={setLoading} />
          )}
        </>
      )}
    </>
  );
}
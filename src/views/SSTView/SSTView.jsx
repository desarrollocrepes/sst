import React, { useState, useEffect, useMemo } from 'react';
import './SSTView.css';
import { 
  AlertTriangle, X, Save, RefreshCw, CircleUserRound, FileText, 
  ChevronDown, ChevronUp, Clock, AlertCircle, BarChart3, CheckCircle, 
  AlertOctagon, TrendingUp, Zap 
} from 'lucide-react';
import { 
  API_REPORTES, API_SEGUIMIENTOS, fetchEmployeeData, 
  getStrapiErrorMessage, getAge, getTenure, calcularIMC 
} from '../../utils/apiHelpers';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, 
  PieChart, Pie, Cell, Legend as RechartsLegend, LabelList
} from 'recharts';

// ============================================================================
// FUNCIONES AUXILIARES (LÓGICA PURA)
// ============================================================================

const getFullUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url; 
  return `https://macfer.crepesywaffles.com${url}`;
};

const getTemporalidadInfo = (segs, today) => {
  const ultimoConTemp = segs.slice().reverse().find(s => s.attributes?.temporalidad);
  if (!ultimoConTemp) return { vencida: false, stringDate: null, dateObj: null };
  
  const stringDate = ultimoConTemp.attributes.temporalidad;
  const tempDate = new Date(`${stringDate}T00:00:00`);
  const vencida = !isNaN(tempDate.getTime()) && tempDate < today;
  
  return { vencida, stringDate, dateObj: tempDate };
};

const getEstadoInfo = (estadoActual, temporalidadVencida) => {
  const displayEstado = (estadoActual === false || temporalidadVencida) ? false : estadoActual;
  let badge = 'alerta';
  let label = 'En seguimiento';
  
  if (displayEstado === true) { 
    badge = 'abierto'; 
    label = 'Abierto'; 
  } else if (displayEstado === false) { 
    badge = 'cerrado'; 
    label = 'Cerrado'; 
  }
  
  return { displayEstado, badge, label };
};

// ============================================================================
// COMPONENTES COMPARTIDOS
// ============================================================================

const ProgressCircle = ({ porcentaje, color, label }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
    <div style={{
      position: 'relative', width: '90px', height: '90px', borderRadius: '50%',
      background: `conic-gradient(${color} ${porcentaje}%, #e2e8f0 0)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{ position: 'absolute', width: '70px', height: '70px', backgroundColor: '#ffffff', borderRadius: '50%' }}></div>
      <span style={{ position: 'relative', zIndex: 1, fontSize: '15px', fontWeight: 700, color: '#334155' }}>
        {porcentaje}%
      </span>
    </div>
    <div style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>{label}</div>
  </div>
);

const BMILinearGauge = ({ imc }) => {
  const numImc = parseFloat(imc);
  if (isNaN(numImc)) return <span style={{ fontWeight: 700, color: 'var(--accent)' }}>No aplica</span>;

  let position = 0;
  let label = '';
  
  if (numImc < 18.5) {
    position = Math.max(0, ((numImc - 10) / 8.5) * 25);
    label = 'Bajo peso';
  } else if (numImc < 25) {
    position = 25 + ((numImc - 18.5) / 6.5) * 25;
    label = 'Normal';
  } else if (numImc < 30) {
    position = 50 + ((numImc - 25) / 5) * 25;
    label = 'Sobrepeso';
  } else {
    position = 75 + Math.min(25, ((numImc - 30) / 10) * 25);
    label = 'Obesidad';
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px' }}>
        <span className="info-label">IMC</span>
        <span className="info-value" style={{ textAlign: 'right' }}>{numImc.toFixed(1)} - {label}</span>
      </div>
      <div style={{ position: 'relative', width: '100%', height: '8px', marginBottom: '2px' }}>
        <div style={{
          position: 'absolute', top: '0', left: `calc(${position}% - 6px)`,
          width: '0', height: '0',
          borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '8px solid #1e293b',
          transition: 'left 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
        }}></div>
      </div>
      <div style={{ width: '100%', height: '10px', borderRadius: '6px', display: 'flex', overflow: 'hidden', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ flex: 1, background: '#3b82f6' }}></div>
        <div style={{ flex: 1, background: '#10b981' }}></div>
        <div style={{ flex: 1, background: '#f97316' }}></div>
        <div style={{ flex: 1, background: '#ef4444' }}></div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--muted)', marginTop: '4px', fontWeight: 600 }}>
        <span style={{width: '28%', textAlign: 'right'}}>18.5</span>
        <span style={{width: '10%', textAlign: 'right'}}>24.9</span>
        <span style={{width: '30%'}}>29.9</span>
      </div>
    </div>
  );
};

// ============================================================================
// COMPONENTES DEL MODAL (SSTModal)
// ============================================================================

const EmployeeSidebar = ({ emp, attr, edadCalc, imcCalc }) => (
  <div className="slide-panel-left" style={{ background: '#ffffff', padding: '24px' }}>
    <div style={{ textAlign: 'center' }}>
      {emp.foto ? (
        <img src={emp.foto} alt="foto emp" style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #f1f5f9', margin: '0 auto 16px' }} />
      ) : (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <CircleUserRound size={100} color="var(--muted)" strokeWidth={1} />
        </div>
      )}
      
      <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>{emp.nombre || attr.id_empleado}</div>
      <div style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 600 }}>{attr.id_empleado}</div>
      <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '14px', fontWeight: 600 }}>{attr.genero || emp.genero || 'No aplica'}</div>

      <div className="info-grid" style={{ textAlign: 'left', gridTemplateColumns: '1fr', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
          <span className="info-label">Área <br /> Cargo</span>
          <span className="info-value" style={{ textAlign: 'right' }}>{emp.area_nombre || emp.area || 'No aplica'} <br /> {emp.cargo || 'No aplica'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
          <span className="info-label">Dirección <br /> Departamento</span>
          <span className="info-value" style={{ textAlign: 'right' }}>{emp.direction || emp.direccion || 'No aplica'} <br /> {emp.departamento || 'No aplica'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
          <span className="info-label">Nacimiento</span>
          <span className="info-value" style={{ textAlign: 'right' }}>{emp.birthday ||'No aplica'} ({edadCalc})</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
          <span className="info-label">Ingreso</span>
          <span className="info-value" style={{ textAlign: 'right' }}>{emp.ingreso || emp.fecha_ingreso || 'No aplica'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
          <span className="info-label">Correo <br /> Celular</span>
          <span className="info-value" style={{ textAlign: 'right' }}>{emp.correo || emp.email || 'No aplica'} <br /> {emp.Celular || emp.celular || emp.telefono || 'No aplica'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
          <span className="info-label">Peso <br /> Talla</span>
          <span className="info-value" style={{ textAlign: 'right' }}>{attr.peso_kg ? `${attr.peso_kg}kg` : '-'} <br /> {attr.talla_m ? `${attr.talla_m}m` : '-'}</span>
        </div>
        {attr.peso_kg && attr.talla_m && (
          <div><BMILinearGauge imc={imcCalc} /></div>
        )}
      </div>
    </div>
  </div>
);

const SSTModal = ({ reporte, user, onClose, onRefresh, showToast, setLoading, empCache, setEmpCache }) => {
  const attr = reporte.attributes;
  const [emp, setEmp] = useState(empCache[attr.id_empleado] || {});
  const [liderEmp, setLiderEmp] = useState({});
  const [, setSstUpdate] = useState(0); 
  const [isFormOpen, setIsFormOpen] = useState(false);

  const segs = attr.sst_seguimientos?.data || [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [form, setForm] = useState({
    accion: '', sistema: '', temporalidad: '', descripcion: '', 
    estado: attr.estado === false ? 'Cerrado' : 'null',
    peso: attr.peso_kg || '', talla: attr.talla_m || ''
  });

  const validEmployeeId = (value) => {
    const normalized = String(value ?? '').trim();
    return Boolean(normalized) && /^\d+$/.test(normalized) && normalized !== 'SISTEMA';
  };

  const sstIds = useMemo(() => {
    return [...new Set(segs.map(s => s.attributes?.id_sst).filter(Boolean).filter(validEmployeeId))];
  }, [segs]);

  useEffect(() => {
    const fetchDependencies = async () => {
      let currentEmp = empCache[attr.id_empleado];
      if (validEmployeeId(attr.id_empleado) && !currentEmp) {
         currentEmp = await fetchEmployeeData(attr.id_empleado);
         if (currentEmp) {
           setEmpCache(prev => ({...prev, [attr.id_empleado]: currentEmp}));
           setEmp(currentEmp);
         }
      } else if (currentEmp) {
         setEmp(currentEmp);
      }

      if (validEmployeeId(attr.id_lider)) {
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

      if (sstIds.length > 0) {
        const uncachedSst = sstIds.filter(id => !empCache[id]);
        if (uncachedSst.length > 0) {
          const newEmps = {};
          await Promise.all(uncachedSst.map(async id => {
             const d = await fetchEmployeeData(id);
             if (d) newEmps[id] = d;
          }));
          setEmpCache(prev => ({...prev, ...newEmps}));
        }
      }
      setSstUpdate(prev => prev + 1); 
    };
    fetchDependencies();
  }, [attr.id_empleado, attr.id_lider, sstIds.join(','), setEmpCache]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const ageVal = getAge(emp.birthday || emp.fecha_nacimiento);
  const edadCalc = ageVal !== null ? `${ageVal} años` : 'No aplica';
  const imcCalc = calcularIMC(attr.peso_kg, attr.talla_m);

  const { vencida: isTemporalidadVencida, stringDate: vencidaDate } = useMemo(() => getTemporalidadInfo(segs, today), [segs, today]);
  const { badge: estadoBadge, label: estadoLabel, displayEstado } = getEstadoInfo(attr.estado, isTemporalidadVencida);

  const latestSeguimiento = useMemo(() => segs.length ? segs[segs.length - 1] : null, [segs]);

  const noticeInfo = useMemo(() => {
    if (latestSeguimiento?.attributes?.descripcion?.includes('Cierre manual')) {
      return { type: 'info', title: 'Caso cerrado manualmente', text: `Cerrado por ${user?.nombre || 'un SST'} (${user?.document_number || 'No aplica'}).` };
    }
    if (isTemporalidadVencida && attr.estado !== false) {
      return { type: 'error', title: 'Caso cerrado automáticamente', text: `Se cerró automáticamente porque la temporalidad venció el ${vencidaDate}.` };
    }
    return null;
  }, [latestSeguimiento, isTemporalidadVencida, attr.estado, vencidaDate, user]);

  const handleSubmit = async () => {
    if (!form.accion || !form.sistema || !form.descripcion.trim()) {
      return showToast('Acción, Sistema y Descripción son obligatorios', 'error');
    }

    setLoading(true);
    try {
      const isManualClosure = form.estado === 'Cerrado';
      const closureText = isManualClosure ? `Cierre manual del caso por ${user?.nombre || 'SST'} (${user?.document_number || 'No aplica'}).` : '';
      const finalDescription = isManualClosure ? `${form.descripcion}\n\n${closureText}`.trim() : form.descripcion;

      const segPayload = {
        descripcion: finalDescription,
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
      
      let nuevoEstadoValue = form.estado === 'Abierto' ? true : form.estado === 'Cerrado' ? false : null;
      
      const updatePayload = {
        estado: nuevoEstadoValue, 
        sst_seguimientos: [...segs.map(s => s.id), segJson.data.id]
      };
      if (form.peso) updatePayload.peso_kg = parseFloat(form.peso);
      if (form.talla) updatePayload.talla_m = parseFloat(form.talla);

      await fetch(`${API_REPORTES}/${reporte.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: updatePayload })
      });

      showToast('Seguimiento guardado exitosamente');
      setForm({ ...form, accion: '', sistema: '', temporalidad: '', descripcion: '' });
      setIsFormOpen(false);
      await onRefresh();

    } catch (e) {
      showToast(`Error al guardar: ${e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    
  );
};

// ============================================================================
// DASHBOARD (SSTDashboard)
// ============================================================================

const COFFEE_PALETTE = [
  '#3E2723', // Café muy oscuro
  '#5D4037', // Marrón oscuro
  '#795548', // Marrón medio
  '#8D6E63', // Marrón claro / Mocha
  '#A1887F', // Café con leche
  '#BCAAA4', // Latte cálido
  '#D7CCC8'  // Crema
];

const SSTDashboard = ({ user, showToast, setLoading, empCache, setEmpCache }) => {
  const [reportes, setReportes] = useState([]);
  const [filter, setFilter] = useState('todos');
  const [search, setSearch] = useState('');
  const [selectedReporte, setSelectedReporte] = useState(null);

  const [filtroAtendidos, setFiltroAtendidos] = useState(false);
  const [filtroAccion, setFiltroAccion] = useState('');
  const [filtroSistema, setFiltroSistema] = useState('');
  const [filtroDiagnostico, setFiltroDiagnostico] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  
  const limitProximos = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 5);
    return d;
  }, [today]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_REPORTES}?populate=*&publicationState=preview`);
      if (!res.ok) throw new Error('API Error');
      let json = await res.json();
      let sorted = json.data.sort((a, b) => new Date(b.attributes.createdAt) - new Date(a.attributes.createdAt));
      
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
  useEffect(() => { setCurrentPage(1); }, [filter, search, filtroAtendidos, filtroAccion, filtroSistema, filtroDiagnostico]);

  // Pre-procesamiento de datos y estados
  const reportesConMeta = useMemo(() => {
    return reportes.map(r => {
      const attr = r.attributes;
      const segs = attr.sst_seguimientos?.data || [];
      const { vencida, dateObj, ultimoConTemp } = getTemporalidadInfo(segs, today);
      const { displayEstado } = getEstadoInfo(attr.estado, vencida);
      
      return { 
        ...r, 
        displayEstado, 
        temporalidadVencida: vencida, 
        temporalidadDate: dateObj, 
        ultimoConTemp 
      };
    });
  }, [reportes, today]);

  // Cálculo de KPIs
  const stats = useMemo(() => {
    let t = reportesConMeta.length;
    let ab = 0, cer = 0, seg = 0, ven = 0, prox = 0;

    reportesConMeta.forEach(r => {
      if (r.displayEstado === true) ab++;
      else if (r.displayEstado === false) cer++;
      else seg++;

      if (r.temporalidadDate) {
        if (r.temporalidadDate < today) ven++;
        else if (r.temporalidadDate <= limitProximos) prox++;
      }
    });
    return { t, ab, cer, seg, ven, prox };
  }, [reportesConMeta, today, limitProximos]);

  const filteredReportes = useMemo(() => {
    let filtered = reportesConMeta;
    
    if (filter === 'Abierto') filtered = filtered.filter(r => r.displayEstado === true);
    else if (filter === 'Cerrado') filtered = filtered.filter(r => r.displayEstado === false);
    else if (filter === 'En seguimiento') filtered = filtered.filter(r => r.displayEstado === null);
    else if (filter === 'Vencidos') filtered = filtered.filter(r => r.temporalidadVencida);
    else if (filter === 'Proximos') filtered = filtered.filter(r => r.temporalidadDate && r.temporalidadDate >= today && r.temporalidadDate <= limitProximos);

    if (filtroAtendidos) {
      filtered = filtered.filter(r => (r.attributes.sst_seguimientos?.data || []).some(s => s.attributes.id_sst === user.document_number.toString()));
    }
    if (filtroAccion) {
      filtered = filtered.filter(r => (r.attributes.sst_seguimientos?.data || []).some(s => s.attributes.accion === filtroAccion));
    }
    if (filtroSistema) {
      filtered = filtered.filter(r => (r.attributes.sst_seguimientos?.data || []).some(s => s.attributes.sistema === filtroSistema));
    }
    if (filtroDiagnostico) {
      filtered = filtered.filter(r => r.attributes.categoria === filtroDiagnostico);
    }
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(r => {
        const attr = r.attributes;
        const empName = empCache[attr.id_empleado]?.nombre || '';
        return (attr.id_empleado && attr.id_empleado.includes(s)) || empName.toLowerCase().includes(s) || (attr.categoria || '').toLowerCase().includes(s);
      });
    }
    return filtered;
  }, [reportesConMeta, filter, search, empCache, today, limitProximos, filtroAtendidos, filtroAccion, filtroSistema, filtroDiagnostico, user.document_number]);

  const totalPages = Math.ceil(filteredReportes.length / itemsPerPage);
  const currentItems = filteredReportes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // ============================================================================
  // CÁLCULO DE GRÁFICOS
  // ============================================================================

  const imcStats = useMemo(() => {
    let total = 0, bajo = 0, normal = 0, sobrepeso = 0, obesidad = 0;
    reportes.forEach(r => {
       const p = parseFloat(r.attributes.peso_kg);
       const t = parseFloat(r.attributes.talla_m);
       if(p && t) {
          const imc = p / (t * t);
          total++;
          if(imc < 18.5) bajo++; else if(imc < 25) normal++; else if(imc < 30) sobrepeso++; else obesidad++;
       }
    });
    return {
       bajo: total ? Math.round((bajo/total)*100) : 0, normal: total ? Math.round((normal/total)*100) : 0,
       sobrepeso: total ? Math.round((sobrepeso/total)*100) : 0, obesidad: total ? Math.round((obesidad/total)*100) : 0,
    }
  }, [reportes]);
  
  const getRechartsData = (mapCallback, sliceAmount = 5) => {
    const map = {};
    reportes.forEach(mapCallback(map));
    
    let entries = Object.entries(map);
    if (sliceAmount) {
      entries = entries.sort((a, b) => b[1] - a[1]).slice(0, sliceAmount);
    } else {
      entries = entries.filter(([, val]) => val > 0);
    }
    
    return entries.map(([name, value]) => ({ name, value }));
  };

  const estadoData = useMemo(() => {
    const map = { 'Abierto': 0, 'Cerrado': 0, 'En seg.': 0 };
    reportesConMeta.forEach(r => map[r.displayEstado === false ? 'Cerrado' : r.displayEstado === true ? 'Abierto' : 'En seg.']++);
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [reportesConMeta]);

  const accData = useMemo(() => getRechartsData(map => r => {
    const segs = r.attributes.sst_seguimientos?.data || [];
    const acc = segs.length > 0 ? (segs[segs.length - 1].attributes.accion || 'Otro') : 'Pendiente';
    map[acc] = (map[acc] || 0) + 1;
  }, 5), [reportes]);

  const sisData = useMemo(() => getRechartsData(map => r => {
    const segs = r.attributes.sst_seguimientos?.data || [];
    const sys = segs.length > 0 ? (segs[segs.length - 1].attributes.sistema || 'Otro') : 'Sin Asignar';
    map[sys] = (map[sys] || 0) + 1;
  }, 5), [reportes]);

  const generoData = useMemo(() => {
    const map = { 'Mujer': 0, 'Hombre': 0, 'Sin Asig.': 0 };
    reportes.forEach(r => {
      const g = r.attributes.genero || (empCache[r.attributes.id_empleado]?.genero) || '';
      if (g.toLowerCase().startsWith('m') && g !== 'Mujer') map['Hombre']++;
      else if (g === 'Mujer' || g === 'Femenino') map['Mujer']++;
      else if (g === 'Hombre' || g === 'Masculino') map['Hombre']++;
      else map['Sin Asig.']++;
    });
    return Object.entries(map).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
  }, [reportes, empCache]);

  const edadData = useMemo(() => getRechartsData(map => r => {
    const emp = empCache[r.attributes.id_empleado];
    const age = emp ? getAge(emp.birthday || emp.fecha_nacimiento) : null;
    if (age !== null && !isNaN(age)) {
      if (age <= 9) map['0-9'] = (map['0-9'] || 0) + 1; else if (age <= 19) map['10-19'] = (map['10-19'] || 0) + 1;
      else if (age <= 29) map['20-29'] = (map['20-29'] || 0) + 1; else if (age <= 39) map['30-39'] = (map['30-39'] || 0) + 1;
      else if (age <= 49) map['40-49'] = (map['40-49'] || 0) + 1; else if (age <= 59) map['50-59'] = (map['50-59'] || 0) + 1;
      else map['60+'] = (map['60+'] || 0) + 1;
    }
  }, null), [reportes, empCache]);

  const antiguedadData = useMemo(() => getRechartsData(map => r => {
    const emp = empCache[r.attributes.id_empleado];
    const t = emp ? getTenure(emp.ingreso || emp.fecha_ingreso) : null;
    if (t === null || isNaN(t)) map['No aplica'] = (map['No aplica'] || 0) + 1;
    else if (t <= 1) map['0-1 año'] = (map['0-1 año'] || 0) + 1; else if (t <= 3) map['1-3 años'] = (map['1-3 años'] || 0) + 1;
    else if (t <= 5) map['3-5 años'] = (map['3-5 años'] || 0) + 1; else map['5+ años'] = (map['5+ años'] || 0) + 1;
  }, null), [reportes, empCache]);

  const diagData = useMemo(() => getRechartsData(map => r => { 
    const c = r.attributes.categoria || 'Sin Diagnóstico'; map[c] = (map[c] || 0) + 1; 
  }, 5), [reportes]);

  const entidadData = useMemo(() => getRechartsData(map => r => {
    const ent = r.attributes.entidad_cargo;
    map[ent === 'EPS' ? 'EPS' : ent === 'ARL' ? 'ARL' : ent === 'Medicina Prepagada' ? 'Medicina P.' : 'Otra'] = (map[ent] || 0) + 1;
  }, null), [reportes]);
  
  // ============================================================================
  // RENDER PRINCIPAL
  // ============================================================================
  return (
    <div className="view-container active container">
      <div className="kpis">
        {[{ label: 'Total', value: stats.t, id: 'todos', cls: '' }, { label: 'Abiertos', value: stats.ab, id: 'Abierto', cls: 'abierto' }, { label: 'Cerrados', value: stats.cer, id: 'Cerrado', cls: 'cerrado' }, { label: 'En Seguimiento', value: stats.seg, id: 'En seguimiento', cls: 'alerta' }, { label: 'Vencidos', value: stats.ven, id: 'Vencidos', cls: 'vencido' }].map(kpi => (
          <div key={kpi.id} className={`kpi ${kpi.cls} ${filter === kpi.id ? 'active-filter' : ''}`} onClick={() => setFilter(kpi.id)}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
              <div><div className="kpi-label">{kpi.label}</div><div className="kpi-value">{kpi.value}</div></div>
            </div>
          </div>
        ))}
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h3 className="chart-title">IMC</h3>
          <div style={{ display: 'flex',  alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
            {/* Usamos el color #5D4037 de la nueva paleta para los círculos */}
            <ProgressCircle porcentaje={imcStats.bajo} color="#5D4037" label="Bajo Peso" />
            <ProgressCircle porcentaje={imcStats.normal} color="#795548" label="Normal" />
            <ProgressCircle porcentaje={imcStats.sobrepeso} color="#A1887F" label="Sobrepeso" />
            <ProgressCircle porcentaje={imcStats.obesidad} color="#3E2723" label="Obesidad" />
          </div>
        </div>

        {/* GRÁFICO DE DONA: ESTADO */}
        <div className="chart-card">
          <div className="chart-title">Estado de Casos</div>
          <div className="chart-wrap" style={{ height: '220px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={estadoData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={2}>
                  {estadoData.map((entry, index) => <Cell key={`cell-${index}`} fill={COFFEE_PALETTE[index % COFFEE_PALETTE.length]} />)}
                </Pie>
                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                <RechartsLegend wrapperStyle={{ fontSize: '12px', marginTop: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRÁFICO BARRAS VERTICALES: ENTIDAD */}
        <div className="chart-card">
          <div className="chart-title">Por Entidad</div>
          <div className="chart-wrap" style={{ height: '220px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={entidadData} margin={{ top: 20, right: 0, left: -25, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <RechartsTooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} contentStyle={{ borderRadius: '8px', border: 'none' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {entidadData.map((entry, index) => <Cell key={`cell-${index}`} fill={COFFEE_PALETTE[index % COFFEE_PALETTE.length]} />)}
                  <LabelList dataKey="value" position="top" style={{ fontSize: '11px', fill: '#475569', fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRÁFICO BARRAS VERTICALES: EDAD */}
        <div className="chart-card">
          <div className="chart-title">Por Edad</div>
          <div className="chart-wrap" style={{ height: '220px' }}>
             <ResponsiveContainer width="100%" height="100%">
              <BarChart data={edadData} margin={{ top: 20, right: 0, left: -25, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <RechartsTooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} contentStyle={{ borderRadius: '8px', border: 'none' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {edadData.map((entry, index) => <Cell key={`cell-${index}`} fill={COFFEE_PALETTE[index % COFFEE_PALETTE.length]} />)}
                  <LabelList dataKey="value" position="top" style={{ fontSize: '11px', fill: '#475569', fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRÁFICO BARRAS HORIZONTALES: ACCIÓN */}
        <div className="chart-card">
          <div className="chart-title">Acción Realizada</div>
          <div className="chart-wrap" style={{ height: '220px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={accData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} width={90} axisLine={false} tickLine={false} />
                <RechartsTooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} contentStyle={{ borderRadius: '8px', border: 'none' }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                  {accData.map((entry, index) => <Cell key={`cell-${index}`} fill={COFFEE_PALETTE[index % COFFEE_PALETTE.length]} />)}
                  <LabelList dataKey="value" position="right" style={{ fontSize: '11px', fill: '#475569', fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRÁFICO BARRAS HORIZONTALES: SISTEMA */}
        <div className="chart-card">
          <div className="chart-title">Sistema Afectado</div>
          <div className="chart-wrap" style={{ height: '220px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sisData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} width={90} axisLine={false} tickLine={false} />
                <RechartsTooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} contentStyle={{ borderRadius: '8px', border: 'none' }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                  {sisData.map((entry, index) => <Cell key={`cell-${index}`} fill={COFFEE_PALETTE[index % COFFEE_PALETTE.length]} />)}
                  <LabelList dataKey="value" position="right" style={{ fontSize: '11px', fill: '#475569', fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRÁFICO DE DONA: GÉNERO */}
        <div className="chart-card">
          <div className="chart-title">Por Género</div>
          <div className="chart-wrap" style={{ height: '220px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={generoData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={2}>
                  {generoData.map((entry, index) => <Cell key={`cell-${index}`} fill={COFFEE_PALETTE[index % COFFEE_PALETTE.length]} />)}
                </Pie>
                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                <RechartsLegend wrapperStyle={{ fontSize: '12px', marginTop: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRÁFICO BARRAS VERTICALES: ANTIGÜEDAD */}
        <div className="chart-card">
          <div className="chart-title">Por Antigüedad</div>
          <div className="chart-wrap" style={{ height: '220px' }}>
             <ResponsiveContainer width="100%" height="100%">
              <BarChart data={antiguedadData} margin={{ top: 20, right: 0, left: -25, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <RechartsTooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} contentStyle={{ borderRadius: '8px', border: 'none' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {antiguedadData.map((entry, index) => <Cell key={`cell-${index}`} fill={COFFEE_PALETTE[index % COFFEE_PALETTE.length]} />)}
                  <LabelList dataKey="value" position="top" style={{ fontSize: '11px', fill: '#475569', fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRÁFICO BARRAS HORIZONTALES: DIAGNÓSTICOS */}
        <div className="chart-card">
          <div className="chart-title">Top Diagnósticos</div>
          <div className="chart-wrap" style={{ height: '220px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={diagData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} width={90} axisLine={false} tickLine={false} />
                <RechartsTooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} contentStyle={{ borderRadius: '8px', border: 'none' }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                  {diagData.map((entry, index) => <Cell key={`cell-${index}`} fill={COFFEE_PALETTE[index % COFFEE_PALETTE.length]} />)}
                  <LabelList dataKey="value" position="right" style={{ fontSize: '11px', fill: '#475569', fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="cases-section">
        <div className="cases-header" style={{flexDirection: 'column', alignItems: 'flex-start', gap: '16px'}}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', width: '100%' }}>
            <button className="btn btn-outline" onClick={loadData}><RefreshCw size={14} /> Actualizar</button>
            <input type="text" className="form-control search-box" placeholder="Buscar por cédula..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <button className={`btn ${filtroAtendidos ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFiltroAtendidos(!filtroAtendidos)}>
              {filtroAtendidos ? 'Mostrando Mis Casos Atendidos' : 'Filtrar Mis Casos Atendidos'}
            </button>
            <select className="form-control" style={{ flex: 1, minWidth: '160px' }} value={filtroAccion} onChange={(e) => setFiltroAccion(e.target.value)}>
              <option value="">Acción (Todas)</option>
              {Array.from(new Set(reportes.flatMap(r => r.attributes.sst_seguimientos?.data?.map(s => s.attributes.accion) || []).filter(Boolean))).map(acc => <option key={acc} value={acc}>{acc}</option>)}
            </select>
            <select className="form-control" style={{ flex: 1, minWidth: '160px' }} value={filtroSistema} onChange={(e) => setFiltroSistema(e.target.value)}>
              <option value="">Sistema (Todos)</option>
              {Array.from(new Set(reportes.flatMap(r => r.attributes.sst_seguimientos?.data?.map(s => s.attributes.sistema) || []).filter(Boolean))).map(sys => <option key={sys} value={sys}>{sys}</option>)}
            </select>
            <select className="form-control" style={{ flex: 1, minWidth: '160px' }} value={filtroDiagnostico} onChange={(e) => setFiltroDiagnostico(e.target.value)}>
              <option value="">Diagnóstico (Todos)</option>
              {Array.from(new Set(reportes.map(r => r.attributes.categoria).filter(Boolean))).map(diag => <option key={diag} value={diag}>{diag}</option>)}
            </select>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>ID Reporte</th><th>Colaborador</th><th>Estado</th><th>Fecha y Hora Reporte</th><th>Seguimientos</th></tr>
            </thead>
            <tbody>
              {currentItems.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>No se encontraron reportes que coincidan con los filtros.</td></tr>
              ) : (
                currentItems.map(r => {
                  const attr = r.attributes;
                  const segs = attr.sst_seguimientos?.data || [];
                  const empData = empCache[attr.id_empleado];
                  const { badge: estadoBadge, label: estadoLabel } = getEstadoInfo(r.displayEstado, false);

                  return (
                    <tr key={r.id} onClick={() => setSelectedReporte(r)}>
                      <td style={{ fontWeight: 600 }}>#{r.id}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {empData?.foto ? <img src={empData.foto} alt="Avatar" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} /> : <CircleUserRound size={36} color="var(--muted)" />}
                          <div>
                            {empData ? <b style={{color: 'var(--text)'}}>{empData.nombre}</b> : `${attr.id_empleado}`}<br />
                            <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{attr.id_empleado}</span>
                          </div>
                        </div>
                      </td>
                      <td><span className={`status-badge ${estadoBadge}`} style={attr.estado === null ? { background: 'rgba(245, 158, 11, 0.1)', color: 'var(--amber)' } : {}}>{estadoLabel}</span></td>
                      <td style={{ fontSize: '13px' }}>{new Date(attr.createdAt).toLocaleString('es-CO')}</td>
                      <td>
                        {segs.length > 0 ? <span style={{ color: 'var(--green)', fontSize: '12px', fontWeight: 600 }}>{segs.length} Seguimientos</span> : <span style={{ color: 'var(--red)', fontSize: '12px', fontWeight: 600 }}>Sin Seguimientos</span>}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
          
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: '13px', color: 'var(--text2)' }}>Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredReportes.length)} de {filteredReportes.length} reportes</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-outline" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} style={{ padding: '6px 12px', fontSize: '12px' }}>Anterior</button>
                <span style={{ display: 'flex', alignItems: 'center', fontSize: '13px', fontWeight: 600, padding: '0 8px' }}>Página {currentPage} de {totalPages}</span>
                <button className="btn btn-outline" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} style={{ padding: '6px 12px', fontSize: '12px' }}>Siguiente</button>
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
            if (res.ok) setSelectedReporte((await res.json()).data);
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

export default SSTDashboard;
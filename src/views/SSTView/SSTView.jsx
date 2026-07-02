import React, { useState, useEffect, useMemo } from 'react';
import './SSTView.css';
import { Search, AlertTriangle, X, Save, RefreshCw, CircleUserRound, FileText, ChevronDown, ChevronUp, Clock, AlertCircle } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { API_REPORTES, API_SEGUIMIENTOS, fetchEmployeeData, getStrapiErrorMessage, getAge, getTenure, calcularIMC } from '../../utils/apiHelpers';

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

const BMILinearGauge = ({ imc }) => {
  const numImc = parseFloat(imc);
  if (isNaN(numImc)) return <span style={{ fontWeight: 700, color: 'var(--accent)' }}>N/A</span>;

  let position = 0;
  let label = '';
  let color = '';

  if (numImc < 18.5) {
    position = Math.max(0, ((numImc - 10) / 8.5) * 25);
    label = 'Bajo peso';
    color = '#3b82f6'; 
  } else if (numImc < 25) {
    position = 25 + ((numImc - 18.5) / 6.5) * 25;
    label = 'Normal';
    color = '#10b981'; 
  } else if (numImc < 30) {
    position = 50 + ((numImc - 25) / 5) * 25;
    label = 'Sobrepeso';
    color = '#f97316'; 
  } else {
    position = 75 + Math.min(25, ((numImc - 30) / 10) * 25);
    label = 'Obesidad';
    color = '#ef4444'; 
  }

  return (
    <div style={{ width: '100%', marginTop: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
         <span className="info-label" style={{ color: 'var(--text)' }}>IMC</span>
         <span style={{ color, background: `${color}1A`, padding: '2px 8px', borderRadius: '4px' }}>
           {numImc.toFixed(1)} - {label}
         </span>
      </div>
      
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

      <div style={{ width: '100%', height: '10px', borderRadius: '6px', display: 'flex', overflow: 'hidden', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ flex: 1, background: '#3b82f6' }}></div>
        <div style={{ flex: 1, background: '#10b981' }}></div>
        <div style={{ flex: 1, background: '#f97316' }}></div>
        <div style={{ flex: 1, background: '#ef4444' }}></div>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--muted)', marginTop: '4px', fontWeight: 600 }}>
        <span style={{width: '25%', textAlign: 'right', paddingRight: '4px'}}>18.5</span>
        <span style={{width: '25%', textAlign: 'right', paddingRight: '4px'}}>24.9</span>
        <span style={{width: '25%', textAlign: 'right', paddingRight: '4px'}}>29.9</span>
        <span style={{width: '25%'}}></span>
      </div>
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

  const ageVal = getAge(emp.birthday || emp.fecha_nacimiento);
  const edadCalc = ageVal !== null ? `${ageVal} años` : 'N/A';
  const imcCalc = calcularIMC(attr.peso_kg, attr.talla_m);

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
            <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '14px', fontWeight: 600 }}>{attr.genero || emp.genero || 'N/A'}</div>

            <div className="info-grid" style={{ textAlign: 'left', gridTemplateColumns: '1fr', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                <span className="info-label">Cargo</span><span className="info-value" style={{ textAlign: 'right' }}>{emp.cargo || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                <span className="info-label">Área</span><span className="info-value" style={{ textAlign: 'right' }}>{emp.area_nombre || emp.area || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                <span className="info-label">Departamento</span><span className="info-value" style={{ textAlign: 'right' }}>{emp.departamento || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                <span className="info-label">Dirección</span><span className="info-value" style={{ textAlign: 'right' }}>{emp.direction || emp.direccion || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                <span className="info-label">Nacimiento</span><span className="info-value" style={{ textAlign: 'right' }}>{emp.birthday ||'N/A'} ({edadCalc})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                <span className="info-label">Ingreso</span><span className="info-value" style={{ textAlign: 'right' }}>{emp.ingreso || emp.fecha_ingreso || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                <span className="info-label">Celular</span><span className="info-value" style={{ textAlign: 'right' }}>{emp.Celular || emp.celular || emp.telefono || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                <span className="info-label">Correo</span><span className="info-value" style={{ textAlign: 'right' }}>{emp.correo || emp.email || 'N/A'}</span>
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
              <div style={{ border: '1px solid #ef4444', color: '#b91c1c', padding: '12px 16px', borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertTriangle size={24} />
                <div>
                  <strong style={{ display: 'block', fontSize: '14px', marginBottom: '2px' }}>¡Alerta de seguimiento!</strong>
                  <span style={{ fontSize: '13px' }}>El compromiso ya se cumplió y se encuentra vencido con fecha límite <strong>{isTemporalidadVencida}</strong></span>
                </div>
              </div>
            )}
            
            <div style={{ border: '1px solid var(--surface2)', padding: '16px', borderRadius: '0 0 8px 8px', marginBottom: '32px' }}>
              <div style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text2)' }}>
                  Creado por <strong>{liderEmp.nombre}</strong> el <strong>{new Date(attr.createdAt).toLocaleString('es-CO')}</strong>
                </span>
              </div>
              <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text)' }}>
                Se registra un reporte de <strong>{attr.categoria || 'N/A'}</strong> para la entidad <strong>{attr.entidad_cargo || 'N/A'} {attr.nombre_entidad || 'N/A'}</strong>
                <br></br>{attr.descripcion || 'Sin descripción inicial.'}
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                        <div style={{ fontSize: '14px' }}>
                          Creado por <strong>{sstDetails?.nombre || sa.id_sst}</strong> el <strong>{new Date(sa.createdAt).toLocaleString('es-CO')}</strong>
                        </div>
                      </div>
                      <p style={{ fontSize: '14px', marginBottom: '8px' }}>
                        {sa.descripcion || 'Sin descripción'}
                      </p>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11px', background: 'var(--surface2)', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>Acción realizada: {sa.accion || 'N/A'}</span>
                        <span style={{ fontSize: '11px', background: 'var(--surface2)', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>Sistema afectado: {sa.sistema || 'N/A'}</span>
                        {sa.temporalidad && (
                          <span style={{ fontSize: '11px', background: 'var(--surface2)', padding: '4px 8px', borderRadius: '4px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            Temporalidad: {sa.temporalidad}
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
              <div>Agregar Nuevo Seguimiento</div>
              {isFormOpen ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
            </div>

            {isFormOpen && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
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
                    <option>Neoplasias</option>
                    <option>Otro</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Temporalidad</label>
                  <input type="date" name="temporalidad" className="form-control" value={form.temporalidad} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Actualizar Estado</label>
                  <select name="estado" className="form-control" value={form.estado} onChange={handleChange}>
                    <option value="null">En seguimiento</option>
                    <option value="Abierto">Abierto</option>
                    <option value="Cerrado">Cerrado</option>
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
    const map = { '0-1 año': 0, '1-3 años': 0, '3-5 años': 0, '5+ años': 0, 'N/A': 0 };
    reportes.forEach(r => {
      const emp = empCache[r.attributes.id_empleado];
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

      <div className="charts-grid">
        <div className="chart-card"><div className="chart-title">Estado de Casos</div><div className="chart-wrap"><Doughnut data={estadoData} options={doughnutOptions} /></div></div>
        <div className="chart-card"><div className="chart-title">Por Entidad</div><div className="chart-wrap"><Bar data={entidadData} options={barOptionsV} /></div></div>
        <div className="chart-card"><div className="chart-title">Por Edad</div><div className="chart-wrap"><Bar data={edadData} options={barOptionsV} /></div></div>
        <div className="chart-card"><div className="chart-title">Acción Realizada</div><div className="chart-wrap"><Bar data={accData} options={barOptionsH} /></div></div>
        <div className="chart-card"><div className="chart-title">Sistema Afectado</div><div className="chart-wrap"><Bar data={sisData} options={barOptionsH} /></div></div>
        <div className="chart-card"><div className="chart-title">Por Género</div><div className="chart-wrap"><Doughnut data={generoData} options={doughnutOptions} /></div></div>
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

export default SSTDashboard;
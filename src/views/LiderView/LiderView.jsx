import React, { useState, useEffect } from 'react';
import './LiderView.css';
import { ClipboardPlus, X, Save, RefreshCw, CircleUserRound, FileText } from 'lucide-react';
import { fetchEmployeeData, getStrapiErrorMessage, API_REPORTES } from '../../utils/apiHelpers';

const LiderView = ({ user, showToast, setLoading, empCache, setEmpCache }) => {
  const hasEquipo = user.equipo && user.equipo.length > 0;
  const [useDropdownMode, setUseDropdownMode] = useState(hasEquipo);
  const [manualDoc, setManualDoc] = useState('');
  const [selectedColaborador, setSelectedColaborador] = useState(null);
  const [history, setHistory] = useState([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [formData, setFormData] = useState({
    categoria: '', genero: '', peso: '', talla: '',
    entidad_tipo: '', entidad_nombre: '', descripcion: '', archivo: null
  });

  const loadHistory = async () => {
    try {
      const res = await fetch(`${API_REPORTES}?filters[id_lider][$eq]=${user.document_number}&populate=*&sort=createdAt:desc`);
      const json = await res.json();
      const reps = json.data || [];
      setHistory(reps);
      
      const ids = [...new Set(reps.map(r => r.attributes.id_empleado))];
      const uncachedIds = ids.filter(id => !empCache[id]);
      
      if (uncachedIds.length > 0) {
        const newEmps = {};
        await Promise.all(uncachedIds.map(async id => {
           const data = await fetchEmployeeData(id);
           if (data) newEmps[id] = data;
        }));
        setEmpCache(prev => ({ ...prev, ...newEmps }));
      }
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
      const emp = await fetchEmployeeData(manualDoc);
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
        estado: null, 
        publishedAt: new Date().toISOString()
      };

      const formDataPayload = new FormData();
      formDataPayload.append('data', JSON.stringify(payloadData));
      
      if (formData.archivo) {
        formDataPayload.append('files.archivo', formData.archivo);
      }

      const res = await fetch(API_REPORTES, {
        method: 'POST',
        body: formDataPayload 
      });

      if (res.ok) {
        showToast('Reporte enviado exitosamente');
        setFormData({ categoria: '', genero: '', peso: '', talla: '', entidad_tipo: '', entidad_nombre: '', descripcion: '', archivo: null });
        setSelectedColaborador(null);
        setManualDoc('');
        const fileInput = document.getElementById('file-upload');
        if(fileInput) fileInput.value = '';
        
        setIsModalOpen(false); 
        setCurrentPage(1); 
        await loadHistory(); 
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

  const totalPages = Math.ceil(history.length / itemsPerPage);
  const currentItems = history.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="view-container active container">
      <div className="lider-alert-banner" onClick={() => setIsModalOpen(true)}>
        <ClipboardPlus size={26} color="var(--accent)" />
        <div className="alert-text">
          <strong className="lider-alert-title">Haz clic aquí para registrar una novedad de salud de algún miembro de tu equipo</strong>
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={(e) => e.target.className === 'modal-overlay' && setIsModalOpen(false)}>
          <div className="slide-over-modal lider-modal-scroll">
            
            <button className="modal-close lider-modal-close-pos" onClick={() => setIsModalOpen(false)}>
              <X size={24} />
            </button>
            
            <h2 className="lider-modal-title">
              Generar reporte a Seguridad y Salud en el Trabajo
            </h2>

            <div className="report-grid">
              <div className="form-group full-width">
                <div className="lider-form-label-row">
                  <label className="form-label">{useDropdownMode ? 'Colaborador Afectado' : 'Buscar Colaborador'}</label>
                  {hasEquipo && (
                    <button type="button" className="btn btn-outline lider-btn-toggle" onClick={() => setUseDropdownMode(!useDropdownMode)}>
                      {useDropdownMode ? <>Buscar por documento</> : <>Usar lista de equipo</>}
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
                  <div className="lider-search-row">
                    <input type="number" className="form-control lider-search-input" placeholder="Ingrese número de documento..." value={manualDoc} onChange={(e) => setManualDoc(e.target.value)} />
                    <button type="button" className="btn btn-outline" onClick={handleManualSearch}>Buscar</button>
                  </div>
                )}

                {selectedColaborador && (
                  <div className="lider-selected-card">
                    <div className="lider-selected-info">
                      <img src={selectedColaborador.foto} alt="" className="user-avatar lider-selected-avatar"/>
                      <span className="lider-selected-name">{selectedColaborador.nombre}</span>
                      <span className="lider-selected-badge">{selectedColaborador.cargo || 'Colaborador'}</span>
                    </div>
                    <button type="button" className="btn btn-outline lider-btn-remove" onClick={() => setSelectedColaborador(null)}>
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
                <label className="form-label">Adjuntar Documento</label>
                <div className="lider-upload-box" >
                  <input 
                    id="file-upload" 
                    type="file" 
                    accept="application/pdf" 
                    onChange={handleFileChange} 
                    className="lider-upload-input"
                    style={{
                      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                      opacity: 0, cursor: 'pointer', zIndex: 2
                    }}
                  />
                  <FileText size={32} color="var(--accent)" className="lider-upload-icon" />
                  <div className="lider-upload-text">
                    {formData.archivo ? formData.archivo.name : 'Arrastra un archivo aquí o haz clic para subir'}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="lider-modal-footer">
              <button className="btn btn-outline lider-btn-cancel" onClick={() => setIsModalOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSubmit}><Save size={16}/> Enviar Reporte a SST</button>
            </div>
          </div>
        </div>
      )}

      <div className="cases-section">
        <div className="cases-header">
          <div className="lider-section-title">Historial de Reportes</div>
          <button className="btn btn-outline lider-btn-refresh" onClick={loadHistory}><RefreshCw size={14} /> Actualizar</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID Reporte</th>
                <th>Colaborador</th>
                <th>Estado</th>
                <th>Fecha y Hora Reporte</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr><td colSpan="4" className="lider-table-empty">No has realizado ningún reporte aún.</td></tr>
              ) : (
                currentItems.map(r => {
                  const attr = r.attributes;
                  const empData = empCache[attr.id_empleado];
                  
                  let estadoBadge = 'seguimiento';
                  let estadoLabel = 'En seguimiento';
                  if (attr.estado === true) { estadoBadge = 'abierto'; estadoLabel = 'Abierto'; }
                  else if (attr.estado === false) { estadoBadge = 'cerrado'; estadoLabel = 'Cerrado'; }

                  return (
                    <tr key={r.id}>
                      <td className="lider-table-id">#{r.id}</td>
                      <td>
                        <div className="lider-table-user-cell">
                          {empData?.foto ? (
                            <img src={empData.foto} alt="Avatar" className="lider-table-avatar" />
                          ) : (
                            <CircleUserRound size={36} color="var(--muted)" />
                          )}
                          <div>
                            {empData ? <b className="lider-table-emp-name">{empData.nombre}</b> : `${attr.id_empleado}`}<br />
                            <span className="lider-table-emp-sub">ID: {attr.id_empleado}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge ${estadoBadge}`}>
                          {estadoLabel}
                        </span>
                      </td>
                      <td className="lider-table-date">{new Date(attr.createdAt).toLocaleString('es-CO')}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
          
          {totalPages > 1 && (
            <div className="lider-pagination">
              <span className="lider-pagination-info">
                Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, history.length)} de {history.length} reportes
              </span>
              <div className="lider-pagination-actions">
                <button 
                  className="btn btn-outline lider-pagination-btn" 
                  disabled={currentPage === 1} 
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  Anterior
                </button>
                <span className="lider-pagination-current">
                  Página {currentPage} de {totalPages}
                </span>
                <button 
                  className="btn btn-outline lider-pagination-btn" 
                  disabled={currentPage === totalPages} 
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default LiderView;
import React from 'react';

export const STRAPI_BASE_URL = 'https://macfer.crepesywaffles.com/api';
export const BUK_API_URL = 'https://apialohav2.crepesywaffles.com/buk/empleados3';

export const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const calculateAgeFromBirthDate = (birthDate) => {
  if (!birthDate) return null;
  const parsed = new Date(birthDate);
  if (Number.isNaN(parsed.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - parsed.getFullYear();
  const m = today.getMonth() - parsed.getMonth();
  return (m < 0 || (m === 0 && today.getDate() < parsed.getDate())) ? age - 1 : age;
};

export const calculateBMI = (peso, talla) => {
  if (!peso || !talla) return { value: '-', label: 'N/A', cssClass: 'bmi-default' };
  const imc = (peso / (talla * talla)).toFixed(1);
  if (imc < 18.5) return { value: imc, label: 'Bajo peso', cssClass: 'bmi-low' };
  if (imc < 25) return { value: imc, label: 'Peso normal', cssClass: 'bmi-normal' };
  if (imc < 30) return { value: imc, label: 'Sobrepeso', cssClass: 'bmi-warning' };
  return { value: imc, label: 'Obesidad', cssClass: 'bmi-danger' };
};

export const normalizeBukUser = (user) => ({
  ...user,
  document_number: String(user.document_number) || '',
  nombre: user.nombre || '',
  foto: user.foto || null,
  Celular: user.Celular || '',
  correo: user.correo || '',
  ingreso: user.ingreso || '',
  area_nombre: user.area_nombre || '',
  departamento: user.departamento || '',
  direction: user.direction || '',
  cargo: user.cargo || '',
  genero: user.genero || '',
  status: user.status || '',
  birthday: user.birthday || ''
});

export const obtenerEmpleadoBuk = async (documento) => {
  if (!documento) return null;
  try {
    const res = await fetch(`${BUK_API_URL}?documento=${documento}`);
    if (!res.ok) throw new Error('Error al conectar con la API de empleados');
    const json = await res.json();
    const data = Array.isArray(json.data || json) ? (json.data || json)[0] : (json.data || json);
    return data ? normalizeBukUser(data) : null;
  } catch (err) {
    console.error('Error cargando empleado:', err);
    return null;
  }
};

export const mapearEstado = (estado) => {
  if (estado === true) return 'Abierto';
  if (estado === false) return 'Cerrado';
  return 'Pendiente'; 
};

export const mapStrapiToReports = (StrapiData, allBukUsers) => {
  return StrapiData.map(item => {
    const att = item.attributes;
    const buk = normalizeBukUser(allBukUsers.find(u => String(u.document_number) === String(att.id_empleado)) || {});
    const lider = normalizeBukUser(allBukUsers.find(u => String(u.document_number) === String(att.id_lider)) || {});
    
    const pdf = Array.isArray(att.archivo?.data) ? att.archivo.data[0] : (att.archivo?.data || att.archivo);
    
    return {
      id: String(item.id),
      strapiId: item.id,
      employeeId: att.id_empleado,
      employeeName: buk.nombre || `Empleado C.C. ${att.id_empleado}`,
      employeeDetails: {
        foto: buk.foto,
        documento: att.id_empleado,
        celular: buk.Celular,
        correo: buk.correo,
        cargo: buk.cargo,
        area_nombre: buk.area_nombre,
        departamento: buk.departamento,
        direction: buk.direction || '-',
        ingreso: buk.ingreso || '-',
        peso_kg: att.peso_kg,
        talla_m: att.talla_m,
        birthDate: att.fecha_nacimiento,
        age: calculateAgeFromBirthDate(att.fecha_nacimiento),
        genero: att.genero || buk.genero || '-'
      },
      status: mapearEstado(att.estado),
      statusBoolean: att.estado,
      entityCharge: att.entidad_cargo || '-',
      entityName: att.nombre_entidad || '-',
      fileAttachment: pdf ? { id: pdf.id, name: pdf.attributes?.name || pdf.name, url: pdf.attributes?.url || null } : null,
      leaderDocument: att.id_lider,
      leaderName: lider.nombre || `Líder ID: ${att.id_lider}`,
      leaderFoto: lider.foto,
      date: formatDate(att.createdAt),
      type: att.categoria,
      description: att.descripcion,
      accion: att.accion,
      sistema_afectado: att.sistema_afectado, 
      temporalidad: att.temporalidad,
      history: (att.sst_seguimientos?.data || []).map(seg => {
        const idGestor = seg.attributes.id_admin || seg.attributes.id_sst;
        const sstAdmin = normalizeBukUser(allBukUsers.find(u => String(u.document_number) === String(idGestor)) || {});
        return { 
          id: seg.id,
          date: formatDate(seg.attributes.createdAt),
          rawDate: seg.attributes.createdAt,
          note: seg.attributes.descripcion,
          author: idGestor,
          authorName: sstAdmin.nombre || `Gestor ID: ${idGestor}`,
          authorFoto: sstAdmin.foto || null,
          // NUEVOS CAMPOS RECUPERADOS DE LA API (con fallback por si las mayúsculas en Strapi varían)
          accion: seg.attributes.accion || seg.attributes.Accion || seg.attributes.Acción || 'No Aplica',
          sistema: seg.attributes.sistema || seg.attributes.sistema_afectado || seg.attributes.Sistema || 'No Aplica',
          temporalidad: seg.attributes.temporalidad || seg.attributes.Temporalidad || 'No Aplica'
        }
      }).sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate))
    };
  });
};

export const StatusBadge = ({ status }) => {
  const s = status?.toLowerCase() || '';
  const badgeClass = s.includes('abierto') ? 'badge-danger' :
    s.includes('pendiente') ? 'badge-warning' :
      s.includes('cerrado') ? 'badge-success' : 'badge-default';
  return <span className={`badge ${badgeClass}`}>{status}</span>;
};
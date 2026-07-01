export const API_EMPLEADOS = 'https://apialohav2.crepesywaffles.com/buk/empleados3';
export const API_REPORTES = 'https://macfer.crepesywaffles.com/api/sst-reportes';
export const API_SEGUIMIENTOS = 'https://macfer.crepesywaffles.com/api/sst-seguimientos';

export async function fetchEmployeeData(doc) {
  try {
    const res = await fetch(`${API_EMPLEADOS}?documento=${doc}`);
    const json = await res.json();
    if (json.ok && json.data && json.data.length > 0) {
      return json.data[0];
    }
  } catch (e) {
    console.error('Error fetching employee', e);
  }
  return null;
}

export async function getStrapiErrorMessage(response) {
  try {
    const json = await response.json();
    if (json.error && json.error.message) return json.error.message;
  } catch (e) { }
  return `Error de servidor (HTTP ${response.status})`;
}

export const getAge = (birthdate) => {
  if (!birthdate) return null;
  const hoy = new Date();
  const cumple = new Date(birthdate);
  let edad = hoy.getFullYear() - cumple.getFullYear();
  const m = hoy.getMonth() - cumple.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < cumple.getDate())) edad--;
  return isNaN(edad) ? null : edad;
};

export const getTenure = (hireDate) => {
  if (!hireDate) return null;
  const hoy = new Date();
  const ingreso = new Date(hireDate);
  let years = hoy.getFullYear() - ingreso.getFullYear();
  const m = hoy.getMonth() - ingreso.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < ingreso.getDate())) years--;
  return isNaN(years) ? null : years;
};

export const calcularIMC = (pesoKg, tallaM) => {
  if (!pesoKg || !tallaM) return 'N/A';
  const imc = pesoKg / (tallaM * tallaM);
  return imc.toFixed(1);
};
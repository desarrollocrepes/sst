import React, { useState } from "react";
import "./LoginView.css";
import { fetchEmployeeData } from "../../utils/apiHelpers";
import { Loader2, IdCard, Briefcase, IdCardLanyard } from "lucide-react";

const LoginView = ({
  onLoginSuccess,
  showToast,
  isLoading,
  setLoading,
}) => {
  const [doc, setDoc] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!doc.trim()) {
      showToast("Ingrese un documento válido", "error");
      return;
    }

    setLoading(true);

    try {
      const emp = await fetchEmployeeData(doc);

      if (!emp) {
        showToast("Usuario no encontrado", "error");
      } else if (emp.status !== "activo") {
        showToast("El usuario no se encuentra activo", "error");
      } else if (emp.departamento === "Seguridad y Salud en el Trabajo") {
        onLoginSuccess(emp, "SST");
        showToast(`Bienvenido(a), ${emp.nombre.split(" ")[0]}`);
      } else if (emp.lider === 1) {
        onLoginSuccess(emp, "LIDER");
        showToast(`Bienvenido(a), ${emp.nombre.split(" ")[0]}`);
      } else {
        showToast(
          "No tiene permisos para acceder a esta plataforma",
          "error"
        );
      }
    } catch (err) {
      console.error(err);
      showToast("Error de conexión con el servidor", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
  <div className="login-card">
    <header className="login-header">
      <IdCardLanyard size={54} className="login-icon" />
    </header>

    <form onSubmit={handleLogin} className="login-body">
      <div className="form-group">
        <label htmlFor="cedula" className="form-label">
          Ingresa tu documento para continuar
        </label>

        <div className="input-wrapper">
          <IdCard className="input-icon" size={18} />

          <input
            id="cedula"
            type="number"
            value={doc}
            placeholder="No. de documento"
            className="form-input"
            disabled={isLoading}
            onChange={(e) => setDoc(e.target.value)}
          />
        </div>
      </div>

      <button
        type="submit"
        className="btn-w-full login-submit-btn"
        disabled={isLoading || !doc.trim()}
      >
        {isLoading ? (
          <>
            <Loader2 className="spin" size={18} />
            Ingresando...
          </>
        ) : (
          "Ingresar"
        )}
      </button>
    </form>
  </div>
</div>
  );
};

export default LoginView;
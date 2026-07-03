import React, { useState } from 'react';
import './App.css';
import { LogOut } from 'lucide-react';
import LoginView from './views/LoginView/LoginView';
import LiderView from './views/LiderView/LiderView';
import SSTDashboard from './views/SSTView/SSTView';

const ToastContainer = ({ toasts }) => (
  <div id="toast-container">
    {toasts.map((t) => (
      <div key={t.id} className={`toast ${t.type}`}>
        {t.msg}
      </div>
    ))}
  </div>
);

const GlobalHeader = ({ user, onLogout }) => (
  <header className="app-header">
    <div className="header-brand">
      <span></span>
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
      />
      <button className="btn btn-outline" onClick={onLogout}>
        <LogOut size={14} />
      </button>
    </div>
  </header>
);

export default function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [empCache, setEmpCache] = useState({});

  const showToast = (msg, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  };

  const handleLogout = () => { setUser(null); setRole(null); setEmpCache({}); };

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
            <LiderView user={user} showToast={showToast} setLoading={setLoading} empCache={empCache} setEmpCache={setEmpCache} />
          ) : (
            <SSTDashboard user={user} showToast={showToast} setLoading={setLoading} empCache={empCache} setEmpCache={setEmpCache} />
          )}
        </>
      )}
    </>
  );
}
import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import LiderView from './pages/LiderView';
import SSTView from './pages/SSTView';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [allBukUsers, setAllBukUsers] = useState([]);

  const handleLogin = (user, bukData) => {
    setAllBukUsers(bukData);
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setAllBukUsers([]);
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/" 
          element={
            !currentUser ? (
              <Login onLogin={handleLogin} />
            ) : (
              <Navigate to={currentUser.role === 'SST' ? "/sst" : "/lider"} replace />
            )
          } 
        />
        
        <Route 
          path="/lider" 
          element={
            currentUser?.role === 'LIDER' ? (
              <LiderView currentUser={currentUser} allBukUsers={allBukUsers} onLogout={handleLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />

        <Route 
          path="/sst" 
          element={
            currentUser?.role === 'SST' ? (
              <SSTView currentUser={currentUser} allBukUsers={allBukUsers} onLogout={handleLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}
import React, { useState, useEffect } from 'react';
import Login from './Login';
import DashboardKomparasi from './DashboardKomparasi';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Membaca status dari localStorage saat aplikasi pertama kali dimuat
    return localStorage.getItem('isLoggedIn') === 'true';
  });

  // Menyimpan status ke localStorage setiap kali isAuthenticated berubah
  useEffect(() => {
    localStorage.setItem('isLoggedIn', isAuthenticated);
  }, [isAuthenticated]);

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('monipad_user');
    localStorage.removeItem('monipad_hash');
  };

  return (
    <>
      {!isAuthenticated ? (
        <Login onLoginSuccess={() => setIsAuthenticated(true)} />
      ) : (
        <DashboardKomparasi onLogout={handleLogout} />
      )}
    </>
  );
}

export default App;

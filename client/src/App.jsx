import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { api } from './api';
import Login from './pages/Login';
import Operations from './pages/Operations';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) { setUser(null); setLoading(false); return; }
    setLoading(true);
    api('/auth/me').then((data) => setUser(data.user)).catch(() => {
      localStorage.removeItem('token'); setToken(null); setUser(null);
    }).finally(() => setLoading(false));
  }, [token]);

  const login = (nextToken) => { localStorage.setItem('token', nextToken); setToken(nextToken); navigate('/'); };
  const logout = () => { localStorage.removeItem('token'); setToken(null); setUser(null); navigate('/login'); };
  if (loading) return <div className="min-h-screen grid place-items-center bg-slate-950 text-slate-300">Validating session…</div>;
  if (!token || !user) return <Routes><Route path="/login" element={<Login onLogin={login} />} /><Route path="*" element={<Navigate to="/login" replace />} /></Routes>;
  return <Routes><Route path="/" element={<Operations user={user} onLogout={logout} />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes>;
}

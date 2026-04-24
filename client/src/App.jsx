import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import FeaturePage from './pages/FeaturePage';
import AICoach from './pages/AICoach';
import Sidebar from './components/Sidebar';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const navigate = useNavigate();

  const handleLogin = (t) => {
    localStorage.setItem('token', t);
    setToken(t);
    navigate('/');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    navigate('/login');
  };

  if (!token) {
    return (
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar onLogout={handleLogout} />
      <main className="flex-1 ml-64 p-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/contacts" element={<FeaturePage feature="contacts" title="Contacts & Relationships" />} />
          <Route path="/referrals" element={<FeaturePage feature="referrals" title="Referral Tracking" />} />
          <Route path="/clients" element={<FeaturePage feature="clients" title="Client Management" />} />
          <Route path="/influencers" element={<FeaturePage feature="influencers" title="Centers of Influence" />} />
          <Route path="/chains" element={<FeaturePage feature="chains" title="Referral Chains" />} />
          <Route path="/gifts" element={<FeaturePage feature="gifts" title="Gifts & Thank Yous" />} />
          <Route path="/stories" element={<FeaturePage feature="stories" title="Client Stories" />} />
          <Route path="/ideal-clients" element={<FeaturePage feature="ideal-clients" title="Ideal Client Profiles" />} />
          <Route path="/testimonials" element={<FeaturePage feature="testimonials" title="Reviews & Testimonials" />} />
          <Route path="/nurturing" element={<FeaturePage feature="nurturing" title="Relationship Nurturing" />} />
          <Route path="/expectations" element={<FeaturePage feature="expectations" title="Expectations Manager" />} />
          <Route path="/rewards" element={<FeaturePage feature="rewards" title="Referral Rewards" />} />
          <Route path="/pipeline" element={<FeaturePage feature="pipeline" title="Referral Pipeline" />} />
          <Route path="/ai-coach" element={<AICoach />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

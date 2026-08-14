import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldIcon, DashboardIcon, SearchIcon, LogOutIcon, UserIcon, ActivityIcon, RadioIcon, AlertTriangleIcon, GlobeIcon, UsersIcon, SettingsIcon } from './Icons';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="app-shell">
      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(14, 165, 233, 0.15)', color: '#0ea5e9', display: 'flex' }}>
            <ShieldIcon size={24} />
          </div>
          <div>
            <div className="sidebar-logo-text">STRIVOX</div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500, letterSpacing: '0.05em' }}>SOC INVESTIGATOR</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <Link to="/dashboard" className={`nav-item ${isActive('/dashboard') ? 'active' : ''}`}>
            <DashboardIcon size={18} />
            <span>Dashboard</span>
          </Link>
          <Link to="/monitoring" className={`nav-item ${isActive('/monitoring') ? 'active' : ''}`}>
            <RadioIcon size={18} />
            <span>Live Monitoring</span>
          </Link>
          <Link to="/alerts" className={`nav-item ${isActive('/alerts') ? 'active' : ''}`}>
            <AlertTriangleIcon size={18} />
            <span>Real-Time Alerts</span>
          </Link>
          <Link to="/investigations/new" className={`nav-item ${isActive('/investigations/new') ? 'active' : ''}`}>
            <SearchIcon size={18} />
            <span>New Investigation</span>
          </Link>
          <Link to="/threat-intel" className={`nav-item ${isActive('/threat-intel') ? 'active' : ''}`}>
            <GlobeIcon size={18} />
            <span>Threat Intelligence</span>
          </Link>
          <Link to="/collaboration" className={`nav-item ${isActive('/collaboration') ? 'active' : ''}`}>
            <UsersIcon size={18} />
            <span>Collaboration</span>
          </Link>
          <Link to="/integrations" className={`nav-item ${isActive('/integrations') ? 'active' : ''}`}>
            <SettingsIcon size={18} />
            <span>Integrations & SIEM</span>
          </Link>
        </nav>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#64748b' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10b981' }}></span>
            <span>OpenRouter Engine</span>
          </div>
          <button 
            onClick={handleLogout} 
            title="Logout" 
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', padding: '0.25rem' }}
          >
            <LogOutIcon size={16} />
          </button>
        </div>
      </aside>

      {/* ── Main Content Area ────────────────────────────────────────────────── */}
      <div className="main-wrapper">
        <header className="top-nav">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.825rem', color: '#94a3b8' }}>
              <ActivityIcon size={16} style={{ color: '#0ea5e9' }} />
              <span style={{ color: '#f8fafc', fontWeight: 500 }}>System Active</span>
              <span>•</span>
              <span>AI Security Pipeline Operational</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#0f172a', padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid #1e293b', fontSize: '0.825rem', color: '#cbd5e1' }}>
              <UserIcon size={15} style={{ color: '#0ea5e9' }} />
              <span>Analyst Portal</span>
            </div>

            <button 
              onClick={handleLogout}
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
            >
              <LogOutIcon size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        <main className="content-area">
          {children}
        </main>
      </div>
    </div>
  );
};

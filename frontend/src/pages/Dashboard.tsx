import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { Layout } from '../components/Layout';
import { SeverityBadge, StatusBadge } from '../components/Badges';
import { PlusIcon, SearchIcon, FileTextIcon, ShieldIcon, AlertTriangleIcon, CheckCircleIcon, ActivityIcon } from '../components/Icons';

interface Investigation {
  id: number;
  title: string;
  status: string;
  severity: string;
  created_at: string;
}

const Dashboard: React.FC = () => {
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchInvestigations = async () => {
      try {
        const res = await api.get('/investigations');
        setInvestigations(res.data);
      } catch (err: any) {
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchInvestigations();
  }, [navigate]);

  // Compute actual KPI metrics from real user data
  const totalCount = investigations.length;
  const highRiskCount = investigations.filter(i => ['high', 'critical'].includes((i.severity || '').toLowerCase())).length;
  const analyzingCount = investigations.filter(i => (i.status || '').toLowerCase() === 'analyzing').length;
  const completedCount = investigations.filter(i => ['completed', 'complete'].includes((i.status || '').toLowerCase())).length;

  // Filter investigations
  const filteredInvestigations = investigations.filter(inv => {
    const matchesSearch = inv.title.toLowerCase().includes(searchTerm.toLowerCase()) || String(inv.id).includes(searchTerm);
    const matchesSeverity = severityFilter === 'ALL' || (inv.severity || '').toUpperCase() === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  return (
    <Layout>
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 0.25rem' }}>Security Operations Overview</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Real-time dashboard of AI-analyzed security investigations and evidence reports.</p>
        </div>
        <Link to="/investigations/new">
          <button className="btn btn-primary" style={{ padding: '0.7rem 1.25rem' }}>
            <PlusIcon size={18} />
            <span>New Investigation</span>
          </button>
        </Link>
      </div>

      {/* ── KPI Stat Cards ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="stat-card">
          <div>
            <div className="stat-label">Total Investigations</div>
            <div className="stat-val">{totalCount}</div>
          </div>
          <div style={{ padding: '0.65rem', borderRadius: '8px', backgroundColor: 'rgba(14, 165, 233, 0.12)', color: '#0ea5e9' }}>
            <FileTextIcon size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">High / Critical Threats</div>
            <div className="stat-val" style={{ color: highRiskCount > 0 ? '#fdba74' : '#f8fafc' }}>{highRiskCount}</div>
          </div>
          <div style={{ padding: '0.65rem', borderRadius: '8px', backgroundColor: 'rgba(249, 115, 22, 0.12)', color: '#f97316' }}>
            <AlertTriangleIcon size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">Active / Analyzing</div>
            <div className="stat-val" style={{ color: analyzingCount > 0 ? '#38bdf8' : '#f8fafc' }}>{analyzingCount}</div>
          </div>
          <div style={{ padding: '0.65rem', borderRadius: '8px', backgroundColor: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8' }}>
            <ActivityIcon size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">Completed Reports</div>
            <div className="stat-val" style={{ color: '#34d399' }}>{completedCount}</div>
          </div>
          <div style={{ padding: '0.65rem', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
            <CheckCircleIcon size={24} />
          </div>
        </div>
      </div>

      {/* ── Filter Bar ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
          <div style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b', display: 'flex' }}>
            <SearchIcon size={16} />
          </div>
          <input
            type="text"
            className="input-cyber"
            placeholder="Search by title or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '2.5rem', fontSize: '0.85rem' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>Severity:</span>
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(sev => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              style={{
                padding: '0.35rem 0.65rem',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: '1px solid',
                borderColor: severityFilter === sev ? '#0ea5e9' : '#1e293b',
                backgroundColor: severityFilter === sev ? 'rgba(14, 165, 233, 0.15)' : '#0b1120',
                color: severityFilter === sev ? '#38bdf8' : '#94a3b8',
                transition: 'all 0.15s ease'
              }}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table / Data Grid ───────────────────────────────────────────────── */}
      <div className="table-container">
        <table className="table-cyber">
          <thead>
            <tr>
              <th style={{ width: '80px' }}>ID</th>
              <th>Investigation Title</th>
              <th style={{ width: '140px' }}>Status</th>
              <th style={{ width: '130px' }}>Severity</th>
              <th style={{ width: '180px' }}>Created Date</th>
              <th style={{ width: '120px', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                    <div className="analyzing-pulse" style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#0ea5e9' }}></div>
                    <span>Loading security investigations...</span>
                  </div>
                </td>
              </tr>
            ) : filteredInvestigations.length > 0 ? (
              filteredInvestigations.map(inv => (
                <tr key={inv.id}>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: '0.8rem', color: '#94a3b8' }}>#{inv.id}</td>
                  <td style={{ fontWeight: 600, color: '#f8fafc' }}>{inv.title}</td>
                  <td><StatusBadge status={inv.status} /></td>
                  <td><SeverityBadge severity={inv.severity} /></td>
                  <td style={{ color: '#94a3b8', fontSize: '0.825rem' }}>{new Date(inv.created_at).toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }}>
                    <Link to={`/investigations/${inv.id}`} className="btn btn-secondary" style={{ padding: '0.35rem 0.65rem', fontSize: '0.775rem' }}>
                      View Report →
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
                  <div style={{ display: 'inline-flex', padding: '1rem', borderRadius: '50%', backgroundColor: 'rgba(14, 165, 233, 0.08)', color: '#0ea5e9', marginBottom: '1rem' }}>
                    <ShieldIcon size={32} />
                  </div>
                  <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.5rem', color: '#f8fafc' }}>
                    {searchTerm || severityFilter !== 'ALL' ? 'No matching investigations found' : 'No security investigations found'}
                  </h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.875rem', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
                    {searchTerm || severityFilter !== 'ALL' ? 'Try adjusting your search criteria or severity filters.' : 'Get started by creating a new AI-powered security evidence investigation.'}
                  </p>
                  {!searchTerm && severityFilter === 'ALL' && (
                    <Link to="/investigations/new">
                      <button className="btn btn-primary">
                        <PlusIcon size={16} />
                        <span>Start New Investigation</span>
                      </button>
                    </Link>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  );
};

export default Dashboard;

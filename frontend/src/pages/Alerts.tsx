import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { AlertTriangleIcon } from '../components/Icons';
import api from '../api';

interface AlertItem {
  id: number;
  title: string;
  severity: string;
  status: string; // New, Investigating, Resolved, False Positive
  source: string;
  details?: string;
  investigation_id?: number | null;
  created_at: string;
}

export const Alerts: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const navigate = useNavigate();

  const fetchAlerts = async () => {
    try {
      const res = await api.get('/alerts');
      setAlerts(res.data);
    } catch (err) {
      console.error('Failed to fetch alerts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleUpdateStatus = async (alertId: number, newStatus: string) => {
    try {
      await api.patch(`/alerts/${alertId}`, { status: newStatus });
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, status: newStatus } : a))
      );
    } catch (err) {
      alert('Failed to update alert status');
    }
  };

  const handleEscalateToInvestigation = async (alertId: number) => {
    try {
      const res = await api.post(`/alerts/${alertId}/investigate`);
      if (res.data && res.data.investigation_id) {
        navigate(`/investigations/${res.data.investigation_id}`);
      }
    } catch (err) {
      alert('Failed to convert alert into investigation.');
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    if (filterStatus === 'ALL') return true;
    return a.status.toUpperCase() === filterStatus.toUpperCase();
  });

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'New':
        return 'badge badge-critical';
      case 'Investigating':
        return 'badge badge-analyzing';
      case 'Resolved':
        return 'badge badge-completed';
      case 'False Positive':
        return 'badge badge-low';
      default:
        return 'badge';
    }
  };


  return (
    <Layout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', display: 'flex' }}>
              <AlertTriangleIcon size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Real-Time Security Alerts</h1>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Immediate high-priority threat detection & incident triage dashboard</div>
            </div>
          </div>

          <button onClick={fetchAlerts} className="btn btn-secondary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}>
            Refresh Alerts
          </button>
        </div>

        {/* Filter bar */}
        <div className="card-cyber" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Filter by Status:</div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {['ALL', 'NEW', 'INVESTIGATING', 'RESOLVED', 'FALSE POSITIVE'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`btn ${filterStatus === st ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Alerts table */}
        <div className="table-container">
          <table className="table-cyber">
            <thead>
              <tr>
                <th>Alert Title</th>
                <th>Severity</th>
                <th>Source</th>
                <th>Status</th>
                <th>Created At</th>
                <th>Investigation</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                    Loading real-time security alerts...
                  </td>
                </tr>
              ) : filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                    No alerts found for the selected status.
                  </td>
                </tr>
              ) : (
                filteredAlerts.map((alt) => (
                  <tr key={alt.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#f8fafc' }}>{alt.title}</div>
                      {alt.details && (
                        <div style={{ fontSize: '0.775rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                          {alt.details}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge-${alt.severity.toLowerCase()}`}>
                        {alt.severity}
                      </span>
                    </td>
                    <td style={{ color: '#0ea5e9', fontWeight: 500 }}>{alt.source}</td>
                    <td>
                      <span className={getStatusBadgeClass(alt.status)}>{alt.status}</span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                      {new Date(alt.created_at).toLocaleString()}
                    </td>
                    <td>
                      {alt.investigation_id ? (
                        <button
                          onClick={() => navigate(`/investigations/${alt.investigation_id}`)}
                          className="btn btn-secondary"
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                        >
                          View #{alt.investigation_id}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleEscalateToInvestigation(alt.id)}
                          className="btn btn-primary"
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                        >
                          Investigate
                        </button>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <select
                        value={alt.status}
                        onChange={(e) => handleUpdateStatus(alt.id, e.target.value)}
                        className="input-cyber"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', width: 'auto' }}
                      >
                        <option value="New">New</option>
                        <option value="Investigating">Investigating</option>
                        <option value="Resolved">Resolved</option>
                        <option value="False Positive">False Positive</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
};

export default Alerts;

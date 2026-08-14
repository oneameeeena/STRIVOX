import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { UsersIcon } from '../components/Icons';
import api from '../api';

interface TeamUser {
  id: number;
  name: string;
  email: string;
}

interface InvestigationItem {
  id: number;
  title: string;
  status: string;
  severity: string;
  assigned_user_id?: number | null;
  created_at: string;
  assigned_user?: TeamUser | null;
}

export const CollaborationPage: React.FC = () => {
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [investigations, setInvestigations] = useState<InvestigationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const [uRes, invRes] = await Promise.all([
        api.get('/collaboration/users'),
        api.get('/investigations')
      ]);
      setUsers(uRes.data);
      setInvestigations(invRes.data);
    } catch (err) {
      console.error('Failed to load collaboration workspace data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAssign = async (invId: number, targetUserId: string) => {
    try {
      const assigned_user_id = targetUserId ? parseInt(targetUserId) : null;
      await api.post(`/collaboration/investigations/${invId}/assign`, { assigned_user_id });
      fetchData();
    } catch (err) {
      alert('Failed to update investigation assignment');
    }
  };

  return (
    <Layout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(129, 140, 248, 0.15)', color: '#818cf8', display: 'flex' }}>
            <UsersIcon size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Team Collaboration Workspace</h1>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Assign SOC investigations, track team member updates, and audit activity</div>
          </div>
        </div>

        {/* Team Members List */}
        <div className="card-cyber">
          <div style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', marginBottom: '1rem' }}>
            SOC Analyst Team Roster ({users.length})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
            {users.map((u) => {
              const assignedCount = investigations.filter(i => i.assigned_user_id === u.id).length;
              return (
                <div key={u.id} style={{ background: '#0b1120', padding: '1rem', borderRadius: '8px', border: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(14, 165, 233, 0.15)', color: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.9rem' }}>{u.name}</div>
                    <div style={{ fontSize: '0.775rem', color: '#94a3b8' }}>{u.email}</div>
                    <div style={{ fontSize: '0.75rem', color: '#38bdf8', marginTop: '0.2rem' }}>
                      {assignedCount} Assigned Investigation{assignedCount === 1 ? '' : 's'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Investigations Assignment Table */}
        <div className="table-container">
          <table className="table-cyber">
            <thead>
              <tr>
                <th>Investigation Title</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Created At</th>
                <th>Assigned Analyst</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                    Loading collaboration investigations...
                  </td>
                </tr>
              ) : investigations.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                    No active investigations found.
                  </td>
                </tr>
              ) : (
                investigations.map((inv) => (
                  <tr key={inv.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#f8fafc' }}>{inv.title}</div>
                      <div style={{ fontSize: '0.775rem', color: '#94a3b8' }}>ID: #{inv.id}</div>
                    </td>
                    <td>
                      <span className={`badge badge-${inv.severity.toLowerCase()}`}>{inv.severity}</span>
                    </td>
                    <td>
                      <span className={`badge badge-${inv.status.toLowerCase()}`}>{inv.status}</span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                      {new Date(inv.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <select
                        value={inv.assigned_user_id || ''}
                        onChange={(e) => handleAssign(inv.id, e.target.value)}
                        className="input-cyber"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', width: 'auto' }}
                      >
                        <option value="">-- Unassigned --</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => navigate(`/investigations/${inv.id}`)}
                        className="btn btn-secondary"
                        style={{ padding: '0.25rem 0.65rem', fontSize: '0.8rem' }}
                      >
                        Open Workspace
                      </button>
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

export default CollaborationPage;

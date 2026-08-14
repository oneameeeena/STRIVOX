import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { RadioIcon, ActivityIcon, SearchIcon, AlertTriangleIcon } from '../components/Icons';
import api from '../api';

interface SecurityEvent {
  id: number;
  source: string;
  event_type: string;
  severity: string;
  status: string;
  raw_data: string;
  investigation_id?: number | null;
  timestamp: string;
  risk_score?: number;
  ip_address?: string;
  username?: string;
}

interface MonitoringStats {
  total_events: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  active_investigations: number;
}

type ConnectionState = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED';

export const LiveMonitoring: React.FC = () => {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [stats, setStats] = useState<MonitoringStats>({
    total_events: 0,
    critical_count: 0,
    high_count: 0,
    medium_count: 0,
    low_count: 0,
    active_investigations: 0,
  });
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(true);
  const [connState, setConnState] = useState<ConnectionState>('CONNECTING');
  const [investigatingId, setInvestigatingId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const navigate = useNavigate();

  const fetchEventsAndStats = async () => {
    try {
      setErrorMessage(null);
      const [eventsRes, statsRes] = await Promise.all([
        api.get('/monitoring/events'),
        api.get('/monitoring/stats'),
      ]);
      setEvents(eventsRes.data);
      setStats(statsRes.data);
    } catch (err: any) {
      console.error('[LiveMonitoring] Failed to fetch events from backend:', err);
      setErrorMessage('Unable to connect to STRIVOX monitoring service.');
    } finally {
      setLoading(false);
    }
  };

  const connectWebSocket = () => {
    console.log('[LiveMonitoring] Connecting to WebSocket...');
    setConnState('CONNECTING');

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname || 'localhost';
    const wsUrl = `${wsProtocol}//${host}:8000/api/monitoring/ws/events`;

    try {
      if (socketRef.current) {
        socketRef.current.close();
      }

      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log('[LiveMonitoring] Connected');
        setConnState('CONNECTED');
        setErrorMessage(null);
      };

      socket.onmessage = (msgEvent) => {
        try {
          const message = JSON.parse(msgEvent.data);
          console.log('[LiveMonitoring] Event received:', message);
          if (message.type === 'NEW_SECURITY_EVENT') {
            const newEv = message.data;
            setEvents((prev) => {
              const exists = prev.some((e) => e.id === newEv.id);
              if (exists) {
                return prev.map((e) => (e.id === newEv.id ? newEv : e));
              }
              return [newEv, ...prev];
            });
            fetchEventsAndStats();
          }
        } catch (e) {
          console.error('[LiveMonitoring] Error parsing WebSocket message:', e);
        }
      };

      socket.onerror = (err) => {
        console.error('[LiveMonitoring] WebSocket error:', err);
        setConnState('DISCONNECTED');
      };

      socket.onclose = () => {
        console.log('[LiveMonitoring] Connection lost / closed.');
        setConnState('DISCONNECTED');
      };
    } catch (err) {
      console.error('[LiveMonitoring] Failed to create WebSocket connection:', err);
      setConnState('DISCONNECTED');
    }
  };

  useEffect(() => {
    fetchEventsAndStats();
    connectWebSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  const handleInvestigate = async (eventId: number) => {
    try {
      setInvestigatingId(eventId);
      const res = await api.post(`/siem/events/${eventId}/investigate`);
      if (res.data && res.data.investigation_id) {
        navigate(`/investigations/${res.data.investigation_id}`);
      }
    } catch (err) {
      alert('Failed to escalate event into an investigation.');
    } finally {
      setInvestigatingId(null);
    }
  };

  const filteredEvents = events.filter((ev) => {
    if (filterSeverity === 'ALL') return true;
    return ev.severity.toUpperCase() === filterSeverity.toUpperCase();
  });

  const getSeverityBadgeClass = (sev: string) => {
    const s = (sev || 'low').toLowerCase();
    if (s === 'critical') return 'badge badge-critical';
    if (s === 'high') return 'badge badge-high';
    if (s === 'medium') return 'badge badge-medium';
    return 'badge badge-low';
  };

  const renderConnectionBadge = () => {
    if (connState === 'CONNECTED') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16, 185, 129, 0.12)', padding: '0.4rem 0.85rem', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.3)', fontSize: '0.825rem', color: '#34d399', fontWeight: 600 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10b981' }}></span>
          <span>🟢 LIVE — Connected</span>
        </div>
      );
    }
    if (connState === 'CONNECTING') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(234, 179, 8, 0.12)', padding: '0.4rem 0.85rem', borderRadius: '6px', border: '1px solid rgba(234, 179, 8, 0.3)', fontSize: '0.825rem', color: '#fef08a', fontWeight: 600 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#f59e0b' }}></span>
          <span>🟡 CONNECTING...</span>
        </div>
      );
    }
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(239, 68, 68, 0.12)', padding: '0.4rem 0.85rem', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.3)', fontSize: '0.825rem', color: '#fca5a5', fontWeight: 600 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ef4444' }}></span>
        <span>🔴 DISCONNECTED</span>
      </div>
    );
  };

  return (
    <Layout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Header section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(14, 165, 233, 0.15)', color: '#0ea5e9', display: 'flex' }}>
              <RadioIcon size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Live Security Monitoring Stream</h1>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Real-time security telemetry, SIEM events, and automated risk analysis</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {renderConnectionBadge()}
            <button onClick={() => { fetchEventsAndStats(); connectWebSocket(); }} className="btn btn-secondary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}>
              Retry Connection
            </button>
          </div>
        </div>

        {/* Error notification if connection failed */}
        {errorMessage && (
          <div className="card-cyber" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: '#fca5a5', fontSize: '0.875rem' }}>
              <AlertTriangleIcon size={20} />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => { fetchEventsAndStats(); connectWebSocket(); }} className="btn btn-primary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}>
              Retry Connection
            </button>
          </div>
        )}

        {/* Live Event Counters Bar (Backend Driven) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <div className="stat-card">
            <div>
              <div className="stat-label">Total Events</div>
              <div className="stat-val">{stats.total_events || events.length}</div>
            </div>
            <ActivityIcon size={22} style={{ color: '#0ea5e9', opacity: 0.8 }} />
          </div>

          <div className="stat-card">
            <div>
              <div className="stat-label">Critical</div>
              <div className="stat-val" style={{ color: '#ef4444' }}>
                {stats.critical_count}
              </div>
            </div>
            <RadioIcon size={22} style={{ color: '#ef4444', opacity: 0.8 }} />
          </div>

          <div className="stat-card">
            <div>
              <div className="stat-label">High</div>
              <div className="stat-val" style={{ color: '#f97316' }}>
                {stats.high_count}
              </div>
            </div>
            <RadioIcon size={22} style={{ color: '#f97316', opacity: 0.8 }} />
          </div>

          <div className="stat-card">
            <div>
              <div className="stat-label">Medium / Low</div>
              <div className="stat-val" style={{ color: '#eab308' }}>
                {stats.medium_count + stats.low_count}
              </div>
            </div>
            <RadioIcon size={22} style={{ color: '#eab308', opacity: 0.8 }} />
          </div>

          <div className="stat-card">
            <div>
              <div className="stat-label">Active Investigations</div>
              <div className="stat-val" style={{ color: '#10b981' }}>
                {stats.active_investigations}
              </div>
            </div>
            <SearchIcon size={22} style={{ color: '#10b981', opacity: 0.8 }} />
          </div>
        </div>

        {/* Severity Filter bar */}
        <div className="card-cyber" style={{ padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ fontSize: '0.875rem', color: '#94a3b8', fontWeight: 500 }}>
            Filter Telemetry Stream:
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
              <button
                key={sev}
                onClick={() => setFilterSeverity(sev)}
                className={`btn ${filterSeverity === sev ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>

        {/* Live Stream Display */}
        {loading ? (
          <div className="card-cyber" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
            <div className="analyzing-pulse" style={{ display: 'inline-flex', padding: '1rem', borderRadius: '50%', backgroundColor: 'rgba(14, 165, 233, 0.12)', color: '#0ea5e9', marginBottom: '1rem' }}>
              <RadioIcon size={32} />
            </div>
            <h3 style={{ fontSize: '1.1rem', color: '#f8fafc', margin: '0 0 0.5rem' }}>Loading STRIVOX Live Telemetry...</h3>
            <p style={{ fontSize: '0.85rem' }}>Connecting to security event stream.</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          /* Empty State (Requirement 8) */
          <div className="card-cyber" style={{ padding: '3.5rem 2rem', textAlign: 'center', backgroundColor: '#0f172a' }}>
            <div style={{ display: 'inline-flex', padding: '1.25rem', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#34d399', marginBottom: '1.25rem' }}>
              <RadioIcon size={40} />
            </div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0 0 0.5rem', color: '#f8fafc' }}>
              Live Monitoring is active
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', maxWidth: '520px', margin: '0 auto 1.5rem' }}>
              No security events detected yet. Waiting for incoming security telemetry from log uploads, screenshots, or SIEM feeds...
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#0b1120', padding: '0.4rem 1rem', borderRadius: '20px', border: '1px solid #1e293b', fontSize: '0.825rem', color: '#34d399' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10b981' }}></span>
              <span>🟢 Connected — Streaming Ready</span>
            </div>
          </div>
        ) : (
          <div className="table-container">
            <table className="table-cyber">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Severity</th>
                  <th>Event Type</th>
                  <th>Source</th>
                  <th>IP / User</th>
                  <th>Risk Score</th>
                  <th>Raw Event Telemetry</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((ev) => {
                  const riskScore = ev.risk_score || (ev.severity === 'Critical' ? 95 : (ev.severity === 'High' ? 80 : (ev.severity === 'Medium' ? 55 : 25)));
                  return (
                    <tr key={ev.id}>
                      <td style={{ fontSize: '0.8rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                        {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td>
                        <span className={getSeverityBadgeClass(ev.severity)}>{ev.severity}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#f8fafc' }}>{ev.event_type}</div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 500, color: '#38bdf8' }}>{ev.source}</span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                        {ev.ip_address || ev.username || '—'}
                      </td>
                      <td>
                        <span style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.775rem',
                          fontWeight: 700,
                          backgroundColor: riskScore >= 80 ? 'rgba(239, 68, 68, 0.15)' : (riskScore >= 50 ? 'rgba(249, 115, 22, 0.15)' : 'rgba(16, 185, 129, 0.15)'),
                          color: riskScore >= 80 ? '#fca5a5' : (riskScore >= 50 ? '#fdba74' : '#6ee7b7'),
                          border: `1px solid ${riskScore >= 80 ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`
                        }}>
                          Risk {riskScore}/100
                        </span>
                      </td>
                      <td style={{ maxWidth: '300px' }}>
                        <div className="code-font" style={{ fontSize: '0.775rem', color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ev.raw_data}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${ev.investigation_id ? 'badge-completed' : 'badge-analyzing'}`}>
                          {ev.investigation_id ? 'Investigated' : ev.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {ev.investigation_id ? (
                          <button
                            onClick={() => navigate(`/investigations/${ev.investigation_id}`)}
                            className="btn btn-secondary"
                            style={{ padding: '0.25rem 0.65rem', fontSize: '0.775rem' }}
                          >
                            View Investigation →
                          </button>
                        ) : (
                          <button
                            onClick={() => handleInvestigate(ev.id)}
                            disabled={investigatingId === ev.id}
                            className="btn btn-primary"
                            style={{ padding: '0.25rem 0.65rem', fontSize: '0.775rem' }}
                          >
                            {investigatingId === ev.id ? 'Escalating...' : 'Investigate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default LiveMonitoring;

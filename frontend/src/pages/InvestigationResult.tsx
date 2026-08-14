import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import { Layout } from '../components/Layout';
import { SeverityBadge, StatusBadge, ConfidenceBadge } from '../components/Badges';
import { ArrowLeftIcon, DownloadIcon, ShieldIcon, AlertTriangleIcon, CheckCircleIcon, TerminalIcon, FileTextIcon } from '../components/Icons';

const InvestigationResult: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Collaboration State (unconditional top-level hooks)
  const [users, setUsers] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [assignedUserId, setAssignedUserId] = useState<number | null>(null);
  const [newComment, setNewComment] = useState('');
  const [commentType, setCommentType] = useState<'comment' | 'note'>('comment');
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await api.get(`/report/${id}`);
        setData(res.data);
        if (res.data?.investigation) {
          setAssignedUserId(res.data.investigation.assigned_user_id || null);
        }
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load investigation result.');
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      fetchResult();
    }
  }, [id]);

  useEffect(() => {
    const fetchCollab = async () => {
      if (!id) return;
      try {
        const [uRes, cRes, aRes] = await Promise.all([
          api.get('/collaboration/users'),
          api.get(`/collaboration/investigations/${id}/comments`),
          api.get(`/collaboration/investigations/${id}/activity`)
        ]);
        setUsers(uRes.data);
        setComments(cRes.data);
        setActivities(aRes.data);
      } catch (e) {
        console.error('Failed to load collaboration data', e);
      }
    };
    fetchCollab();
  }, [id]);

  const handleDownloadPdf = async () => {
    try {
      const response = await api.get(`/report/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Strivox_Report_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert('Failed to download PDF report.');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: '4rem 1.5rem', textAlign: 'center', color: '#94a3b8' }}>
          <div className="analyzing-pulse" style={{ display: 'inline-flex', padding: '1rem', borderRadius: '50%', backgroundColor: 'rgba(14, 165, 233, 0.12)', color: '#0ea5e9', marginBottom: '1rem' }}>
            <ShieldIcon size={36} />
          </div>
          <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.5rem', color: '#f8fafc' }}>Loading Investigation Report #{id}...</h3>
          <p style={{ fontSize: '0.85rem' }}>Fetching structured AI analysis and security indicators.</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div style={{ marginBottom: '1.5rem' }}>
          <Link to="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#94a3b8', fontSize: '0.85rem' }}>
            <ArrowLeftIcon size={16} />
            <span>Back to Dashboard</span>
          </Link>
        </div>
        <div className="card-cyber" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)', padding: '2rem', textAlign: 'center' }}>
          <AlertTriangleIcon size={36} style={{ color: '#ef4444', marginBottom: '0.75rem' }} />
          <h2 style={{ fontSize: '1.2rem', color: '#fca5a5', margin: '0 0 0.5rem' }}>Error Loading Investigation</h2>
          <p style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>{error}</p>
        </div>
      </Layout>
    );
  }

  if (!data || !data.investigation) return null;

  const { investigation, report } = data;

  const handleAssignChange = async (targetUserId: string) => {
    try {
      const uid = targetUserId ? parseInt(targetUserId) : null;
      await api.post(`/collaboration/investigations/${id}/assign`, { assigned_user_id: uid });
      setAssignedUserId(uid);
      const aRes = await api.get(`/collaboration/investigations/${id}/activity`);
      setActivities(aRes.data);
    } catch (e) {
      alert('Failed to reassign investigation');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmittingComment(true);
    try {
      await api.post(`/collaboration/investigations/${id}/comments`, {
        content: newComment.trim(),
        comment_type: commentType
      });
      setNewComment('');
      const [cRes, aRes] = await Promise.all([
        api.get(`/collaboration/investigations/${id}/comments`),
        api.get(`/collaboration/investigations/${id}/activity`)
      ]);
      setComments(cRes.data);
      setActivities(aRes.data);
    } catch (e) {
      alert('Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  return (
    <Layout>
      {/* ── Header Navigation & Actions ─────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <Link to="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 500 }}>
          <ArrowLeftIcon size={16} />
          <span>Back to Dashboard</span>
        </Link>

        {report && report.pdf_path && (
          <button
            onClick={handleDownloadPdf}
            className="btn btn-primary"
            style={{ backgroundColor: '#dc2626', borderColor: '#ef4444' }}
          >
            <DownloadIcon size={16} />
            <span>Export Executive PDF Report</span>
          </button>
        )}
      </div>

      {/* ── Investigation Header Info ────────────────────────────────────────── */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: '0.85rem', color: '#0ea5e9', fontWeight: 600 }}>
            INVESTIGATION #{investigation.id}
          </span>
          {investigation.siem_source && (
            <span style={{ background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(14,165,233,0.3)', color: '#38bdf8', fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
              SIEM: {investigation.siem_source}
            </span>
          )}
          <span style={{ color: '#64748b' }}>•</span>
          <span style={{ fontSize: '0.825rem', color: '#94a3b8' }}>
            Created: {new Date(investigation.created_at).toLocaleString()}
          </span>
        </div>

        <h1 style={{ fontSize: '1.85rem', fontWeight: 700, margin: '0 0 1rem', color: '#f8fafc' }}>
          {investigation.title}
        </h1>

        {/* Badges Row + Assignment */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <StatusBadge status={investigation.status} />
          <SeverityBadge severity={investigation.severity} />
          {report?.confidence && <ConfidenceBadge confidence={report.confidence} />}

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto', background: '#0f172a', padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid #1e293b' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Assigned To:</span>
            <select
              value={assignedUserId || ''}
              onChange={(e) => handleAssignChange(e.target.value)}
              className="input-cyber"
              style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', width: 'auto' }}
            >
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Main Report Content & Sidebar Grid ───────────────────────────────── */}
      {report ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: '1.5rem', alignItems: 'start' }}>
          
          {/* Main Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Executive Incident Summary Card */}
            <div className="card-cyber" style={{ borderLeft: '4px solid #0ea5e9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem' }}>
                <div style={{ color: '#0ea5e9', display: 'flex' }}>
                  <ShieldIcon size={20} />
                </div>
                <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Executive Incident Summary</h3>
              </div>
              <p style={{ color: '#cbd5e1', fontSize: '0.925rem', lineHeight: '1.65', margin: 0 }}>
                {report.summary}
              </p>
            </div>

            {/* Threat Type Classification Card */}
            {report.threat_type && (
              <div className="card-cyber" style={{ borderLeft: '4px solid #f59e0b' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem' }}>
                  <div style={{ color: '#f59e0b', display: 'flex' }}>
                    <AlertTriangleIcon size={20} />
                  </div>
                  <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Threat Classification</h3>
                </div>
                <div style={{ display: 'inline-flex', padding: '0.4rem 0.85rem', borderRadius: '6px', backgroundColor: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#fbbf24', fontWeight: 600, fontSize: '0.9rem' }}>
                  {report.threat_type}
                </div>
              </div>
            )}

            {/* Evidence / Indicators Card */}
            {report.indicators && report.indicators.length > 0 && (
              <div className="card-cyber" style={{ borderLeft: '4px solid #6366f1' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem' }}>
                  <div style={{ color: '#818cf8', display: 'flex' }}>
                    <TerminalIcon size={20} />
                  </div>
                  <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Extracted Evidence & Indicators</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {report.indicators.map((ind: string, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.65rem',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '6px',
                        backgroundColor: '#0b1120',
                        border: '1px solid #1e293b',
                        fontSize: '0.875rem',
                        color: '#e2e8f0'
                      }}
                    >
                      <span style={{ color: '#818cf8', fontWeight: 700, lineHeight: '1.4' }}>•</span>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: '0.825rem', lineHeight: '1.5' }}>{ind}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Attack Vector & Possible Root Cause Card */}
            {report.possible_root_cause && (
              <div className="card-cyber" style={{ borderLeft: '4px solid #8b5cf6' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem' }}>
                  <div style={{ color: '#a78bfa', display: 'flex' }}>
                    <FileTextIcon size={20} />
                  </div>
                  <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Attack Vector & Possible Root Cause</h3>
                </div>
                <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.6', margin: 0 }}>
                  {report.possible_root_cause}
                </p>
              </div>
            )}

            {/* Actionable Recommendations Checklist Card */}
            {report.recommendations && report.recommendations.length > 0 && (
              <div className="card-cyber" style={{ borderLeft: '4px solid #10b981' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem' }}>
                  <div style={{ color: '#34d399', display: 'flex' }}>
                    <CheckCircleIcon size={20} />
                  </div>
                  <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Actionable SOC Recommendations</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {report.recommendations.map((rec: string, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.75rem',
                        padding: '0.75rem 1rem',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(16, 185, 129, 0.06)',
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                        fontSize: '0.875rem',
                        color: '#f8fafc'
                      }}
                    >
                      <CheckCircleIcon size={18} style={{ color: '#34d399', flexShrink: 0, marginTop: '2px' }} />
                      <span style={{ lineHeight: '1.5' }}>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Collaboration & Activity Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Comments & Notes */}
            <div className="card-cyber">
              <h3 style={{ fontSize: '1rem', marginBottom: '0.85rem', color: '#f8fafc' }}>
                Investigation Notes & Discussion
              </h3>

              <form onSubmit={handleAddComment} style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <textarea
                  rows={3}
                  className="input-cyber"
                  placeholder="Add a comment or internal investigation note..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  style={{ fontSize: '0.85rem' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <select
                    value={commentType}
                    onChange={(e: any) => setCommentType(e.target.value)}
                    className="input-cyber"
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.775rem', width: 'auto' }}
                  >
                    <option value="comment">Comment</option>
                    <option value="note">Internal Note</option>
                  </select>
                  <button type="submit" disabled={submittingComment} className="btn btn-primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}>
                    Post
                  </button>
                </div>
              </form>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '320px', overflowY: 'auto' }}>
                {comments.length === 0 ? (
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>No comments yet. Be the first to note a finding!</div>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} style={{ background: '#0b1120', padding: '0.75rem', borderRadius: '6px', border: '1px solid #1e293b' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                        <span style={{ fontWeight: 600, color: '#38bdf8' }}>{c.user?.name || 'Analyst'}</span>
                        <span>{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div style={{ fontSize: '0.825rem', color: '#cbd5e1' }}>{c.content}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Audit Activity Timeline */}
            <div className="card-cyber">
              <h3 style={{ fontSize: '1rem', marginBottom: '0.85rem', color: '#f8fafc' }}>
                Activity Timeline Audit
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '250px', overflowY: 'auto' }}>
                {activities.length === 0 ? (
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>No activity logs recorded.</div>
                ) : (
                  activities.map((act) => (
                    <div key={act.id} style={{ fontSize: '0.775rem', color: '#cbd5e1', borderLeft: '2px solid #38bdf8', paddingLeft: '0.5rem' }}>
                      <div style={{ color: '#94a3b8', fontSize: '0.7rem' }}>
                        {new Date(act.created_at).toLocaleString()} • {act.user?.name}
                      </div>
                      <div style={{ fontWeight: 500, color: '#f8fafc' }}>{act.action}</div>
                      {act.details && <div style={{ color: '#64748b' }}>{act.details}</div>}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>
      ) : (
        <div className="card-cyber" style={{ backgroundColor: 'rgba(245, 158, 11, 0.08)', borderColor: 'rgba(245, 158, 11, 0.25)', padding: '2.5rem', textAlign: 'center' }}>
          <AlertTriangleIcon size={36} style={{ color: '#f59e0b', marginBottom: '0.75rem' }} />
          <h3 style={{ fontSize: '1.1rem', color: '#fde68a', margin: '0 0 0.5rem' }}>Report Data Unavailable</h3>
          <p style={{ color: '#cbd5e1', fontSize: '0.875rem' }}>The AI analysis report data for this investigation is currently being processed or was unavailable.</p>
        </div>
      )}
    </Layout>
  );
};

export default InvestigationResult;

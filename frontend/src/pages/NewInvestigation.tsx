import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { Layout } from '../components/Layout';
import { ArrowLeftIcon, SearchIcon, FileTextIcon, AlertTriangleIcon, ActivityIcon, MailIcon, TerminalIcon, ImageIcon } from '../components/Icons';

const SAMPLE_EMAIL_EVIDENCE = `From: IT Security Desk <security-alert@update-verify-corp-portal.com>
To: john.doe@company.com
Date: Mon, 10 Aug 2026 14:32:00 -0400
Subject: URGENT: Action Required - Verify Your Account Credentials

Dear User,

Your Microsoft 365 account password is set to expire in 2 hours.
Failure to verify your identity will result in immediate suspension of your email access.

Please click the secure verification link below immediately to keep your current password:
https://login.microsoftonline.com.update-verify-corp-portal.com/auth/login

Thank you,
IT Helpdesk Support`;

const SAMPLE_SSH_EVIDENCE = `Jun 10 10:12:01 server sshd[1021]: Failed password for invalid user admin from 185.22.14.77 port 43122 ssh2
Jun 10 10:12:05 server sshd[1024]: Failed password for invalid user admin from 185.22.14.77 port 43125 ssh2
Jun 10 10:12:09 server sshd[1027]: Failed password for invalid user root from 185.22.14.77 port 43128 ssh2
Jun 10 10:12:15 server sshd[1030]: Accepted password for admin from 185.22.14.77 port 43131 ssh2
Jun 10 10:12:16 server sshd[1030]: session opened for user admin`;

const NewInvestigation: React.FC = () => {
  const [title, setTitle] = useState('');
  const [pastedEvidence, setPastedEvidence] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<'PASTE' | 'FILE' | 'SCREENSHOT'>('PASTE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'PASTE' && !pastedEvidence) {
      setError('Please paste security evidence text.');
      return;
    }
    if (activeTab === 'FILE' && !file) {
      setError('Please select a log or text file.');
      return;
    }
    if (activeTab === 'SCREENSHOT' && !screenshotFile) {
      setError('Please select a security screenshot image.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      let investigationId: number;

      if (activeTab === 'SCREENSHOT' && screenshotFile) {
        const formData = new FormData();
        formData.append('file', screenshotFile);
        if (title) formData.append('title', title);

        const imgRes = await api.post('/investigations/screenshot', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        investigationId = imgRes.data.id;
      } else {
        const formData = new FormData();
        formData.append('title', title);
        if (pastedEvidence) formData.append('pasted_evidence', pastedEvidence);
        if (file) formData.append('file', file);
        
        const invRes = await api.post('/investigations', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        investigationId = invRes.data.id;
      }
      
      // 2. Trigger AI analysis
      await api.post('/analyze', { investigation_id: investigationId });
      
      // 3. Redirect to result
      navigate(`/investigations/${investigationId}`);
      
    } catch (err: any) {
      setError(err.response?.data?.detail || 'An error occurred during investigation creation/analysis.');
    } finally {
      setLoading(false);
    }
  };

  const loadSampleEmail = () => {
    if (!title) setTitle('Phishing Email Investigation - Urgent M365 Notice');
    setPastedEvidence(SAMPLE_EMAIL_EVIDENCE);
    setActiveTab('PASTE');
  };

  const loadSampleSSH = () => {
    if (!title) setTitle('SSH Brute Force Attack Investigation');
    setPastedEvidence(SAMPLE_SSH_EVIDENCE);
    setActiveTab('PASTE');
  };

  return (
    <Layout>
      {/* ── Top Navigation / Breadcrumb ───────────────────────────────────────── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 500 }}>
          <ArrowLeftIcon size={16} />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      <div style={{ maxWidth: '850px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 0.5rem' }}>New Security Investigation</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
            Analyze raw logs, email sources, SIEM alerts, or security files using STRIVOX OpenRouter AI engine.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#fca5a5',
            padding: '0.85rem 1.15rem',
            borderRadius: '8px',
            fontSize: '0.875rem',
            marginBottom: '1.5rem'
          }}>
            <AlertTriangleIcon size={20} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Loading / Processing State Overlay */}
        {loading ? (
          <div className="card-cyber" style={{ padding: '3.5rem 2rem', textAlign: 'center', backgroundColor: '#0f172a' }}>
            <div style={{ display: 'inline-flex', padding: '1.25rem', borderRadius: '50%', backgroundColor: 'rgba(14, 165, 233, 0.12)', color: '#0ea5e9', marginBottom: '1.25rem' }} className="analyzing-pulse">
              <ActivityIcon size={40} />
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0 0 0.5rem', color: '#f8fafc' }}>
              Analyzing Security Evidence...
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', maxWidth: '480px', margin: '0 auto 2rem' }}>
              Sending evidence to OpenRouter AI model, validating security indicators, and compiling executive PDF report.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', fontSize: '0.8rem', color: '#64748b' }}>
              <span style={{ color: '#38bdf8' }}>✓ Evidence Parsed</span>
              <span>→</span>
              <span style={{ color: '#38bdf8' }}>✓ OpenRouter Engine Called</span>
              <span>→</span>
              <span style={{ color: '#38bdf8' }}>✓ Pydantic Validation</span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Title Input */}
            <div className="card-cyber">
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc', marginBottom: '0.5rem' }}>
                Investigation Title <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                className="input-cyber"
                placeholder="e.g. Phishing Email Alert - M365 Impersonation or SSH Log Analysis"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            {/* Input Mode Tabs */}
            <div className="card-cyber">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: '#0b1120', padding: '0.25rem', borderRadius: '8px', border: '1px solid #1e293b' }}>
                  <button
                    type="button"
                    onClick={() => setActiveTab('PASTE')}
                    style={{
                      padding: '0.45rem 0.85rem',
                      borderRadius: '6px',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: 'none',
                      backgroundColor: activeTab === 'PASTE' ? 'rgba(14, 165, 233, 0.18)' : 'transparent',
                      color: activeTab === 'PASTE' ? '#38bdf8' : '#94a3b8',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <TerminalIcon size={16} />
                    <span>Paste Evidence</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('FILE')}
                    style={{
                      padding: '0.45rem 0.85rem',
                      borderRadius: '6px',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: 'none',
                      backgroundColor: activeTab === 'FILE' ? 'rgba(14, 165, 233, 0.18)' : 'transparent',
                      color: activeTab === 'FILE' ? '#38bdf8' : '#94a3b8',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <FileTextIcon size={16} />
                    <span>Upload Log (.log, .txt)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('SCREENSHOT')}
                    style={{
                      padding: '0.45rem 0.85rem',
                      borderRadius: '6px',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: 'none',
                      backgroundColor: activeTab === 'SCREENSHOT' ? 'rgba(14, 165, 233, 0.18)' : 'transparent',
                      color: activeTab === 'SCREENSHOT' ? '#38bdf8' : '#94a3b8',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <ImageIcon size={16} />
                    <span>Screenshot Analysis</span>
                  </button>
                </div>

                {/* Quick Sample Helpers */}
                {activeTab === 'PASTE' && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={loadSampleEmail}
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                    >
                      <MailIcon size={14} />
                      <span>Sample Phishing Email</span>
                    </button>
                    <button
                      type="button"
                      onClick={loadSampleSSH}
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                    >
                      <TerminalIcon size={14} />
                      <span>Sample SSH Log</span>
                    </button>
                  </div>
                )}
              </div>

              {activeTab === 'PASTE' && (
                <div>
                  <textarea
                    rows={10}
                    className="input-cyber code-font"
                    placeholder="Paste raw email headers, body content, SSH logs, web server logs, or security alerts here..."
                    value={pastedEvidence}
                    onChange={(e) => setPastedEvidence(e.target.value)}
                    style={{ fontSize: '0.85rem', lineHeight: '1.6' }}
                  />
                </div>
              )}

              {activeTab === 'FILE' && (
                <div style={{
                  border: '2px dashed #1e293b',
                  borderRadius: '8px',
                  padding: '2.5rem 1.5rem',
                  textAlign: 'center',
                  backgroundColor: '#0b1120'
                }}>
                  <div style={{ color: '#0ea5e9', marginBottom: '0.75rem', display: 'flex', justifyContent: 'center' }}>
                    <FileTextIcon size={36} />
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f8fafc', marginBottom: '0.25rem' }}>
                    Select a Security Log or Email File
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1.25rem' }}>
                    Supports raw text files (.log, .txt)
                  </div>
                  <input
                    type="file"
                    accept=".log,.txt"
                    onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                    style={{ display: 'none' }}
                    id="file-input"
                  />
                  <label htmlFor="file-input" className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                    Browse File
                  </label>
                  {file && (
                    <div style={{ marginTop: '1rem', color: '#38bdf8', fontSize: '0.85rem', fontWeight: 500 }}>
                      Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'SCREENSHOT' && (
                <div style={{
                  border: '2px dashed #1e293b',
                  borderRadius: '8px',
                  padding: '2.5rem 1.5rem',
                  textAlign: 'center',
                  backgroundColor: '#0b1120'
                }}>
                  <div style={{ color: '#0ea5e9', marginBottom: '0.75rem', display: 'flex', justifyContent: 'center' }}>
                    <ImageIcon size={36} />
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f8fafc', marginBottom: '0.25rem' }}>
                    Upload Security Screenshot / Image
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1.25rem' }}>
                    Supports terminal screenshots, alert images, SIEM dashboards (.png, .jpg, .webp)
                  </div>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => setScreenshotFile(e.target.files ? e.target.files[0] : null)}
                    style={{ display: 'none' }}
                    id="screenshot-input"
                  />
                  <label htmlFor="screenshot-input" className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                    Browse Image
                  </label>
                  {screenshotFile && (
                    <div style={{ marginTop: '1rem', color: '#38bdf8', fontSize: '0.85rem', fontWeight: 500 }}>
                      Selected Image: {screenshotFile.name} ({(screenshotFile.size / 1024).toFixed(1)} KB)
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Submit Action */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <Link to="/dashboard">
                <button type="button" className="btn btn-secondary">Cancel</button>
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ padding: '0.7rem 1.5rem', fontSize: '0.9rem' }}
              >
                <SearchIcon size={18} />
                <span>Start AI Analysis</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </Layout>
  );
};

export default NewInvestigation;

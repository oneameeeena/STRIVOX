import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { SettingsIcon, RadioIcon, GlobeIcon, MailIcon } from '../components/Icons';
import api from '../api';

interface SIEMConfig {
  id?: number;
  provider: string;
  name: string;
  api_url?: string;
  enabled: number;
}

interface ThreatIntelConfig {
  id?: number;
  provider: string;
  enabled: number;
}

export const IntegrationsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'siem' | 'ti' | 'email'>('siem');
  const [siemConfigs, setSiemConfigs] = useState<SIEMConfig[]>([]);
  const [_tiConfigs, setTiConfigs] = useState<ThreatIntelConfig[]>([]);
  const [_loading, setLoading] = useState<boolean>(true);

  // Form states for new SIEM
  const [siemProvider, setSiemProvider] = useState<string>('splunk');
  const [siemName, setSiemName] = useState<string>('');
  const [siemUrl, setSiemUrl] = useState<string>('');
  const [siemKey, setSiemKey] = useState<string>('');
  const [siemTestStatus, setSiemTestStatus] = useState<string | null>(null);

  // Form states for TI
  const [vtKey, setVtKey] = useState<string>('');
  const [abuseKey, setAbuseKey] = useState<string>('');
  const [otxKey, setOtxKey] = useState<string>('');
  const [tiSaveMsg, setTiSaveMsg] = useState<string | null>(null);

  // Form states for SMTP Email
  const [smtpHost, setSmtpHost] = useState<string>('');
  const [smtpPort, setSmtpPort] = useState<number>(587);
  const [smtpUser, setSmtpUser] = useState<string>('');
  const [smtpPass, setSmtpPass] = useState<string>('');
  const [senderEmail, setSenderEmail] = useState<string>('');
  const [useTls, setUseTls] = useState<boolean>(true);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);

  const fetchConfigs = async () => {
    try {
      const [sRes, tRes, nRes] = await Promise.all([
        api.get('/siem/configs'),
        api.get('/threat-intel/configs'),
        api.get('/notifications/config')
      ]);
      setSiemConfigs(sRes.data);
      setTiConfigs(tRes.data);

      if (nRes.data) {
        setSmtpHost(nRes.data.smtp_host || '');
        setSmtpPort(nRes.data.smtp_port || 587);
        setSmtpUser(nRes.data.smtp_user || '');
        setSenderEmail(nRes.data.sender_email || '');
        setUseTls(!!nRes.data.use_tls);
      }
    } catch (err) {
      console.error('Failed to load integration configurations', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleTestSiem = async () => {
    setSiemTestStatus('Testing connection...');
    try {
      const res = await api.post('/siem/test', {
        provider: siemProvider,
        api_url: siemUrl,
        api_key: siemKey
      });
      setSiemTestStatus(res.data.message);
    } catch (err: any) {
      setSiemTestStatus('Test failed: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleSaveSiem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/siem/configs', {
        provider: siemProvider,
        name: siemName || `${siemProvider.toUpperCase()} Integration`,
        api_url: siemUrl,
        api_key: siemKey,
        enabled: 1
      });
      setSiemName('');
      setSiemUrl('');
      setSiemKey('');
      setSiemTestStatus('SIEM Integration saved successfully.');
      fetchConfigs();
    } catch (err) {
      alert('Failed to save SIEM configuration');
    }
  };

  const handleSaveTI = async (provider: string, apiKey: string) => {
    try {
      await api.post('/threat-intel/configs', { provider, api_key: apiKey, enabled: 1 });
      setTiSaveMsg(`Successfully saved ${provider.toUpperCase()} API key.`);
      fetchConfigs();
    } catch (err) {
      alert('Failed to save Threat Intelligence API key');
    }
  };

  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/notifications/config', {
        smtp_host: smtpHost,
        smtp_port: smtpPort,
        smtp_user: smtpUser,
        smtp_password: smtpPass,
        sender_email: senderEmail,
        use_tls: useTls ? 1 : 0,
        notify_on_critical: 1,
        notify_on_assigned: 1
      });
      setEmailStatus('SMTP Notification configuration saved.');
    } catch (err) {
      setEmailStatus('Failed to save SMTP configuration.');
    }
  };

  const handleTestEmail = async () => {
    setEmailStatus('Sending test email...');
    try {
      const res = await api.post('/notifications/test');
      setEmailStatus(res.data.message);
    } catch (err: any) {
      setEmailStatus('Failed: ' + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <Layout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', maxWidth: '1050px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(14, 165, 233, 0.15)', color: '#0ea5e9', display: 'flex' }}>
            <SettingsIcon size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Integrations & External Services</h1>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Configure SIEM providers, Threat Intelligence API keys, and Email notifications</div>
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #1e293b', paddingBottom: '0.5rem' }}>
          <button
            onClick={() => setActiveTab('siem')}
            className={`btn ${activeTab === 'siem' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.45rem 1rem', fontSize: '0.875rem' }}
          >
            <RadioIcon size={16} />
            <span>SIEM Systems</span>
          </button>
          <button
            onClick={() => setActiveTab('ti')}
            className={`btn ${activeTab === 'ti' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.45rem 1rem', fontSize: '0.875rem' }}
          >
            <GlobeIcon size={16} />
            <span>Threat Intelligence</span>
          </button>
          <button
            onClick={() => setActiveTab('email')}
            className={`btn ${activeTab === 'email' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.45rem 1rem', fontSize: '0.875rem' }}
          >
            <MailIcon size={16} />
            <span>Email Notifications</span>
          </button>
        </div>

        {/* TAB 1: SIEM INTEGRATIONS */}
        {activeTab === 'siem' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card-cyber">
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#f8fafc' }}>Configure SIEM Integration</h3>
              <form onSubmit={handleSaveSiem} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>SIEM Provider</label>
                    <select
                      value={siemProvider}
                      onChange={(e) => setSiemProvider(e.target.value)}
                      className="input-cyber"
                    >
                      <option value="splunk">Splunk Enterprise / Cloud</option>
                      <option value="sentinel">Microsoft Sentinel</option>
                      <option value="elastic">Elastic Security / ELK</option>
                      <option value="webhook">Generic REST API / Webhook</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>Integration Name</label>
                    <input
                      type="text"
                      className="input-cyber"
                      placeholder="e.g. Corporate Splunk SOC"
                      value={siemName}
                      onChange={(e) => setSiemName(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>API Endpoint / Webhook URL</label>
                  <input
                    type="text"
                    className="input-cyber"
                    placeholder="https://siem.company.com/api/v1/events or webhook endpoint"
                    value={siemUrl}
                    onChange={(e) => setSiemUrl(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>API Token / Key</label>
                  <input
                    type="password"
                    className="input-cyber"
                    placeholder="Bearer token or API secret key"
                    value={siemKey}
                    onChange={(e) => setSiemKey(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button type="button" onClick={handleTestSiem} className="btn btn-secondary">
                    Test SIEM Connection
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Save SIEM Config
                  </button>
                </div>

                {siemTestStatus && (
                  <div style={{ marginTop: '0.5rem', padding: '0.75rem', borderRadius: '6px', background: '#0b1120', border: '1px solid #1e293b', fontSize: '0.85rem', color: '#38bdf8' }}>
                    {siemTestStatus}
                  </div>
                )}
              </form>
            </div>

            {/* Active SIEM List */}
            <div className="card-cyber">
              <h3 style={{ fontSize: '1rem', marginBottom: '0.85rem', color: '#f8fafc' }}>Active SIEM Connections ({siemConfigs.length})</h3>
              {siemConfigs.length === 0 ? (
                <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No SIEM providers configured yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {siemConfigs.map((cfg) => (
                    <div key={cfg.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0b1120', padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid #1e293b' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: '#f8fafc' }}>{cfg.name}</div>
                        <div style={{ fontSize: '0.775rem', color: '#94a3b8' }}>Provider: {cfg.provider.toUpperCase()} | URL: {cfg.api_url || 'Webhook Mode'}</div>
                      </div>
                      <span className="badge badge-completed">Active</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: THREAT INTELLIGENCE */}
        {activeTab === 'ti' && (
          <div className="card-cyber" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', color: '#f8fafc' }}>Threat Intelligence API Keys</h3>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
              Configure API keys for external threat intelligence providers. If left blank, STRIVOX automatically operates using built-in intelligence heuristics.
            </p>

            {tiSaveMsg && (
              <div style={{ padding: '0.75rem', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontSize: '0.85rem' }}>
                {tiSaveMsg}
              </div>
            )}

            {/* VirusTotal */}
            <div style={{ background: '#0b1120', padding: '1rem', borderRadius: '8px', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ fontWeight: 600, color: '#38bdf8' }}>VirusTotal v3 API Key</div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <input
                  type="password"
                  className="input-cyber"
                  placeholder="Enter VirusTotal API Key"
                  value={vtKey}
                  onChange={(e) => setVtKey(e.target.value)}
                  style={{ flexGrow: 1 }}
                />
                <button onClick={() => handleSaveTI('virustotal', vtKey)} className="btn btn-primary">
                  Save Key
                </button>
              </div>
            </div>

            {/* AbuseIPDB */}
            <div style={{ background: '#0b1120', padding: '1rem', borderRadius: '8px', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ fontWeight: 600, color: '#38bdf8' }}>AbuseIPDB API Key</div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <input
                  type="password"
                  className="input-cyber"
                  placeholder="Enter AbuseIPDB API Key"
                  value={abuseKey}
                  onChange={(e) => setAbuseKey(e.target.value)}
                  style={{ flexGrow: 1 }}
                />
                <button onClick={() => handleSaveTI('abuseipdb', abuseKey)} className="btn btn-primary">
                  Save Key
                </button>
              </div>
            </div>

            {/* AlienVault OTX */}
            <div style={{ background: '#0b1120', padding: '1rem', borderRadius: '8px', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ fontWeight: 600, color: '#38bdf8' }}>AlienVault OTX API Key</div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <input
                  type="password"
                  className="input-cyber"
                  placeholder="Enter AlienVault OTX API Key"
                  value={otxKey}
                  onChange={(e) => setOtxKey(e.target.value)}
                  style={{ flexGrow: 1 }}
                />
                <button onClick={() => handleSaveTI('otx', otxKey)} className="btn btn-primary">
                  Save Key
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: EMAIL NOTIFICATIONS */}
        {activeTab === 'email' && (
          <div className="card-cyber">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#f8fafc' }}>SMTP Email Configuration</h3>
            <form onSubmit={handleSaveEmail} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>SMTP Host Server</label>
                  <input
                    type="text"
                    className="input-cyber"
                    placeholder="smtp.company.com or smtp.gmail.com"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>Port</label>
                  <input
                    type="number"
                    className="input-cyber"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(parseInt(e.target.value) || 587)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>SMTP Username</label>
                  <input
                    type="text"
                    className="input-cyber"
                    placeholder="soc-alert@company.com"
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>SMTP Password / App Secret</label>
                  <input
                    type="password"
                    className="input-cyber"
                    placeholder="••••••••••••"
                    value={smtpPass}
                    onChange={(e) => setSmtpPass(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>Sender Email Address</label>
                <input
                  type="email"
                  className="input-cyber"
                  placeholder="strivox-alerts@company.com"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="tlsCheck"
                  checked={useTls}
                  onChange={(e) => setUseTls(e.target.checked)}
                />
                <label htmlFor="tlsCheck" style={{ fontSize: '0.85rem', color: '#cbd5e1', cursor: 'pointer' }}>
                  Enable TLS Encryption (Recommended)
                </label>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={handleTestEmail} className="btn btn-secondary">
                  Send Test Email
                </button>
                <button type="submit" className="btn btn-primary">
                  Save SMTP Settings
                </button>
              </div>

              {emailStatus && (
                <div style={{ marginTop: '0.5rem', padding: '0.75rem', borderRadius: '6px', background: '#0b1120', border: '1px solid #1e293b', fontSize: '0.85rem', color: '#38bdf8' }}>
                  {emailStatus}
                </div>
              )}
            </form>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default IntegrationsPage;

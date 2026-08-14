import React, { useState } from 'react';
import { Layout } from '../components/Layout';
import { GlobeIcon, SearchIcon } from '../components/Icons';
import api from '../api';

interface ThreatIntelResult {
  indicator: string;
  type: string;
  reputation: string;
  confidence: string;
  detection_count: string;
  threat_categories: string[];
  provider: string;
  details?: string;
}

export const ThreatIntelPage: React.FC = () => {
  const [indicator, setIndicator] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<ThreatIntelResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!indicator.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await api.post('/threat-intel/enrich', { indicator: indicator.trim() });
      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to query threat intelligence provider.');
    } finally {
      setLoading(false);
    }
  };

  const sampleIndicators = [
    'login.microsoftonline.com.update-verify-corp-portal.com',
    '198.51.100.42',
    'security-alert@update-verify-corp-portal.com',
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
  ];

  return (
    <Layout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', maxWidth: '1000px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', display: 'flex' }}>
            <GlobeIcon size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Threat Intelligence Lookup</h1>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Enrich IP addresses, domains, URLs, file hashes, and email addresses</div>
          </div>
        </div>

        {/* Search Bar Card */}
        <div className="card-cyber">
          <form onSubmit={handleLookup} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              className="input-cyber"
              placeholder="Enter IP, domain, URL, or hash (e.g. 198.51.100.42 or malware.exe hash)"
              value={indicator}
              onChange={(e) => setIndicator(e.target.value)}
              style={{ flexGrow: 1, padding: '0.75rem 1rem', fontSize: '0.95rem' }}
            />
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: '0.75rem 1.5rem' }}>
              <SearchIcon size={18} />
              <span>{loading ? 'Searching TI Feeds...' : 'Lookup Indicator'}</span>
            </button>
          </form>

          <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.8rem', color: '#64748b' }}>
            <span>Quick Samples:</span>
            {sampleIndicators.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setIndicator(s)}
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #1e293b', color: '#94a3b8', padding: '0.2rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.775rem' }}
              >
                {s.length > 25 ? s.substring(0, 25) + '...' : s}
              </button>
            ))}
          </div>
        </div>

        {/* Error notice */}
        {error && (
          <div style={{ padding: '1rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#fca5a5' }}>
            {error}
          </div>
        )}

        {/* Result Card */}
        {result && (
          <div className="card-cyber" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b', paddingBottom: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Indicator Analyzed</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#38bdf8', marginTop: '0.2rem', fontFamily: 'var(--mono)' }}>
                  {result.indicator}
                </div>
              </div>
              <span className={`badge ${result.reputation.includes('Malicious') ? 'badge-critical' : 'badge-completed'}`} style={{ fontSize: '0.9rem', padding: '0.4rem 0.85rem' }}>
                {result.reputation}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div style={{ background: '#0b1120', padding: '0.85rem', borderRadius: '6px', border: '1px solid #1e293b' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Indicator Type</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f8fafc', textTransform: 'uppercase', marginTop: '0.25rem' }}>{result.type}</div>
              </div>

              <div style={{ background: '#0b1120', padding: '0.85rem', borderRadius: '6px', border: '1px solid #1e293b' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Confidence Level</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#a5b4fc', marginTop: '0.25rem' }}>{result.confidence}</div>
              </div>

              <div style={{ background: '#0b1120', padding: '0.85rem', borderRadius: '6px', border: '1px solid #1e293b' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Vendor Detections</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fdba74', marginTop: '0.25rem' }}>{result.detection_count}</div>
              </div>

              <div style={{ background: '#0b1120', padding: '0.85rem', borderRadius: '6px', border: '1px solid #1e293b' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Intelligence Provider</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#38bdf8', marginTop: '0.25rem' }}>{result.provider}</div>
              </div>
            </div>

            {result.threat_categories && result.threat_categories.length > 0 && (
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.5rem' }}>Threat Categories</div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {result.threat_categories.map((cat, idx) => (
                    <span key={idx} style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '0.25rem 0.65rem', borderRadius: '4px', fontSize: '0.8rem' }}>
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {result.details && (
              <div style={{ background: '#0b1120', padding: '1rem', borderRadius: '6px', border: '1px solid #1e293b', fontSize: '0.875rem', color: '#cbd5e1' }}>
                {result.details}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ThreatIntelPage;

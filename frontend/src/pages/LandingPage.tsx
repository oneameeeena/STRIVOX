import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldIcon, ShieldAlertIcon, SearchIcon, FileTextIcon, ArrowRightIcon, DatabaseIcon, ActivityIcon, AlertTriangleIcon } from '../components/Icons';
import './LandingPage.css';

const LandingPage: React.FC = () => {
  const scrollToHowItWorks = () => {
    const el = document.getElementById('how-it-works');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="landing-logo">
          <div className="landing-logo-icon">
            <ShieldIcon size={24} />
          </div>
          <span className="landing-logo-text">STRIVOX</span>
        </div>
        <div>
          <Link to="/login" className="btn btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
            Login
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-bg-glow"></div>
        <div className="hero-content">
          <div className="hero-badge">
            <ActivityIcon size={14} />
            AI-POWERED SECURITY INVESTIGATION
          </div>
          <h1 className="hero-title">Turn Security Evidence into Actionable Intelligence.</h1>
          <p className="hero-subtitle">
            Analyze security logs and alerts with AI, identify potential threats, understand severity and possible root causes, and generate professional investigation reports.
          </p>
          <div className="hero-buttons">
            <Link to="/login" className="btn btn-primary" style={{ padding: '0.8rem 1.5rem', fontSize: '1rem' }}>
              Start Investigation
            </Link>
            <button onClick={scrollToHowItWorks} className="btn btn-secondary" style={{ padding: '0.8rem 1.5rem', fontSize: '1rem' }}>
              See How It Works
            </button>
          </div>
        </div>

        {/* Hero Visual */}
        <div className="hero-visual">
          <div className="visual-flow">
            <div className="visual-node">
              <div className="visual-node-icon" style={{ color: '#94a3b8' }}>
                <DatabaseIcon size={24} />
              </div>
              Raw Security Evidence
            </div>
            <div className="visual-arrow">
              <ArrowRightIcon size={24} />
            </div>
            <div className="visual-node" style={{ borderColor: 'rgba(14, 165, 233, 0.4)', boxShadow: '0 0 20px rgba(14, 165, 233, 0.15)' }}>
              <div className="visual-node-icon" style={{ color: '#38bdf8', backgroundColor: 'rgba(14, 165, 233, 0.1)' }}>
                <ActivityIcon size={24} />
              </div>
              STRIVOX AI Analysis
            </div>
            <div className="visual-arrow">
              <ArrowRightIcon size={24} />
            </div>
            <div className="visual-node">
              <div className="visual-node-icon" style={{ color: '#34d399' }}>
                <FileTextIcon size={24} />
              </div>
              Investigation Report
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="landing-section">
        <h2 className="landing-section-title">Security investigations shouldn't start with hours of manual analysis.</h2>
        <p className="landing-section-subtitle">
          Security teams receive large amounts of logs, alerts and raw evidence. Turning that data into a clear investigation can be slow and repetitive.
        </p>
        
        <div className="grid-3">
          <div className="feature-card">
            <div className="feature-number">01</div>
            <h3 className="feature-title">Raw Evidence</h3>
            <p className="feature-desc">Logs and alerts contain valuable signals but are difficult to interpret quickly.</p>
          </div>
          <div className="feature-card">
            <div className="feature-number">02</div>
            <h3 className="feature-title">Manual Investigation</h3>
            <p className="feature-desc">Analysts spend time connecting events and identifying what matters.</p>
          </div>
          <div className="feature-card">
            <div className="feature-number">03</div>
            <h3 className="feature-title">Reporting</h3>
            <p className="feature-desc">Turning findings into clear, actionable reports takes additional effort.</p>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="landing-section" style={{ backgroundColor: 'rgba(15, 23, 42, 0.3)', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
        <h2 className="landing-section-title">Meet STRIVOX</h2>
        <p className="landing-section-subtitle">
          STRIVOX helps transform raw security evidence into a structured investigation in seconds.
        </p>

        <div className="grid-3">
          <div className="solution-card">
            <div className="solution-icon">
              <SearchIcon size={32} />
            </div>
            <h3 className="feature-title">ANALYZE</h3>
            <p className="feature-desc">Process security logs and alerts with AI.</p>
          </div>
          <div className="solution-card">
            <div className="solution-icon">
              <ShieldAlertIcon size={32} />
            </div>
            <h3 className="feature-title">INVESTIGATE</h3>
            <p className="feature-desc">Identify threat type, severity and possible root cause.</p>
          </div>
          <div className="solution-card">
            <div className="solution-icon">
              <FileTextIcon size={32} />
            </div>
            <h3 className="feature-title">REPORT</h3>
            <p className="feature-desc">Generate actionable recommendations and export a professional PDF report.</p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="landing-section">
        <h2 className="landing-section-title">From Evidence to Investigation</h2>
        <div style={{ height: '3rem' }}></div>
        
        <div className="grid-3" style={{ position: 'relative' }}>
          <div className="feature-card" style={{ background: 'transparent', border: 'none' }}>
            <div className="feature-number" style={{ fontSize: '2rem', opacity: 0.5, marginBottom: '0.5rem' }}>01</div>
            <h3 className="feature-title" style={{ color: '#38bdf8' }}>UPLOAD OR PASTE</h3>
            <p className="feature-desc">Upload a .log or .txt file, or paste raw security evidence.</p>
          </div>
          <div className="feature-card" style={{ background: 'transparent', border: 'none' }}>
            <div className="feature-number" style={{ fontSize: '2rem', opacity: 0.5, marginBottom: '0.5rem' }}>02</div>
            <h3 className="feature-title" style={{ color: '#38bdf8' }}>AI ANALYSIS</h3>
            <p className="feature-desc">STRIVOX analyzes the evidence and identifies relevant security findings.</p>
          </div>
          <div className="feature-card" style={{ background: 'transparent', border: 'none' }}>
            <div className="feature-number" style={{ fontSize: '2rem', opacity: 0.5, marginBottom: '0.5rem' }}>03</div>
            <h3 className="feature-title" style={{ color: '#38bdf8' }}>INVESTIGATION REPORT</h3>
            <p className="feature-desc">Receive a structured investigation with severity, threat classification, possible root cause and recommended actions.</p>
          </div>
        </div>
      </section>

      {/* Output Preview */}
      <section className="landing-section" style={{ paddingTop: '2rem' }}>
        <div className="preview-container">
          <div className="preview-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600 }}>
              <ShieldIcon size={18} style={{ color: '#38bdf8' }} />
              Investigation Result
            </div>
            <div className="badge badge-high" style={{ padding: '0.35rem 0.75rem' }}>
              <AlertTriangleIcon size={14} />
              Severity: HIGH
            </div>
          </div>
          <div className="preview-body">
            <div className="preview-section">
              <div className="preview-section-title">Incident Summary</div>
              <div className="preview-section-content">Multiple failed authentication attempts detected from IP 192.168.1.105 targeting the administrator account, followed by a successful login and execution of an unrecognized powershell script.</div>
            </div>
            <div className="preview-section">
              <div className="preview-section-title">Threat Type</div>
              <div className="preview-section-content" style={{ display: 'inline-block', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.3)', backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>Brute Force / Lateral Movement</div>
            </div>
            <div className="preview-section">
              <div className="preview-section-title">Possible Root Cause</div>
              <div className="preview-section-content">Compromised credentials or lack of multi-factor authentication on the administrator account.</div>
            </div>
            <div className="preview-section">
              <div className="preview-section-title">Recommended Actions</div>
              <div className="preview-section-content">
                <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                  <li style={{ marginBottom: '0.5rem' }}>Immediately isolate the affected host (192.168.1.105) from the network.</li>
                  <li style={{ marginBottom: '0.5rem' }}>Reset the administrator account credentials and enforce MFA.</li>
                  <li>Investigate the executed powershell script for potential backdoor installation or data exfiltration.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <Link to="/login" className="btn btn-secondary">
            Start Your Investigation
          </Link>
        </div>
      </section>

      {/* Trust Section */}
      <section className="trust-section">
        <h3 className="trust-title">Designed For</h3>
        <div className="trust-roles">
          <div className="trust-role">SOC Analysts</div>
          <div className="trust-role">Security Students</div>
          <div className="trust-role">Ethical Hackers</div>
          <div className="trust-role">System Administrators</div>
          <div className="trust-role">Small Security Teams</div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="final-cta">
        <h2 className="landing-section-title">Ready to investigate smarter?</h2>
        <p className="landing-section-subtitle" style={{ margin: '0 auto 2.5rem' }}>
          Turn raw security evidence into clear, actionable intelligence with STRIVOX.
        </p>
        <Link to="/login" className="btn btn-primary" style={{ padding: '0.8rem 2rem', fontSize: '1.1rem' }}>
          Start Investigation
        </Link>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-brand">
          <div className="landing-logo-text" style={{ fontSize: '1.25rem' }}>STRIVOX</div>
          <div style={{ color: '#64748b', fontSize: '0.85rem' }}>AI Security Investigation Assistant</div>
        </div>
        <div className="footer-links">
          <Link to="/" className="footer-link">Product</Link>
          <a href="#how-it-works" className="footer-link">How It Works</a>
          <Link to="/login" className="footer-link">Login</Link>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

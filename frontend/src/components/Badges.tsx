import React from 'react';

interface SeverityBadgeProps {
  severity: string;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity }) => {
  const sev = (severity || 'Low').toLowerCase();
  let badgeClass = 'badge-low';
  
  if (sev.includes('crit')) badgeClass = 'badge-critical';
  else if (sev.includes('high')) badgeClass = 'badge-high';
  else if (sev.includes('med')) badgeClass = 'badge-medium';

  return (
    <span className={`badge ${badgeClass}`}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'currentColor' }}></span>
      {severity || 'Low'}
    </span>
  );
};

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const st = (status || 'Pending').toLowerCase();
  let badgeClass = 'badge-analyzing';
  
  if (st === 'completed' || st === 'complete') badgeClass = 'badge-completed';
  else if (st === 'failed') badgeClass = 'badge-failed';
  else if (st === 'analyzing') badgeClass = 'badge-analyzing';
  else badgeClass = 'badge-low';

  return (
    <span className={`badge ${badgeClass}`}>
      {st === 'analyzing' && (
        <span className="analyzing-pulse" style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'currentColor' }}></span>
      )}
      {status || 'Pending'}
    </span>
  );
};

interface ConfidenceBadgeProps {
  confidence?: string;
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({ confidence = 'High' }) => {
  return (
    <span className="badge badge-confidence">
      Confidence: {confidence}
    </span>
  );
};

import React from 'react';

type Status = 'demo' | 'functional';

const statusColors: Record<Status, string> = {
  demo: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30',
  functional: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
};

export const FeatureStatusBadge: React.FC<{
  status?: Status;
  className?: string;
}> = ({ status, className }) => {
  // Default to 'functional' unless explicitly set to 'demo'
  const envStatus = import.meta.env.VITE_FEATURE_STATUS as Status | undefined;
  const resolved = (status || envStatus || 'functional') as Status;
  const label = resolved === 'functional' ? 'Functional' : 'Demo';

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
        statusColors[resolved]
      } ${className || ''}`}
      title={`Feature status: ${label}`}
    >
      {label}
    </span>
  );
};

export default FeatureStatusBadge;

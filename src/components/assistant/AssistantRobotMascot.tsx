/** Calm fixed-corner PayrollAO robot (subtle idle only). */

interface AssistantRobotMascotProps {
  open?: boolean;
  busy?: boolean;
  className?: string;
}

export function AssistantRobotMascot({ open = false, busy = false, className }: AssistantRobotMascotProps) {
  return (
    <span className={className} aria-hidden>
      <svg
        viewBox="0 0 96 120"
        width="88"
        height="110"
        className={busy ? "pao-robot pao-robot--busy" : open ? "pao-robot pao-robot--open" : "pao-robot"}
      >
        <defs>
          <linearGradient id="paoRobotBody" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7dd3e8" />
            <stop offset="55%" stopColor="#2f8fa8" />
            <stop offset="100%" stopColor="#1a5f72" />
          </linearGradient>
          <linearGradient id="paoRobotMetal" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f4f7f8" />
            <stop offset="100%" stopColor="#c5d0d6" />
          </linearGradient>
        </defs>

        <ellipse cx="48" cy="112" rx="26" ry="5" fill="rgba(0,0,0,0.18)" className="pao-robot-shadow" />

        <g className="pao-robot-root">
          <line x1="48" y1="10" x2="48" y2="22" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
          <circle cx="48" cy="8" r="5" fill="#38bdf8" className="pao-robot-antenna" />

          <rect x="26" y="20" width="44" height="34" rx="12" fill="url(#paoRobotMetal)" stroke="#64748b" strokeWidth="2" />
          <rect x="32" y="28" width="32" height="18" rx="6" fill="#0f172a" />
          <circle cx="40" cy="37" r="4.5" fill="#22d3ee" className="pao-robot-eye" />
          <circle cx="56" cy="37" r="4.5" fill="#22d3ee" className="pao-robot-eye" />
          <circle cx="41.5" cy="35.5" r="1.4" fill="#fff" />
          <circle cx="57.5" cy="35.5" r="1.4" fill="#fff" />
          <rect x="42" y="46" width="12" height="3" rx="1.5" fill="#67e8f9" />

          <rect x="42" y="52" width="12" height="8" rx="2" fill="#94a3b8" />

          <rect x="24" y="58" width="48" height="36" rx="10" fill="url(#paoRobotBody)" stroke="#1e4d5c" strokeWidth="2" />
          <rect x="34" y="66" width="28" height="16" rx="4" fill="#082f3a" opacity="0.85" />
          <circle cx="48" cy="74" r="3.5" fill="#67e8f9" className="pao-robot-chest" />
          <text x="48" y="88" textAnchor="middle" fontSize="7" fontFamily="Arial, sans-serif" fill="#e0f2fe" fontWeight="700">
            PAO
          </text>

          {/* arms — static, move with body only */}
          <rect x="10" y="62" width="14" height="10" rx="5" fill="url(#paoRobotMetal)" stroke="#64748b" strokeWidth="1.5" />
          <rect x="8" y="70" width="10" height="18" rx="5" fill="#94a3b8" />
          <circle cx="13" cy="90" r="6" fill="url(#paoRobotMetal)" stroke="#64748b" strokeWidth="1.5" />

          <rect x="72" y="62" width="14" height="10" rx="5" fill="url(#paoRobotMetal)" stroke="#64748b" strokeWidth="1.5" />
          <rect x="78" y="70" width="10" height="18" rx="5" fill="#94a3b8" />
          <circle cx="83" cy="90" r="6" fill="url(#paoRobotMetal)" stroke="#64748b" strokeWidth="1.5" />

          <rect x="30" y="92" width="12" height="14" rx="4" fill="#64748b" />
          <rect x="54" y="92" width="12" height="14" rx="4" fill="#64748b" />
          <rect x="27" y="104" width="18" height="7" rx="3" fill="#0f172a" />
          <rect x="51" y="104" width="18" height="7" rx="3" fill="#0f172a" />
        </g>
      </svg>
    </span>
  );
}

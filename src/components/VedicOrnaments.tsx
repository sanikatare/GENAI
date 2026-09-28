import React from 'react';

export function SacredMandalaWheel({ className = 'w-64 h-64' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="120" cy="120" r="114" stroke="currentColor" strokeWidth="0.75" strokeDasharray="3 3" />
      <circle cx="120" cy="120" r="104" stroke="currentColor" strokeWidth="1" />
      <circle cx="120" cy="120" r="86" stroke="currentColor" strokeWidth="0.75" />
      <circle cx="120" cy="120" r="64" stroke="currentColor" strokeWidth="0.75" />
      <circle cx="120" cy="120" r="42" stroke="currentColor" strokeWidth="0.75" />
      <circle cx="120" cy="120" r="18" stroke="currentColor" strokeWidth="1" />
      <circle cx="120" cy="120" r="5" fill="currentColor" />

      {/* 12 Lotus Petals & Rays representing the 10 Mandalas & Cosmic Order (Rta) */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = i * 30;
        return (
          <g key={i} transform={`rotate(${angle} 120 120)`}>
            <line x1="120" y1="6" x2="120" y2="36" stroke="currentColor" strokeWidth="0.6" />
            <path
              d="M120 36 C129 52, 129 68, 120 84 C111 68, 111 52, 120 36 Z"
              stroke="currentColor"
              strokeWidth="0.85"
            />
            <path
              d="M120 78 C126 90, 126 96, 120 102 C114 96, 114 90, 120 78 Z"
              stroke="currentColor"
              strokeWidth="0.75"
            />
            <circle cx="120" cy="24" r="2" fill="currentColor" />
          </g>
        );
      })}
    </svg>
  );
}

export function VedicEmblem({ className = 'w-9 h-9' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth="0.75" strokeDasharray="2 2" />
      {Array.from({ length: 8 }).map((_, i) => (
        <g key={i} transform={`rotate(${i * 45} 24 24)`}>
          <path
            d="M24 6 C27.5 12, 27.5 16, 24 20 C20.5 16, 20.5 12, 24 6 Z"
            stroke="currentColor"
            strokeWidth="1.1"
          />
        </g>
      ))}
      <circle cx="24" cy="24" r="5" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="24" cy="24" r="2" fill="currentColor" />
    </svg>
  );
}

export function LotusDivider({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 select-none ${className}`} aria-hidden="true">
      <div className="h-px w-16 sm:w-28 bg-gradient-to-r from-transparent via-[#C89D54] to-[#B6862C]" />
      <div className="w-1.5 h-1.5 rotate-45 bg-[#B6862C]" />
      <svg viewBox="0 0 36 20" className="w-8 h-5 text-[#9A3412]" fill="none">
        <path
          d="M18 2 C21 8, 22 13, 18 18 C14 13, 15 8, 18 2 Z"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <path
          d="M18 18 C24 14, 28 10, 31 6 C26 7, 22 10, 18 18 Z"
          stroke="currentColor"
          strokeWidth="1.1"
        />
        <path
          d="M18 18 C12 14, 8 10, 5 6 C10 7, 14 10, 18 18 Z"
          stroke="currentColor"
          strokeWidth="1.1"
        />
      </svg>
      <div className="w-1.5 h-1.5 rotate-45 bg-[#B6862C]" />
      <div className="h-px w-16 sm:w-28 bg-gradient-to-l from-transparent via-[#C89D54] to-[#B6862C]" />
    </div>
  );
}

export function CornerOrnament({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
  const rotation =
    position === 'tl'
      ? 'rotate-0 top-2 left-2'
      : position === 'tr'
      ? 'rotate-90 top-2 right-2'
      : position === 'br'
      ? 'rotate-180 bottom-2 right-2'
      : '-rotate-90 bottom-2 left-2';

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={`w-4 h-4 absolute pointer-events-none text-[#B6862C]/60 ${rotation}`}
      aria-hidden="true"
    >
      <path d="M1 23V4C1 2.34315 2.34315 1 4 1H23" stroke="currentColor" strokeWidth="1.25" />
      <path d="M5 17V6C5 5.44772 5.44772 5 6 5H17" stroke="currentColor" strokeWidth="0.85" />
      <circle cx="3.5" cy="3.5" r="1.2" fill="currentColor" />
    </svg>
  );
}

export function SacredLotusBloom({ className = 'w-96 h-96' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 320"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="lotusCoreGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#B6862C" stopOpacity="0.22" />
          <stop offset="50%" stopColor="#7A2E1D" stopOpacity="0.16" />
          <stop offset="85%" stopColor="#3B0D0A" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#260604" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="outerPetalGrad" x1="160" y1="20" x2="160" y2="160" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#D4A349" stopOpacity="0.24" />
          <stop offset="60%" stopColor="#8C3318" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#3B0D0A" stopOpacity="0.06" />
        </linearGradient>
        <linearGradient id="innerPetalGrad" x1="160" y1="55" x2="160" y2="160" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E6B655" stopOpacity="0.28" />
          <stop offset="65%" stopColor="#9A4820" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#430F0C" stopOpacity="0.08" />
        </linearGradient>
      </defs>

      {/* Dim Soft Halo */}
      <circle cx="160" cy="160" r="145" fill="url(#lotusCoreGrad)" />

      {/* Outer 16-Petal Faded Antique Gold Crown */}
      <g className="origin-center animate-lotus-ring-outer">
        {Array.from({ length: 16 }).map((_, i) => (
          <g key={`outer-${i}`} transform={`rotate(${i * 22.5} 160 160)`}>
            <path
              d="M160 18 C182 58, 186 108, 160 156 C134 108, 138 58, 160 18 Z"
              fill="url(#outerPetalGrad)"
              stroke="#E6B655"
              strokeOpacity="0.35"
              strokeWidth="0.9"
            />
          </g>
        ))}
      </g>

      {/* Middle 12-Petal Dim Saffron-Bronze Corolla */}
      <g className="origin-center animate-lotus-ring-mid">
        {Array.from({ length: 12 }).map((_, i) => (
          <g key={`mid-${i}`} transform={`rotate(${i * 30 + 15} 160 160)`}>
            <path
              d="M160 44 C178 76, 180 118, 160 156 C140 118, 142 76, 160 44 Z"
              fill="url(#innerPetalGrad)"
              stroke="#E6B655"
              strokeOpacity="0.42"
              strokeWidth="0.9"
            />
          </g>
        ))}
      </g>

      {/* Inner 8-Petal Soft Muted Gold Heart */}
      <g className="origin-center animate-lotus-ring-inner">
        {Array.from({ length: 8 }).map((_, i) => (
          <g key={`inner-${i}`} transform={`rotate(${i * 45} 160 160)`}>
            <path
              d="M160 76 C173 98, 174 128, 160 156 C146 128, 147 98, 160 76 Z"
              fill="#B6862C"
              fillOpacity="0.2"
              stroke="#E6B655"
              strokeOpacity="0.48"
              strokeWidth="1"
            />
          </g>
        ))}
      </g>

      {/* Subtle Dim Central Bindu */}
      <circle cx="160" cy="160" r="18" fill="#5B1612" fillOpacity="0.6" stroke="#E6B655" strokeOpacity="0.45" strokeWidth="1" />
      <circle cx="160" cy="160" r="5" fill="#E6B655" fillOpacity="0.55" />
    </svg>
  );
}

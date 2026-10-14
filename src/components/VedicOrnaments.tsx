import React from 'react';

export function SacredMandalaWheel({ className = 'w-64 h-64' }: { className?: string }) {
  return <SacredLandingMandala className={className} />;
}

export function SacredLandingMandala({ className = 'w-[640px] h-[640px]' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 500 500"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="mandalaCenterGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#E5C07B" stopOpacity="0.18" />
          <stop offset="45%" stopColor="#C85A17" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#430F0C" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Subtle ambient golden aura */}
      <circle cx="250" cy="250" r="238" fill="url(#mandalaCenterGlow)" />

      {/* Outermost subtle hairline border */}
      <circle cx="250" cy="250" r="242" stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.3" />
      <circle cx="250" cy="250" r="236" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.45" />

      {/* Dashed Celestial Orbit with 16 Planetary Node Dots (matching screenshot) */}
      <circle
        cx="250"
        cy="250"
        r="216"
        stroke="currentColor"
        strokeWidth="0.85"
        strokeDasharray="4 6"
        strokeOpacity="0.55"
      />
      {Array.from({ length: 16 }).map((_, i) => {
        const angle = (i * 22.5 * Math.PI) / 180;
        const x = 250 + 216 * Math.cos(angle);
        const y = 250 + 216 * Math.sin(angle);
        return (
          <circle
            key={`orbit-dot-${i}`}
            cx={x}
            cy={y}
            r="3"
            fill="currentColor"
            fillOpacity="0.75"
          />
        );
      })}

      {/* Secondary Concentric Rings */}
      <circle cx="250" cy="250" r="192" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.4" />
      <circle cx="250" cy="250" r="162" stroke="currentColor" strokeWidth="0.6" strokeDasharray="2 3" strokeOpacity="0.4" />
      <circle cx="250" cy="250" r="128" stroke="currentColor" strokeWidth="0.75" strokeOpacity="0.45" />
      <circle cx="250" cy="250" r="92" stroke="currentColor" strokeWidth="0.75" strokeOpacity="0.4" />
      <circle cx="250" cy="250" r="58" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.5" />
      <circle cx="250" cy="250" r="24" stroke="currentColor" strokeWidth="1" strokeOpacity="0.6" />
      <circle cx="250" cy="250" r="6" fill="currentColor" fillOpacity="0.8" />

      {/* 8 Full Cardinal & Diagonal Guideline Spokes extending through the yantra */}
      {Array.from({ length: 8 }).map((_, i) => (
        <g key={`axis-${i}`} transform={`rotate(${i * 45} 250 250)`}>
          <line x1="250" y1="8" x2="250" y2="242" stroke="currentColor" strokeWidth="0.55" strokeOpacity="0.35" />
          <circle cx="250" cy="192" r="2" fill="currentColor" fillOpacity="0.6" />
          <circle cx="250" cy="128" r="1.5" fill="currentColor" fillOpacity="0.5" />
        </g>
      ))}

      {/* Outer 16 Pointed Lotus / Yantra Petals (forming the primary star rosette from the screenshot) */}
      {Array.from({ length: 16 }).map((_, i) => {
        const angle = i * 22.5;
        return (
          <g key={`petal-outer-${i}`} transform={`rotate(${angle} 250 250)`}>
            {/* Outer pointed petal arc */}
            <path
              d="M250 90 C272 138, 276 195, 250 250 C224 195, 228 138, 250 90 Z"
              stroke="currentColor"
              strokeWidth="0.9"
              strokeOpacity="0.6"
            />
            {/* Fine interior contour */}
            <path
              d="M250 128 C262 165, 264 208, 250 250 C236 208, 238 165, 250 128 Z"
              stroke="currentColor"
              strokeWidth="0.55"
              strokeOpacity="0.35"
            />
            <circle cx="250" cy="90" r="2" fill="currentColor" fillOpacity="0.7" />
          </g>
        );
      })}

      {/* Secondary Intersecting 8 Diamond Petals Offset by 11.25 deg */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = i * 45 + 11.25;
        return (
          <g key={`petal-sub-${i}`} transform={`rotate(${angle} 250 250)`}>
            <path
              d="M250 145 C264 180, 266 215, 250 250 C234 215, 236 180, 250 145 Z"
              stroke="currentColor"
              strokeWidth="0.75"
              strokeOpacity="0.45"
            />
          </g>
        );
      })}

      {/* Inner 8 Core Petals */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = i * 45 + 22.5;
        return (
          <g key={`petal-inner-${i}`} transform={`rotate(${angle} 250 250)`}>
            <path
              d="M250 196 C258 214, 258 232, 250 250 C242 232, 242 214, 250 196 Z"
              stroke="currentColor"
              strokeWidth="0.8"
              strokeOpacity="0.5"
            />
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

export function SpiralLotusBloom({ className = 'w-[520px] h-[520px]' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="spiralAuraGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFF2D6" stopOpacity="0.95" />
          <stop offset="25%" stopColor="#E5B869" stopOpacity="0.75" />
          <stop offset="55%" stopColor="#C85A17" stopOpacity="0.4" />
          <stop offset="85%" stopColor="#5B1612" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#2A0806" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="spiralPetalGold" x1="200" y1="20" x2="200" y2="200" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFDF9" stopOpacity="0.95" />
          <stop offset="20%" stopColor="#F5D076" stopOpacity="0.85" />
          <stop offset="60%" stopColor="#C85A17" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#5B1612" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id="spiralPetalInner" x1="200" y1="65" x2="200" y2="200" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFE8A3" stopOpacity="0.98" />
          <stop offset="50%" stopColor="#D49B45" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#781F19" stopOpacity="0.25" />
        </linearGradient>
      </defs>

      {/* Central Radiating Golden Light Core */}
      <circle cx="200" cy="200" r="185" fill="url(#spiralAuraGlow)" />

      {/* Outer 24-Ray Golden Halo */}
      <g className="origin-center animate-spiral-halo">
        {Array.from({ length: 24 }).map((_, i) => (
          <line
            key={`halo-ray-${i}`}
            x1="200"
            y1="22"
            x2="200"
            y2="52"
            stroke="#E5B869"
            strokeWidth="1.2"
            strokeOpacity="0.6"
            transform={`rotate(${i * 15} 200 200)`}
          />
        ))}
      </g>

      {/* Layer 1: Outermost 16 Curved Spiral Lotus Petals */}
      <g className="origin-center animate-spiral-outer">
        {Array.from({ length: 16 }).map((_, i) => (
          <g key={`sp-outer-${i}`} transform={`rotate(${i * 22.5} 200 200)`}>
            <path
              d="M200 26 C232 72, 242 140, 200 200 C162 140, 168 72, 200 26 Z"
              fill="url(#spiralPetalGold)"
              stroke="#FFF2D6"
              strokeWidth="0.9"
              strokeOpacity="0.8"
            />
          </g>
        ))}
      </g>

      {/* Layer 2: Middle 12 Spiral Swirl Petals (counter-rotating for the spiral dynamic) */}
      <g className="origin-center animate-spiral-mid">
        {Array.from({ length: 12 }).map((_, i) => (
          <g key={`sp-mid-${i}`} transform={`rotate(${i * 30 + 15} 200 200)`}>
            <path
              d="M200 56 C226 100, 228 152, 200 200 C172 152, 174 100, 200 56 Z"
              fill="url(#spiralPetalInner)"
              stroke="#E5B869"
              strokeWidth="1.1"
              strokeOpacity="0.9"
            />
          </g>
        ))}
      </g>

      {/* Layer 3: Inner 8 Golden Core Petals */}
      <g className="origin-center animate-spiral-inner">
        {Array.from({ length: 8 }).map((_, i) => (
          <g key={`sp-inner-${i}`} transform={`rotate(${i * 45} 200 200)`}>
            <path
              d="M200 90 C218 122, 220 164, 200 200 C180 164, 182 122, 200 90 Z"
              fill="#E5B869"
              fillOpacity="0.5"
              stroke="#FFFDF9"
              strokeWidth="1.3"
            />
          </g>
        ))}
      </g>

      {/* Radiant Golden Spiral Bindu Core with Concentric Nodes */}
      <circle cx="200" cy="200" r="42" stroke="#FFF2D6" strokeWidth="1" strokeOpacity="0.75" strokeDasharray="3 4" />
      <circle cx="200" cy="200" r="26" fill="#5B1612" fillOpacity="0.75" stroke="#E5B869" strokeWidth="1.4" />
      <circle cx="200" cy="200" r="10" fill="#FFFDF9" />
    </svg>
  );
}

export function SimpleDarkLotus({ className = 'w-72 h-72' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 320"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="simpleLotusMaroonGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#5E1410" stopOpacity="0.35" />
          <stop offset="60%" stopColor="#3A0806" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#1C0302" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Gentle dark warm maroon aura */}
      <circle cx="160" cy="160" r="145" fill="url(#simpleLotusMaroonGlow)" />

      {/* 8 Primary Elegant Pointed Maroon Petals with Golden Border */}
      {Array.from({ length: 8 }).map((_, i) => (
        <g key={`petal-dark-1-${i}`} transform={`rotate(${i * 45} 160 160)`}>
          <path
            d="M160 38 C182 82, 186 126, 160 160 C134 126, 138 82, 160 38 Z"
            fill="#480F0B"
            fillOpacity="0.82"
            stroke="#E5B869"
            strokeWidth="1.25"
            strokeOpacity="0.95"
          />
          {/* Inner Petal Contour */}
          <path
            d="M160 64 C172 96, 172 130, 160 160 C148 130, 148 96, 160 64 Z"
            stroke="#F5D076"
            strokeWidth="0.75"
            strokeOpacity="0.7"
          />
          <circle cx="160" cy="38" r="1.6" fill="#FFF4D0" />
        </g>
      ))}

      {/* 8 Intersecting Offset Maroon Petals with Golden Border */}
      {Array.from({ length: 8 }).map((_, i) => (
        <g key={`petal-dark-2-${i}`} transform={`rotate(${i * 45 + 22.5} 160 160)`}>
          <path
            d="M160 72 C175 104, 175 136, 160 160 C145 136, 145 104, 160 72 Z"
            fill="#360806"
            fillOpacity="0.88"
            stroke="#DECBA8"
            strokeWidth="1"
            strokeOpacity="0.85"
          />
        </g>
      ))}

      {/* Central Bindu Core */}
      <circle cx="160" cy="160" r="22" fill="#240403" stroke="#E5B869" strokeWidth="1.3" strokeOpacity="0.95" />
      <circle cx="160" cy="160" r="13" stroke="#DECBA8" strokeWidth="0.8" strokeDasharray="2 3" strokeOpacity="0.8" />
      <circle cx="160" cy="160" r="4" fill="#FFF4D0" />
    </svg>
  );
}

export function RevolvingSacredFlower({ className = 'w-72 h-72' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 360 360"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        {/* Rich sacred deep maroon petal gradients (maroon body, no yellow fill) */}
        <linearGradient id="maroonPetal1" x1="180" y1="20" x2="180" y2="180" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6E1B15" />
          <stop offset="28%" stopColor="#54130F" />
          <stop offset="70%" stopColor="#380806" />
          <stop offset="100%" stopColor="#1F0302" />
        </linearGradient>

        <linearGradient id="maroonPetal2" x1="180" y1="44" x2="180" y2="180" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#5F1612" />
          <stop offset="35%" stopColor="#480E0B" />
          <stop offset="75%" stopColor="#2E0604" />
          <stop offset="100%" stopColor="#180202" />
        </linearGradient>

        {/* Gleaming luxury metallic gold border gradients */}
        <linearGradient id="goldBorder1" x1="180" y1="20" x2="180" y2="180" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFF4D0" />
          <stop offset="25%" stopColor="#F5D076" />
          <stop offset="65%" stopColor="#E5B869" />
          <stop offset="100%" stopColor="#B37D28" />
        </linearGradient>

        <linearGradient id="goldBorder2" x1="180" y1="44" x2="180" y2="180" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFEAB3" />
          <stop offset="30%" stopColor="#E5B869" />
          <stop offset="75%" stopColor="#D4A24B" />
          <stop offset="100%" stopColor="#9C6B1E" />
        </linearGradient>

        {/* Ambient Dark Maroon Glow behind Bindu */}
        <radialGradient id="maroonCenterGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#661410" stopOpacity="0.45" />
          <stop offset="50%" stopColor="#3C0806" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#1C0302" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Gentle center maroon radiance */}
      <circle cx="180" cy="180" r="140" fill="url(#maroonCenterGlow)" />

      {/* FLOWER 1: Primary Sacred Lotus (12 sculpted maroon petals with golden borders) - NO external ring */}
      <g className="origin-center">
        {Array.from({ length: 12 }).map((_, i) => (
          <g key={`flower1-petal-${i}`} transform={`rotate(${i * 30} 180 180)`}>
            {/* Rich Maroon Petal Body with Gleaming Golden Border */}
            <path
              d="M180 22 C210 68, 215 125, 180 180 C145 125, 150 68, 180 22 Z"
              fill="url(#maroonPetal1)"
              stroke="url(#goldBorder1)"
              strokeWidth="1.4"
            />
            {/* Fine interior golden vein line */}
            <path
              d="M180 50 C192 88, 194 125, 180 180 C166 125, 168 88, 180 50 Z"
              stroke="#F5D076"
              strokeWidth="0.85"
              strokeOpacity="0.8"
            />
            {/* Golden tip bindu jewel */}
            <circle cx="180" cy="23" r="2.2" fill="#FFF4D0" stroke="#E5B869" strokeWidth="0.5" />
          </g>
        ))}
      </g>

      {/* FLOWER 2: Overlapping Sacred Lotus (12 sculpted maroon petals offset by 15 deg with golden borders) */}
      <g className="origin-center">
        {Array.from({ length: 12 }).map((_, i) => (
          <g key={`flower2-petal-${i}`} transform={`rotate(${i * 30 + 15} 180 180)`}>
            {/* Rich Maroon Petal Body with Gleaming Golden Border */}
            <path
              d="M180 44 C205 85, 206 135, 180 180 C154 135, 155 85, 180 44 Z"
              fill="url(#maroonPetal2)"
              stroke="url(#goldBorder2)"
              strokeWidth="1.3"
            />
            {/* Fine interior golden vein line */}
            <path
              d="M180 72 C192 104, 192 138, 180 180 C168 138, 168 104, 180 72 Z"
              stroke="#DECBA8"
              strokeWidth="0.75"
              strokeOpacity="0.7"
            />
            {/* Golden tip bindu jewel */}
            <circle cx="180" cy="45" r="1.8" fill="#FFEAB3" stroke="#D4A24B" strokeWidth="0.5" />
          </g>
        ))}
      </g>

      {/* Central Bindu Hub where the two flowers meet - NO external ring */}
      <circle cx="180" cy="180" r="23" fill="#280504" stroke="#E5B869" strokeWidth="1.5" />
      <circle cx="180" cy="180" r="14" fill="#4A0F0C" stroke="#F5D076" strokeWidth="1" strokeDasharray="2.5 2.5" />
      <circle cx="180" cy="180" r="7" fill="#6A1610" stroke="#FFF4D0" strokeWidth="0.9" />
      <circle cx="180" cy="180" r="3.2" fill="#FFFDF9" />
    </svg>
  );
}

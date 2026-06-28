import React from 'react';
import logo from '../assets/bsmart_logo.png';

const SplashLoader = ({ fading }) => {
  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white"
      style={{
        opacity: fading ? 0 : 1,
        transition: 'opacity 400ms ease',
        pointerEvents: fading ? 'none' : 'auto',
      }}
    >
      {/* Spinner + logo pill */}
      <div className="relative w-24 h-24">
        <svg
          className="w-24 h-24"
          viewBox="0 0 96 96"
          style={{ animation: 'splash-spin 1.4s linear infinite' }}
        >
          {/* Track ring */}
          <circle cx="48" cy="48" r="42" fill="none" stroke="#F3F4F6" strokeWidth="4" />
          {/* Gradient arc */}
          <circle
            cx="48" cy="48" r="42"
            fill="none"
            stroke="url(#splashGrad)"
            strokeWidth="4"
            strokeDasharray="72 192"
            strokeLinecap="round"
            transform="rotate(-90 48 48)"
          />
          <defs>
            <linearGradient id="splashGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#E8194E" />
              <stop offset="100%" stopColor="#833AB4" />
            </linearGradient>
          </defs>
        </svg>

        {/* Logo pill — centered inside spinner */}
        <div
          className="absolute inset-[13px] rounded-full flex items-center justify-center bg-white overflow-hidden"
          style={{
            animation: 'splash-pill-pulse 2.5s ease-in-out infinite',
          }}
        >
          <img src={logo} alt="B-smart" className="w-[36px] h-[36px] object-cover" />
        </div>
      </div>

      {/* Brand text */}
      <p className="mt-5 text-[18px] font-bold text-neutral-800 tracking-tight">
        B-smart
      </p>
      <p className="mt-0.5 text-[11px] font-medium tracking-[0.18em] uppercase text-neutral-400">
        Admin Dashboard
      </p>

      {/* Bouncing dots */}
      <div className="flex gap-[7px] mt-[22px]">
        {[0, 0.15, 0.3].map((delay, i) => (
          <span
            key={i}
            className="block w-1.5 h-1.5 rounded-full"
            style={{
              background: 'linear-gradient(135deg, #E8194E, #833AB4)',
              animation: `splash-bounce 1.2s ease-in-out ${delay}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default SplashLoader;
